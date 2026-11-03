import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
import { enqueueSms } from "./queues/index.js";
import { normalizeTwilioStatus, renderSmsTemplate, verifyTwilioSignature } from "./smsCompliance.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { tenantGuard } from "./middleware/tenantGuard.js";
import { User, Client, Customer, Review, Campaign, SmsActivity, Onboarding, IntegrationConnection, StripeWebhookEvent } from "./models.js";
import { getStripe, getPlanCatalog, getPlanPrice, getPlanLimits, findConfiguredPrice, createCheckoutSession, createPortalSession, verifyStripeWebhook } from "./stripeBilling.js";
import { googleAuthorizationUrl, exchangeGoogleCode, encryptToken, decryptToken, googleUserInfo, googleAccessToken, listGoogleAccounts, listGoogleLocations, listGoogleReviews, publishGoogleReviewReply } from "./googleBusinessProfile.js";
import { getYelpBusiness } from "./yelpFusion.js";
import { metaAuthorizationUrl, exchangeMetaCode, listManagedFacebookPages, getFacebookPage } from "./metaGraph.js";
import { syncYelpReviewsForTenant } from "./workers/reviewSyncWorker.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);
const DEMO_MODE = process.env.DEMO_MODE !== "false";
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000").split(",").map(v => v.trim());

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); callback(new Error("Origin not allowed")); }, credentials: true }));
app.post("/api/webhooks/stripe", express.raw({ type: "application/json", limit: "1mb" }), asyncHandler(async (req, res) => {
  let event;
  try { event = verifyStripeWebhook(req.body, req.get("stripe-signature")); }
  catch (error) { return res.status(400).json({ success: false, error: "Invalid Stripe webhook signature" }); }
  if (await StripeWebhookEvent.exists({ eventId: event.id })) return res.json({ received: true, duplicate: true });
  const syncSubscription = async subscription => {
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
    const clientId = subscription.metadata?.clientId;
    const tenantLookup = [];
    if (customerId) tenantLookup.push({ stripeCustomerId: customerId });
    if (clientId && mongoose.isValidObjectId(clientId)) tenantLookup.push({ _id: clientId });
    if (!tenantLookup.length) return;
    const client = await Client.findOne({ $or: tenantLookup });
    if (!client) return;
    const priceId = subscription.items?.data?.[0]?.price?.id || "";
    const configured = findConfiguredPrice(priceId);
    client.stripeCustomerId = customerId || client.stripeCustomerId;
    client.stripeSubscriptionId = subscription.id;
    client.billingPlan = configured?.key || client.billingPlan || "free";
    client.billingInterval = configured?.interval || client.billingInterval;
    client.billingPriceId = priceId;
    client.billingStatus = subscription.status || "inactive";
    client.billingCurrentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
    client.billingCancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
    await client.save();
  };
  if (event.type.startsWith("customer.subscription.")) {
    await syncSubscription(event.data.object);
  } else if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (subscriptionId) await syncSubscription(await getStripe().subscriptions.retrieve(subscriptionId));
  } else if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription;
    if (subscriptionId) await syncSubscription(await getStripe().subscriptions.retrieve(typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id));
  }
  await StripeWebhookEvent.create({ eventId: event.id, type: event.type, processedAt: new Date() });
  return res.json({ received: true });
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many sign-in attempts. Please try again in 15 minutes." } });
const onboardingRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many onboarding submissions. Please try again later." } });

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tokenFor = user => jwt.sign({ sub: user._id.toString(), role: user.role, clientId: user.clientId?.toString() || null }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
const auth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.ricoiz_session || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("name email role clientId isActive");
    if (!user?.isActive) return res.status(401).json({ error: "Invalid session" });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: "Invalid or expired session" }); }
});
const clientScope = req => req.tenantId || req.user?.clientId;
const requireClient = (req, res) => {
  const id = String(clientScope(req) || "");
  if (!id || !mongoose.isValidObjectId(id)) { res.status(400).json({ error: "A valid workspace is required" }); return null; }
  if (req.user.clientId?.toString() !== id) { res.status(403).json({ error: "Workspace access denied" }); return null; }
  return id;
};

