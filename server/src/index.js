import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User, Client, Customer, Review, Campaign, SmsActivity, Onboarding, IntegrationConnection } from "./models.js";
import { googleAuthorizationUrl, exchangeGoogleCode, encryptToken, googleUserInfo, googleAccessToken, listGoogleAccounts, listGoogleLocations, listGoogleReviews, publishGoogleReviewReply } from "./googleBusinessProfile.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);
const DEMO_MODE = process.env.DEMO_MODE !== "false";
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000").split(",").map(v => v.trim());

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); callback(new Error("Origin not allowed")); }, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));

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
const clientScope = req => req.user.clientId || req.query.clientId || req.body?.clientId;
const requireClient = (req, res) => {
  const id = String(clientScope(req) || "");
  if (!id || !mongoose.isValidObjectId(id)) { res.status(400).json({ error: "A valid workspace is required" }); return null; }
  if (req.user.clientId?.toString() !== id) { res.status(403).json({ error: "Workspace access denied" }); return null; }
  return id;
};

app.get("/health", (_req, res) => res.json({ ok: true, service: "ricoiz-api", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", demoMode: DEMO_MODE }));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid email and password are required" });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: "Email or password is incorrect" });
  res.cookie("ricoiz_session", tokenFor(user), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
  return res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}));
app.get("/api/auth/me", auth, (req, res) => res.json({ user: req.user }));
app.post("/api/auth/logout", auth, (_req, res) => { res.clearCookie("ricoiz_session", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" }); res.json({ ok: true }); });

app.post("/api/onboarding", asyncHandler(async (req, res) => {
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

app.get("/api/dashboard/overview", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const [reviews, customers, campaigns, sms] = await Promise.all([
    Review.find({ clientId }).lean(), Customer.countDocuments({ clientId }),
    Campaign.countDocuments({ clientId }), SmsActivity.countDocuments({ clientId, direction: "outbound" })
  ]);
  const averageRating = reviews.length ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)) : 0;
  res.json({ metrics: { newReviews: reviews.length, averageRating, customers, campaigns, smsRequests: sms, repliesToReview: reviews.filter(r => r.responseStatus === "published").length }, demo: DEMO_MODE });
}));

app.get("/api/customers", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const page = Math.max(1, Number(req.query.page || 1)); const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = { clientId }; if (req.query.search) filter.$or = [{ firstName: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }, { phone: new RegExp(String(req.query.search), "i") }];
  const [items, total] = await Promise.all([Customer.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Customer.countDocuments(filter)]);
  res.json({ items, page, limit, total });
}));
app.post("/api/customers", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().max(80).optional(), phone: z.string().trim().min(7).max(25), email: z.string().email().optional(), consentStatus: z.enum(["unknown", "granted", "revoked"]).default("unknown") }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid customer details", details: parsed.error.flatten() });
  const item = await Customer.create({ ...parsed.data, clientId });
  res.status(201).json({ item });
}));
app.patch("/api/customers/:id", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const item = await Customer.findOneAndUpdate({ _id: req.params.id, clientId }, { $set: req.body }, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Customer not found" }); res.json({ item });
}));
app.delete("/api/customers/:id", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const item = await Customer.findOneAndDelete({ _id: req.params.id, clientId });
  if (!item) return res.status(404).json({ error: "Customer not found" }); res.json({ ok: true });
}));

app.get("/api/reviews", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const items = await Review.find({ clientId }).sort({ reviewedAt: -1 }).limit(100).lean(); res.json({ items });
}));
app.patch("/api/reviews/:id/response", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ response: z.string().trim().min(1).max(5000), responseStatus: z.enum(["draft", "approved"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid response" });
  const item = await Review.findOneAndUpdate({ _id: req.params.id, clientId }, { $set: parsed.data }, { new: true });
  if (!item) return res.status(404).json({ error: "Review not found" }); res.json({ item, demo: DEMO_MODE });
}));

app.get("/api/campaigns", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  res.json({ items: await Campaign.find({ clientId }).sort({ createdAt: -1 }).lean() });
}));
app.post("/api/campaigns", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ name: z.string().trim().min(2).max(100), channel: z.enum(["sms", "email"]).default("sms"), messageTemplate: z.string().max(2000).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid campaign details" });
  const item = await Campaign.create({ ...parsed.data, clientId, status: "draft", demo: DEMO_MODE });
  res.status(201).json({ item });
}));
app.patch("/api/campaigns/:id/status", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ status: z.enum(["draft", "scheduled", "active", "paused", "completed"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid campaign status" });
  const item = await Campaign.findOneAndUpdate({ _id: req.params.id, clientId }, { status: parsed.data.status }, { new: true });
  if (!item) return res.status(404).json({ error: "Campaign not found" });
  res.json({ item, message: "Status saved. No real SMS is sent by this demo API." });
}));