app.get("/health", (_req, res) => res.json({ ok: true, service: "ricoiz-api", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", demoMode: DEMO_MODE }));

const effectivePlanFor = client => ["active", "trialing"].includes(client.billingStatus) ? (client.billingPlan || "free") : "free";
app.get("/api/billing/plans", auth, tenantGuard, (_req, res) => {
  res.json({ success: true, data: getPlanCatalog() });
});
app.post("/api/billing/checkout", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ plan: z.enum(["starter", "growth", "scale"]), interval: z.enum(["month", "year"]) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Choose a valid plan and billing interval" });
  const selected = getPlanPrice(parsed.data.plan, parsed.data.interval);
  if (!selected) return res.status(409).json({ success: false, error: "This plan price is not configured in Stripe yet" });
  const client = await Client.findById(clientId);
  if (!client) return res.status(404).json({ success: false, error: "Workspace not found" });
  const frontend = String(process.env.FRONTEND_URL || allowedOrigins[0] || "http://localhost:3000").replace(/\/$/, "");
  const session = await createCheckoutSession({
    client,
    priceId: selected.priceId,
    successUrl: `${frontend}/dashboard/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${frontend}/dashboard/settings?billing=cancelled`
  });
  res.status(201).json({ success: true, data: { checkoutUrl: session.url, sessionId: session.id } });
}));
app.post("/api/billing/portal", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const client = await Client.findById(clientId).select("stripeCustomerId").lean();
  if (!client) return res.status(404).json({ success: false, error: "Workspace not found" });
  const frontend = String(process.env.FRONTEND_URL || allowedOrigins[0] || "http://localhost:3000").replace(/\/$/, "");
  const session = await createPortalSession(client.stripeCustomerId, `${frontend}/dashboard/settings`);
  res.json({ success: true, data: { portalUrl: session.url } });
}));
app.get("/api/billing/status", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const client = await Client.findById(clientId).select("billingPlan billingInterval billingStatus billingPriceId billingCurrentPeriodEnd billingCancelAtPeriodEnd").lean();
  if (!client) return res.status(404).json({ success: false, error: "Workspace not found" });
  const plan = effectivePlanFor(client);
  const limits = getPlanLimits(plan);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [customers, sms] = await Promise.all([
    Customer.countDocuments({ clientId }),
    SmsActivity.countDocuments({ clientId, direction: "outbound", createdAt: { $gte: monthStart }, status: { $in: ["queued", "sent", "delivered"] } })
  ]);
  res.json({ success: true, data: {
    plan, status: client.billingStatus || "inactive", interval: client.billingInterval || null,
    currentPeriodEnd: client.billingCurrentPeriodEnd || null, cancelAtPeriodEnd: Boolean(client.billingCancelAtPeriodEnd),
    usage: { customers, monthlySms: sms }, limits
  } });
}));


app.post("/api/auth/login", authRateLimit, asyncHandler(async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid email and password are required" });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: "Email or password is incorrect" });
  res.cookie("ricoiz_session", tokenFor(user), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
  return res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}));
app.post("/api/auth/register", authRateLimit, asyncHandler(async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128),
    businessName: z.string().trim().min(2).max(120),
    city: z.string().trim().max(100).optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid name, email, business name, and password (at least 12 characters)." });
  const email = parsed.data.email.toLowerCase();
  if (await User.exists({ email })) return res.status(409).json({ error: "An account with this email already exists. Please sign in." });
  const client = await Client.create({
    businessName: parsed.data.businessName,
    slug: `${parsed.data.businessName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "business"}-${new mongoose.Types.ObjectId().toString().slice(-6)}`,
    ownerName: parsed.data.name,
    ownerEmail: email,
    city: parsed.data.city || "",
    status: "pending",
    demo: false
  });
  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({ name: parsed.data.name, email, passwordHash, role: "owner", clientId: client._id });
    res.cookie("ricoiz_session", tokenFor(user), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.status(201).json({ ok: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    await Client.deleteOne({ _id: client._id });
    throw error;
  }
}));
app.get("/api/auth/me", auth, (req, res) => res.json({ user: req.user }));

app.get("/api/business/me", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const business = await Client.findById(clientId).select("businessName ownerName ownerEmail ownerPhone industry address city timezone googleReviewUrl publicReviewLinks slug status").lean();
  if (!business) return res.status(404).json({ error: "Business profile not found" });
  res.json({ success: true, data: business });
}));

app.put("/api/business/settings", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const optionalUrl = z.string().trim().url().max(2048).or(z.literal("")).optional();
  const parsed = z.object({
    businessName: z.string().trim().min(2).max(120).optional(),
    ownerPhone: z.string().trim().min(7).max(25).optional(),
    industry: z.string().trim().max(100).optional(),
    address: z.object({
      line1: z.string().trim().max(160).optional(),
      line2: z.string().trim().max(160).optional(),
      city: z.string().trim().max(100).optional(),
      region: z.string().trim().max(100).optional(),
      postalCode: z.string().trim().max(20).optional(),
      country: z.string().trim().max(2).optional()
    }).partial().optional(),
    publicReviewLinks: z.object({
      google: optionalUrl,
      yelp: optionalUrl,
      facebook: optionalUrl
    }).partial().optional()
  }).strict().refine(value => Object.keys(value).length > 0).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Invalid business settings", details: parsed.error.flatten() });
  const update = { ...parsed.data };
  if (update.businessName) {
    const suffix = String(clientId).slice(-6);
    update.slug = `${update.businessName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "business"}-${suffix}`;
  }
  const business = await Client.findOneAndUpdate({ _id: clientId }, { $set: update }, { new: true, runValidators: true })
    .select("businessName ownerName ownerEmail ownerPhone industry address city timezone googleReviewUrl publicReviewLinks slug status").lean();
  res.json({ success: true, data: business });
}));