app.patch("/api/settings/intake-phone", auth, asyncHandler(async (req, res) => {
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

app.get("/api/integrations/google-business-profile/connect", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const state = jwt.sign({ sub: req.user._id.toString(), clientId }, process.env.JWT_SECRET, { expiresIn: "10m", audience: "google-business-profile-oauth" });
  res.json({ authorizationUrl: googleAuthorizationUrl(state) });
}));
app.get("/api/integrations/google-business-profile/callback", asyncHandler(async (req, res) => {
  const frontend = allowedOrigins[0] || "http://localhost:3000";
  if (req.query.error) return res.redirect(`${frontend}/settings/integrations?google=denied`);
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
  res.redirect(`${frontend}/settings/integrations?google=connected`);
}));
app.get("/api/integrations/google-business-profile/accounts", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const connection = await IntegrationConnection.findOne({ clientId, provider: "google-business-profile", status: "connected" });
  if (!connection) return res.status(404).json({ error: "Google Business Profile is not connected" });
  const accessToken = await googleAccessToken(connection, doc => doc.save());
  res.json(await listGoogleAccounts(accessToken));
}));
app.get("/api/integrations/google-business-profile/locations", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const account = String(req.query.account || "");
  if (!/^accounts\/[A-Za-z0-9_-]+$/.test(account)) return res.status(400).json({ error: "A valid Google account resource name is required" });
  const connection = await IntegrationConnection.findOne({ clientId, provider: "google-business-profile", status: "connected" });
  if (!connection) return res.status(404).json({ error: "Google Business Profile is not connected" });
  const accessToken = await googleAccessToken(connection, doc => doc.save());
  res.json(await listGoogleLocations(accessToken, account));
}));
app.post("/api/integrations/google-business-profile/location", auth, asyncHandler(async (req, res) => {
  const clientId = requireClient(req, res); if (!clientId) return;
  const parsed = z.object({ accountName: z.string().regex(/^accounts\/[A-Za-z0-9_-]+$/), locationName: z.string().regex(/^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+$/), locationTitle: z.string().trim().min(1).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid Google account and location are required" });
  const connection = await IntegrationConnection.findOneAndUpdate({ clientId, provider: "google-business-profile" }, { $set: { externalAccountName: parsed.data.accountName, locationName: parsed.data.locationName, locationTitle: parsed.data.locationTitle } }, { new: true });
  if (!connection) return res.status(404).json({ error: "Google Business Profile is not connected" });
  res.json({ ok: true, locationName: connection.locationName, locationTitle: connection.locationTitle });
}));
app.post("/api/integrations/google-business-profile/sync-reviews", auth, asyncHandler(async (req, res) => {
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
        { $set: { rating, author: review.reviewer?.displayName || "Google user", text: review.comment || "", response: review.reviewReply?.comment || "", responseStatus: review.reviewReply?.comment ? "published" : "not_started", reviewedAt: review.createTime ? new Date(review.createTime) : new Date(), demo: false } },
        { upsert: true, new: true }
      );
      synced++;
    }
    pageToken = data.nextPageToken; pages++;
  } while (pageToken && pages < 10);
  res.json({ ok: true, synced, pages, hasMore: Boolean(pageToken) });
}));
app.put("/api/integrations/google-business-profile/reviews/:reviewId/reply", auth, asyncHandler(async (req, res) => {
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

app.get("/api/integrations/status", auth, asyncHandler(async (req, res) => {
  const connection = await IntegrationConnection.findOne({ clientId: req.user.clientId, provider: "google-business-profile" }).lean();
  res.json({
  integrations: [
    { key: "mongodb", name: "MongoDB", status: mongoose.connection.readyState === 1 ? "connected" : "disconnected" },
    { key: "google-business-profile", name: "Google Business Profile", status: connection?.status || "not_connected", accountEmail: connection?.externalAccountEmail || null, location: connection?.locationTitle || null },
    { key: "close-crm", name: "Close CRM", status: "demo_only" },
    { key: "n8n", name: "n8n automation", status: "demo_only" },
    { key: "stripe", name: "Stripe billing", status: "not_connected" },
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
start().catch(error => { console.error("API startup failed:", error); process.exit(1); });