app.get("/api/public/business/:slug", asyncHandler(async (req, res) => {
  const business = await Client.findOne({ slug: String(req.params.slug).toLowerCase(), status: { $in: ["active", "pending"] } })
    .select("businessName industry address city publicReviewLinks googleReviewUrl slug").lean();
  if (!business) return res.status(404).json({ success: false, error: "Business review page not found" });
  const links = { ...(business.publicReviewLinks || {}) };
  if (!links.google && business.googleReviewUrl) links.google = business.googleReviewUrl;
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({ success: true, data: { name: business.businessName, industry: business.industry || "", address: business.address || { city: business.city || "" }, reviewLinks: links } });
}));
app.post("/api/auth/logout", auth, tenantGuard, (_req, res) => { res.clearCookie("ricoiz_session", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" }); res.json({ ok: true }); });

app.post("/api/onboarding", onboardingRateLimit, asyncHandler(async (req, res) => {
  const schema = z.object({
    businessName: z.string().trim().min(2).max(120),
    ownerFirstName: z.string().trim().min(1).max(80),
    ownerLastName: z.string().trim().min(1).max(80),
    ownerEmail: z.string().email(),
    ownerPhone: z.string().trim().min(7).max(25),
    timezone: z.string().optional(),
    city: z.string().max(100).optional(),
    googleReviewUrl: z.string().url().optional().or(z.literal("")),
    consentMethod: z.string().optional(),
    consentDateFrom: z.string().optional(),
    consentDateTo: z.string().optional(),
    consents: z.record(z.boolean()).optional(),
    signature: z.string().max(160).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check the required onboarding fields", details: parsed.error.flatten() });
  const onboarding = await Onboarding.create({ ...parsed.data, demo: DEMO_MODE });
  res.status(201).json({ ok: true, onboardingId: onboarding._id, status: onboarding.status, demo: onboarding.demo });
}));

app.get("/api/dashboard/overview", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const [reviews, customers, campaigns, sms] = await Promise.all([
    Review.find({ clientId }).lean(), Customer.countDocuments({ clientId }),
    Campaign.countDocuments({ clientId }), SmsActivity.countDocuments({ clientId, direction: "outbound" })
  ]);
  const averageRating = reviews.length ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)) : 0;
  res.json({ metrics: { newReviews: reviews.length, averageRating, customers, campaigns, smsRequests: sms, repliesToReview: reviews.filter(r => r.responseStatus === "published").length }, demo: DEMO_MODE });
}));

app.get("/api/customers", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const page = Math.max(1, Number(req.query.page || 1)); const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = { clientId }; if (req.query.search) filter.$or = [{ firstName: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }, { phone: new RegExp(String(req.query.search), "i") }];
  const [items, total] = await Promise.all([Customer.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Customer.countDocuments(filter)]);
  res.json({ items, page, limit, total });
}));
app.post("/api/customers", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().max(80).optional(), phone: z.string().trim().min(7).max(25), email: z.string().email().optional(), consentStatus: z.enum(["unknown", "granted", "revoked"]).default("unknown") }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid customer details", details: parsed.error.flatten() });
  const workspace = await Client.findById(clientId).select("billingPlan billingStatus").lean();
  const plan = effectivePlanFor(workspace || {});
  const customerLimit = getPlanLimits(plan).customers;
  const existingCustomers = await Customer.countDocuments({ clientId });
  if (existingCustomers >= customerLimit) return res.status(409).json({ success: false, code: "CUSTOMER_LIMIT_REACHED", error: `Your ${plan} plan allows ${customerLimit} customers. Upgrade your plan to add more.` });
  const item = await Customer.create({ ...parsed.data, clientId });
  res.status(201).json({ item });
}));
app.patch("/api/customers/:id", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const item = await Customer.findOneAndUpdate({ _id: req.params.id, clientId }, { $set: req.body }, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Customer not found" }); res.json({ item });
}));

app.patch("/api/customers/:id/consent", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({
    consentStatus: z.enum(["granted", "revoked"]),
    consentSource: z.string().trim().min(3).max(200)
  }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Consent status and documented consent source are required" });
  const update = parsed.data.consentStatus === "granted"
    ? { consentStatus: "granted", consentSource: parsed.data.consentSource, consentAt: new Date(), optedOutAt: null }
    : { consentStatus: "revoked", consentSource: parsed.data.consentSource, optedOutAt: new Date() };
  const customer = await Customer.findOneAndUpdate({ _id: req.params.id, clientId }, { $set: update }, { new: true }).select("-__v");
  if (!customer) return res.status(404).json({ success: false, error: "Customer not found" });
  res.json({ success: true, data: { id: customer._id, consentStatus: customer.consentStatus, consentAt: customer.consentAt, optedOutAt: customer.optedOutAt } });
}));

app.delete("/api/customers/:id", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const item = await Customer.findOneAndDelete({ _id: req.params.id, clientId });
  if (!item) return res.status(404).json({ error: "Customer not found" }); res.json({ ok: true });
}));

app.get("/api/reviews", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const filter = { clientId };
  const platform = String(req.query.platform || "all").toLowerCase();
  if (["google", "yelp", "facebook"].includes(platform)) filter.platform = platform;
  const rating = Number(req.query.rating || 0);
  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) filter.rating = rating;
  const responseStatus = String(req.query.responseStatus || "all").toLowerCase();
  if (responseStatus === "answered") filter.responseStatus = "published";
  else if (responseStatus === "unanswered") filter.responseStatus = { $ne: "published" };
  const search = String(req.query.search || "").trim().slice(0, 100);
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ author: new RegExp(escaped, "i") }, { text: new RegExp(escaped, "i") }];
  }
  const [items, total, platformCounts] = await Promise.all([
    Review.find(filter).sort({ reviewedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: { clientId } }, { $group: { _id: "$platform", count: { $sum: 1 } } }])
  ]);
  res.json({ items, page, limit, total, hasMore: page * limit < total, platformCounts: Object.fromEntries(platformCounts.map(item => [item._id, item.count])) });
}));
 
app.patch("/api/reviews/:id/response", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ response: z.string().trim().min(1).max(5000), responseStatus: z.enum(["draft", "approved"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid response" });
  const item = await Review.findOneAndUpdate({ _id: req.params.id, clientId }, { $set: parsed.data }, { new: true });
  if (!item) return res.status(404).json({ error: "Review not found" }); res.json({ item, demo: DEMO_MODE });
}));

app.get("/api/campaigns", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  res.json({ items: await Campaign.find({ clientId }).sort({ createdAt: -1 }).lean() });
}));
app.post("/api/campaigns", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ name: z.string().trim().min(2).max(100), channel: z.enum(["sms", "email"]).default("sms"), messageTemplate: z.string().max(2000).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid campaign details" });
  const item = await Campaign.create({ ...parsed.data, clientId, status: "draft", demo: DEMO_MODE });
  res.status(201).json({ item });
}));

app.post("/api/campaigns/:id/dispatch", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  if (process.env.SMS_DELIVERY_ENABLED !== "true") {
    return res.status(409).json({ success: false, error: "SMS dispatch is disabled. Configure Twilio and explicitly enable SMS_DELIVERY_ENABLED." });
  }
  if (!process.env.TWILIO_WEBHOOK_BASE_URL || !process.env.TWILIO_STATUS_CALLBACK_URL) {
    return res.status(503).json({ success: false, error: "Signed Twilio inbound and status callback URLs must be configured before dispatch." });
  }
  const [campaign, client] = await Promise.all([
    Campaign.findOne({ _id: req.params.id, clientId }),
    Client.findOne({ _id: clientId, status: "active" }).select("businessName status smsFromNumber").lean()
  ]);
  if (!campaign) return res.status(404).json({ success: false, error: "Campaign not found" });
  if (!client) return res.status(409).json({ success: false, error: "Only active workspaces can dispatch SMS campaigns" });
  if (!/^\+[1-9]\d{7,14}$/.test(String(client.smsFromNumber || ""))) {
    return res.status(409).json({ success: false, error: "Configure a valid tenant-specific Twilio sender number before dispatch." });
  }
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return res.status(503).json({ success: false, error: "Twilio credentials are not configured on the API service." });
  }
  if (campaign.channel !== "sms") return res.status(400).json({ success: false, error: "Only SMS campaigns can be dispatched" });
  if (campaign.status === "active" || campaign.status === "completed") return res.status(409).json({ success: false, error: "This campaign has already been dispatched" });
  const template = String(campaign.messageTemplate || "").trim();
  if (!template) return res.status(400).json({ success: false, error: "Add an SMS message template before dispatching" });
  const workspaceForQuota = await Client.findById(clientId).select("billingPlan billingStatus").lean();
  const effectivePlan = effectivePlanFor(workspaceForQuota || {});
  const smsLimit = getPlanLimits(effectivePlan).monthlySms;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const smsUsed = await SmsActivity.countDocuments({ clientId, direction: "outbound", createdAt: { $gte: monthStart }, status: { $in: ["queued", "sent", "delivered"] } });
  const eligibleRecipients = await Customer.countDocuments({ clientId, consentStatus: "granted", consentAt: { $ne: null }, optedOutAt: null });
  if (smsLimit <= smsUsed || smsUsed + eligibleRecipients > smsLimit) return res.status(409).json({ success: false, code: "SMS_QUOTA_REACHED", error: "Your plan does not have enough remaining SMS quota for this campaign. Upgrade to continue sending." });
  let queued = 0;
  const cursor = Customer.find({ clientId, consentStatus: "granted", consentAt: { $ne: null }, optedOutAt: null }).cursor();
  for await (const customer of cursor) {
    let body;
    try { body = renderSmsTemplate(template, customer, client); }
    catch (error) { return res.status(400).json({ success: false, error: error.message }); }
    if (!body || body.length > 1600) return res.status(400).json({ success: false, error: "Rendered SMS messages must contain 1–1600 characters" });
    await enqueueSms({
      clientId,
      customerId: customer._id,
      body,
      campaignId: campaign._id,
      jobId: "campaign-" + String(campaign._id) + "-" + String(customer._id)
    });
    queued++;
  }
  campaign.status = "active";
  campaign.queuedCount = queued;
  campaign.audienceCount = queued;
  campaign.dispatchedAt = new Date();
  await campaign.save();
  res.status(202).json({ success: true, data: { campaignId: campaign._id, queued, status: campaign.status }, message: "Eligible, consented recipients were queued. Final delivery status arrives from Twilio callbacks." });
}));

app.patch("/api/campaigns/:id/status", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ status: z.enum(["draft", "scheduled", "active", "paused", "completed"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid campaign status" });
  const item = await Campaign.findOneAndUpdate({ _id: req.params.id, clientId }, { status: parsed.data.status }, { new: true });
  if (!item) return res.status(404).json({ error: "Campaign not found" });
  res.json({ item, message: "Campaign status saved." });
}));



app.get("/api/settings/intake-phone", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const client = await Client.findById(clientId).select("intakePhone").lean();
  res.json({ intakePhone: client?.intakePhone || null });
}));

app.patch("/api/settings/intake-phone", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ intakePhone: z.string().trim().min(7).max(25) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A valid Close inbound phone number is required" });
  const intakePhone = normalizePhone(parsed.data.intakePhone);
  if (!intakePhone) return res.status(400).json({ error: "Use an E.164 phone number, for example +14155550123" });
  const assigned = await Client.findOne({ intakePhone, _id: { $ne: clientId } }).select("_id").lean();
  if (assigned) return res.status(409).json({ error: "This intake phone number is already assigned to another workspace" });
  await Client.updateOne({ _id: clientId }, { $set: { intakePhone } });
  res.json({ ok: true, intakePhone });
}));


const twilioWebhookAuth = (req, res, next) => {
  if (process.env.NODE_ENV !== "production" && process.env.TWILIO_WEBHOOK_VALIDATION_DISABLED === "true") return next();
  const baseUrl = String(process.env.TWILIO_WEBHOOK_BASE_URL || "").replace(/\/$/, "");
  if (!baseUrl || !process.env.TWILIO_AUTH_TOKEN) return res.status(503).send("Twilio webhook validation is not configured");
  const valid = verifyTwilioSignature({
    authToken: process.env.TWILIO_AUTH_TOKEN,
    signature: req.get("x-twilio-signature"),
    url: baseUrl + req.originalUrl,
    params: req.body || {}
  });
  if (!valid) return res.status(403).send("Invalid Twilio signature");
  next();
};
const twiml = message => {
  const escaped = String(message || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${escaped ? `<Message>${escaped}</Message>` : ""}</Response>`;
};

app.post("/api/webhooks/twilio/inbound", twilioWebhookAuth, asyncHandler(async (req, res) => {
  const from = normalizePhone(req.body.From);
  const to = normalizePhone(req.body.To);
  const body = String(req.body.Body || "").trim().slice(0, 1600);
  if (!from || !to) return res.status(400).send("Invalid phone number");
  const client = await Client.findOne({ smsFromNumber: to }).select("_id businessName").lean();
  if (!client) return res.status(404).send("Unknown SMS destination");
  const customer = await Customer.findOne({ clientId: client._id, phone: from });
  const keyword = body.toUpperCase().replace(/[^A-Z]/g, "");
  if (customer && ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(keyword)) {
    customer.consentStatus = "revoked";
    customer.optedOutAt = new Date();
    customer.consentSource = "Twilio inbound " + keyword;
    await customer.save();
  }
  await SmsActivity.create({
    clientId: client._id,
    customerId: customer?._id,
    direction: "inbound",
    body,
    status: "delivered",
    providerId: req.body.MessageSid || undefined,
    demo: false
  });
  let reply = "";
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(keyword)) {
    reply = "You are opted out and will receive no further messages from this business.";
  } else if (["HELP", "INFO"].includes(keyword)) {
    reply = "For help, contact the business directly. Reply STOP to opt out.";
  } else if (["START", "UNSTOP"].includes(keyword)) {
    reply = "To resume messages, please provide consent directly to the business. Your previous opt-out remains in effect until consent is documented.";
  }
  res.type("text/xml").send(twiml(reply));
}));

app.post("/api/webhooks/twilio/status", twilioWebhookAuth, asyncHandler(async (req, res) => {
  const messageSid = String(req.body.MessageSid || "");
  const status = normalizeTwilioStatus(req.body.MessageStatus);
  if (!messageSid || !status) return res.status(400).json({ success: false, error: "A valid Twilio MessageSid and status are required" });
  const activity = await SmsActivity.findOne({ providerId: messageSid, direction: "outbound" });
  if (!activity) return res.status(404).json({ success: false, error: "SMS activity not found" });
  const wasFailed = activity.status === "failed";
  const terminal = ["delivered", "failed"].includes(activity.status);
  if (!terminal) {
    activity.status = status;
    activity.providerStatus = String(req.body.MessageStatus);
    activity.providerErrorCode = req.body.ErrorCode ? String(req.body.ErrorCode) : undefined;
    await activity.save();
  }
  if (status === "failed" && !wasFailed && activity.campaignId) {
    await Campaign.updateOne({ _id: activity.campaignId, clientId: activity.clientId }, { $inc: { failedCount: 1 } });
  }
  res.json({ success: true });
}));

const n8nAutomationAuth = (req, res, next) => {
  const expected = process.env.RICOIZ_N8N_API_KEY || "";
  const supplied = String(req.get("x-ricoiz-automation-key") || "");
  if (expected.length < 32) return res.status(503).json({ error: "Automation API is not configured" });
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    return res.status(401).json({ error: "Invalid automation credentials" });
  }
  next();
};
const normalizePhone = value => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
};

// n8n intake integration. These endpoints use a dedicated API key and never expose
// customer records to an unauthenticated webhook caller.
app.get("/api/automation/reviews/client-by-intake-phone", n8nAutomationAuth, asyncHandler(async (req, res) => {
  const intakePhone = normalizePhone(req.query.intakePhone);
  if (!intakePhone) return res.status(400).json({ error: "A valid intake phone number is required" });
  const client = await Client.findOne({ intakePhone, status: { $ne: "paused" } }).select("_id businessName status").lean();
  if (!client) return res.status(404).json({ clientId: null, error: "No active Ricoiz workspace is assigned to this intake number" });
  res.json({ clientId: String(client._id), businessName: client.businessName, status: client.status });
}));

app.get("/api/automation/reviews/opt-out-check", n8nAutomationAuth, asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.query.phone);
  if (!phone) return res.status(400).json({ error: "A valid phone number is required" });
  const optedOut = Boolean(await Customer.exists({ phone, $or: [{ consentStatus: "revoked" }, { optedOutAt: { $ne: null } }] }));
  res.json({ phone, optedOut });
}));

app.post("/api/automation/reviews/customer-add-via-text", n8nAutomationAuth, asyncHandler(async (req, res) => {
  const parsed = z.object({
    clientId: z.string().refine(value => mongoose.isValidObjectId(value)),
    firstName: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(7).max(25),
    intakedFromOwnerPhone: z.string().trim().max(25).optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid customer intake payload" });
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return res.status(400).json({ ok: false, error: "Customer phone number is invalid" });
  const client = await Client.findOne({ _id: parsed.data.clientId, status: { $ne: "paused" } }).select("_id").lean();
  if (!client) return res.status(404).json({ ok: false, error: "Ricoiz workspace not found or paused" });
  const optedOut = await Customer.exists({ phone, $or: [{ consentStatus: "revoked" }, { optedOutAt: { $ne: null } }] });
  if (optedOut) return res.json({ ok: false, reason: "opted_out" });
  const existing = await Customer.findOne({ clientId: client._id, phone }).select("_id").lean();
  if (existing) return res.json({ ok: false, reason: "duplicate", customerId: String(existing._id) });
  const customer = await Customer.create({
    clientId: client._id,
    firstName: parsed.data.firstName,
    phone,
    consentStatus: "unknown",
    tags: ["owner-intake", "consent-pending"]
  });
  res.status(201).json({ ok: true, customerId: String(customer._id), consentStatus: customer.consentStatus, dripEligible: false, message: "Customer saved. SMS remains blocked until documented consent is recorded." });
}));

app.get("/api/integrations/google-business-profile/connect", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const state = jwt.sign({ sub: req.user._id.toString(), clientId }, process.env.JWT_SECRET, { expiresIn: "10m", audience: "google-business-profile-oauth" });
  res.json({ authorizationUrl: googleAuthorizationUrl(state) });
}));
app.get("/api/integrations/google-business-profile/callback", asyncHandler(async (req, res) => {
  const frontend = allowedOrigins[0] || "http://localhost:3000";
  if (req.query.error) return res.redirect(`${frontend}/dashboard/settings?google=denied`);
  const parsed = z.object({ code: z.string().min(1), state: z.string().min(1) }).safeParse(req.query);
  if (!parsed.success) return res.status(400).send("Invalid Google OAuth callback");
  let state;
  try { state = jwt.verify(parsed.data.state, process.env.JWT_SECRET, { audience: "google-business-profile-oauth" }); }
  catch { return res.status(400).send("Google OAuth state is invalid or expired"); }
  const token = await exchangeGoogleCode(parsed.data.code);
  const googleUser = await googleUserInfo(token.access_token);
  const connection = await IntegrationConnection.findOneAndUpdate(
    { clientId: state.clientId, provider: "google-business-profile" },
    { $set: {
      status: "connected",
      accessTokenEncrypted: encryptToken(token.access_token),
      ...(token.refresh_token ? { refreshTokenEncrypted: encryptToken(token.refresh_token) } : {}),
      tokenExpiresAt: new Date(Date.now() + (token.expires_in || 3600) * 1000),
      scopes: String(token.scope || "").split(" "),
      externalAccountEmail: googleUser.email || "",
      connectedAt: new Date()
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.redirect(`${frontend}/dashboard/settings?google=connected`);
}));
app.get("/api/integrations/google-business-profile/accounts", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const connection = await IntegrationConnection.findOne({ clientId, provider: "google-business-profile", status: "connected" });
  if (!connection) return res.status(404).json({ error: "Google Business Profile is not connected" });
  const accessToken = await googleAccessToken(connection, doc => doc.save());
  res.json(await listGoogleAccounts(accessToken));
}));
app.get("/api/integrations/google-business-profile/locations", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const account = String(req.query.account || "");
  if (!/^accounts\/[A-Za-z0-9_-]+$/.test(account)) return res.status(400).json({ error: "A valid Google account resource name is required" });
  const connection = await IntegrationConnection.findOne({ clientId, provider: "google-business-profile", status: "connected" });
  if (!connection) return res.status(404).json({ error: "Google Business Profile is not connected" });
  const accessToken = await googleAccessToken(connection, doc => doc.save());
  res.json(await listGoogleLocations(accessToken, account));
}));
app.post("/api/integrations/google-business-profile/location", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ accountName: z.string().regex(/^accounts\/[A-Za-z0-9_-]+$/), locationName: z.string().regex(/^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+$/), locationTitle: z.string().trim().min(1).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid Google account and location are required" });
  const connection = await IntegrationConnection.findOneAndUpdate({ clientId, provider: "google-business-profile" }, { $set: { externalAccountName: parsed.data.accountName, locationName: parsed.data.locationName, locationTitle: parsed.data.locationTitle } }, { new: true });
  if (!connection) return res.status(404).json({ error: "Google Business Profile is not connected" });
  res.json({ ok: true, locationName: connection.locationName, locationTitle: connection.locationTitle });
}));
app.post("/api/integrations/google-business-profile/sync-reviews", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const connection = await IntegrationConnection.findOne({ clientId, provider: "google-business-profile", status: "connected" });
  if (!connection?.locationName) return res.status(409).json({ error: "Connect Google and select a verified business location first" });
  const accessToken = await googleAccessToken(connection, doc => doc.save());
  let pageToken; let synced = 0; let pages = 0;
  do {
    const data = await listGoogleReviews(accessToken, connection.locationName, pageToken);
    for (const review of data.reviews || []) {
      const ratingMap = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
      const rating = ratingMap[review.starRating] || Number(review.starRating) || 0;
      if (!rating) continue;
      await Review.findOneAndUpdate(
        { clientId, externalId: review.reviewId, platform: "google" },
        { $set: { externalId: review.reviewId, platform: "google", rating, author: review.reviewer?.displayName || "Google user", text: review.comment || "", response: review.reviewReply?.comment || "", responseStatus: review.reviewReply?.comment ? "published" : "not_started", reviewedAt: review.createTime ? new Date(review.createTime) : new Date(), demo: false } },
        { upsert: true, new: true }
      );
      synced++;
    }
    pageToken = data.nextPageToken; pages++;
  } while (pageToken && pages < 10);
  res.json({ ok: true, synced, pages, hasMore: Boolean(pageToken) });
}));
app.put("/api/integrations/google-business-profile/reviews/:reviewId/reply", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ response: z.string().trim().min(1).max(4096) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A review response is required" });
  const connection = await IntegrationConnection.findOne({ clientId, provider: "google-business-profile", status: "connected" });
  if (!connection?.locationName) return res.status(409).json({ error: "Google business location is not selected" });
  const review = await Review.findOne({ _id: req.params.reviewId, clientId, platform: "google" });
  if (!review?.externalId) return res.status(404).json({ error: "Google review not found" });
  const accessToken = await googleAccessToken(connection, doc => doc.save());
  const resourceName = `${connection.locationName}/reviews/${review.externalId}`;
  const result = await publishGoogleReviewReply(accessToken, resourceName, parsed.data.response);
  review.response = parsed.data.response; review.responseStatus = "published"; await review.save();
  res.json({ ok: true, review, google: result });
}));


app.post("/api/integrations/yelp/connect", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ businessId: z.string().trim().min(3).max(200).regex(/^[A-Za-z0-9_-]+$/) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "A valid Yelp business ID is required" });
  const business = await getYelpBusiness(parsed.data.businessId);
  const connection = await IntegrationConnection.findOneAndUpdate(
    { clientId, provider: "yelp" },
    { $set: {
      status: "connected",
      externalAccountName: business.name || parsed.data.businessId,
      metadata: { yelpBusinessId: parsed.data.businessId, businessUrl: business.url || "", rating: business.rating ?? null, reviewCount: business.review_count ?? null },
      connectedAt: new Date()
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, data: { provider: "yelp", status: connection.status, businessName: connection.externalAccountName, rating: business.rating ?? null, reviewCount: business.review_count ?? null, reviewAccess: "limited_public_sample" } });
}));

app.post("/api/integrations/yelp/sync-reviews", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const result = await syncYelpReviewsForTenant(clientId);
  if (result.skipped) return res.status(409).json({ success: false, error: result.skipped });
  res.json({ success: true, data: result });
}));

app.get("/api/integrations/meta-facebook/connect", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const state = jwt.sign({ sub: req.user._id.toString(), clientId }, process.env.JWT_SECRET, { expiresIn: "10m", audience: "meta-facebook-oauth" });
  res.json({ authorizationUrl: metaAuthorizationUrl(state) });
}));

app.get("/api/integrations/meta-facebook/callback", asyncHandler(async (req, res) => {
  const frontend = allowedOrigins[0] || "http://localhost:3000";
  if (req.query.error) return res.redirect(`${frontend}/dashboard/settings?facebook=denied`);
  const parsed = z.object({ code: z.string().min(1), state: z.string().min(1) }).safeParse(req.query);
  if (!parsed.success) return res.status(400).send("Invalid Meta OAuth callback");
  let state;
  try { state = jwt.verify(parsed.data.state, process.env.JWT_SECRET, { audience: "meta-facebook-oauth" }); }
  catch { return res.status(400).send("Meta OAuth state is invalid or expired"); }
  const token = await exchangeMetaCode(parsed.data.code);
  await IntegrationConnection.findOneAndUpdate(
    { clientId: state.clientId, provider: "meta-facebook" },
    { $set: {
      status: "connected",
      accessTokenEncrypted: encryptToken(token.access_token),
      tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scopes: ["pages_show_list", "pages_read_engagement", "pages_read_user_content"],
      metadata: { userTokenPendingPageSelection: true },
      connectedAt: new Date()
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.redirect(`${frontend}/dashboard/settings?facebook=authorized`);
}));

app.get("/api/integrations/meta-facebook/pages", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const connection = await IntegrationConnection.findOne({ clientId, provider: "meta-facebook", status: "connected" });
  if (!connection?.accessTokenEncrypted) return res.status(404).json({ error: "Connect Meta and authorize Page access first" });
  const pages = await listManagedFacebookPages(decryptToken(connection.accessTokenEncrypted));
  res.json({ data: (pages.data || []).map(page => ({ id: page.id, name: page.name, tasks: page.tasks || [] })) });
}));

app.post("/api/integrations/meta-facebook/page", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ pageId: z.string().trim().min(1).max(100) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A valid Facebook Page ID is required" });
  const connection = await IntegrationConnection.findOne({ clientId, provider: "meta-facebook", status: "connected" });
  if (!connection?.accessTokenEncrypted) return res.status(404).json({ error: "Meta authorization is required" });
  const pages = await listManagedFacebookPages(decryptToken(connection.accessTokenEncrypted));
  const selected = (pages.data || []).find(page => page.id === parsed.data.pageId && page.access_token);
  if (!selected) return res.status(403).json({ error: "The authorized account does not manage this Page or did not grant a Page token" });
  const details = await getFacebookPage(selected.id, selected.access_token);
  connection.accessTokenEncrypted = encryptToken(selected.access_token);
  connection.externalAccountName = details.name || selected.name;
  connection.externalAccountEmail = "";
  connection.metadata = {
    pageId: details.id,
    pageName: details.name || selected.name,
    pageUrl: details.link || "",
    reviewSyncSupported: false,
    limitation: "Meta Graph API v22.0 and later removed Page ratings/recommendations endpoints."
  };
  connection.scopes = ["pages_show_list", "pages_read_engagement", "pages_read_user_content"];
  await connection.save();
  res.json({ success: true, data: { pageId: details.id, pageName: connection.externalAccountName, reviewSyncSupported: false, limitation: connection.metadata.limitation } });
}));

app.post("/api/integrations/meta-facebook/sync-reviews", auth, tenantGuard, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const connection = await IntegrationConnection.findOne({ clientId, provider: "meta-facebook", status: "connected" });
  if (!connection?.metadata?.pageId) return res.status(409).json({ error: "Connect Meta and select a managed Page first" });
  return res.status(501).json({
    success: false,
    code: "META_PAGE_REVIEWS_UNAVAILABLE",
    error: "Meta Graph API v22.0+ no longer exposes Page ratings/recommendations for review aggregation. The Page is connected, but review ingestion is unavailable through this API."
  });
}));

app.get("/api/integrations/status", auth, tenantGuard, asyncHandler(async (req, res) => {
  const connections = await IntegrationConnection.find({ clientId: req.user.clientId, provider: { $in: ["google-business-profile", "yelp", "meta-facebook"] } }).lean();
  const byProvider = Object.fromEntries(connections.map(item => [item.provider, item]));
  const google = byProvider["google-business-profile"];
  const yelp = byProvider.yelp;
  const facebook = byProvider["meta-facebook"];
  const billingClient = await Client.findById(req.user.clientId).select("billingStatus billingPlan").lean();
  res.json({
  integrations: [
    { key: "mongodb", name: "MongoDB", status: mongoose.connection.readyState === 1 ? "connected" : "disconnected" },
    { key: "google-business-profile", name: "Google Business Profile", status: google?.status || "not_connected", accountEmail: google?.externalAccountEmail || null, location: google?.locationTitle || null },
    { key: "yelp", name: "Yelp", status: yelp?.status || "not_connected", businessName: yelp?.externalAccountName || null, reviewAccess: yelp ? "limited_public_sample" : "not_connected", note: yelp ? "Public Fusion API sample only; full review access requires Yelp partner approval." : "Configure YELP_FUSION_API_KEY and connect a Yelp business ID." },
    { key: "facebook", name: "Facebook", status: facebook?.status || "not_connected", pageName: facebook?.externalAccountName || null, reviewSyncSupported: false, note: facebook?.metadata?.limitation || "Meta Page connection requires app review and Page permissions; Page review endpoints are no longer available in Graph API v22+." },
    { key: "close-crm", name: "Close CRM", status: "demo_only" },
    { key: "n8n", name: "n8n automation", status: "demo_only" },
    { key: "stripe", name: "Stripe billing", status: billingClient?.billingStatus || "inactive", plan: billingClient?.billingPlan || "free" },
    { key: "ai", name: "AI responses", status: "demo_only" }
  ],
  demo: DEMO_MODE
  });
}));

app.use((err, _req, res, _next) => {
  if (err?.code === 11000) return res.status(409).json({ error: "A record with these details already exists" });
  console.error(err);
  res.status(err?.status && Number.isInteger(err.status) ? err.status : 500).json({ error: err?.status ? err.message : "Internal server error" });
});

async function start() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  await mongoose.connect(process.env.MONGODB_URI);
  if (DEMO_MODE && process.env.DEMO_EMAIL && process.env.DEMO_PASSWORD) {
    const email = process.env.DEMO_EMAIL.toLowerCase();
    const exists = await User.findOne({ email });
    if (!exists) {
      const client = await Client.create({ businessName: "Ricoiz Demo Workspace", ownerName: "Demo Owner", ownerEmail: email, city: "Mumbai", status: "demo", demo: true });
      const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD, 12);
      const user = await User.create({ name: "Demo Owner", email, passwordHash, role: "owner", clientId: client._id });
      const samples = await Customer.insertMany([
        { clientId: client._id, firstName: "Aarav", phone: "+919876543210", consentStatus: "unknown" },
        { clientId: client._id, firstName: "Maya", phone: "+919876543211", consentStatus: "unknown" },
        { clientId: client._id, firstName: "Kabir", phone: "+919876543212", consentStatus: "unknown" }
      ]);
      await Review.insertMany([
        { clientId: client._id, customerId: samples[0]._id, platform: "demo", author: "Aarav", rating: 5, text: "Excellent service and a smooth experience.", responseStatus: "draft", demo: true },
        { clientId: client._id, customerId: samples[1]._id, platform: "demo", author: "Maya", rating: 4, text: "Friendly team and quick support.", responseStatus: "approved", response: "Thank you for the kind feedback!", demo: true },
        { clientId: client._id, customerId: samples[2]._id, platform: "demo", author: "Kabir", rating: 5, text: "Would happily recommend this business.", responseStatus: "published", response: "We appreciate your recommendation.", demo: true }
      ]);
      await Campaign.create({ clientId: client._id, name: "Welcome follow-up (demo)", channel: "sms", status: "draft", audienceCount: 3, demo: true });
      console.log("Seeded isolated Ricoiz demo workspace for", user.email);
    }
  }
  app.listen(PORT, () => console.log(`Ricoiz MongoDB API listening on :${PORT} (demoMode=${DEMO_MODE})`));
}
export { app, start };

if (process.env.NODE_ENV !== "test") {
  start().catch(error => { console.error("API startup failed:", error); process.exit(1); });
}
