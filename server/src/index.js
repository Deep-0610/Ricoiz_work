import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User, Client, Customer, Review, Campaign, SmsActivity, Onboarding } from "./models.js";

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
  const token = req.cookies?.ricoiz_session || (req.headers.authorization || "").replace(/^Bearer\\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("name email role clientId isActive");
    if (!user?.isActive) return res.status(401).json({ error: "Invalid session" });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: "Invalid or expired session" }); }
});
const clientScope = req => req.user.clientId || req.query.clientId || req.body.clientId;
const requireClient = (req, res) => {
  const id = clientScope(req);
  if (!id || !mongoose.isValidObjectId(id)) { res.status(400).json({ error: "A valid workspace is required" }); return null; }
  if (req.user.role !== "owner" && req.user.clientId?.toString() !== id) { res.status(403).json({ error: "Workspace access denied" }); return null; }
  return id;
};

app.get("/health", (_req, res) => res.json({ ok: true, service: "ricoiz-api", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", demoMode: DEMO_MODE }));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid email and password are required" });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: "Email or password is incorrect" });
  res.cookie("ricoiz_session", tokenFor(user), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
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

app.get("/api/integrations/status", auth, (_req, res) => res.json({
  integrations: [
    { key: "mongodb", name: "MongoDB", status: mongoose.connection.readyState === 1 ? "connected" : "disconnected" },
    { key: "google-business-profile", name: "Google Business Profile", status: "not_connected" },
    { key: "close-crm", name: "Close CRM", status: "demo_only" },
    { key: "n8n", name: "n8n automation", status: "demo_only" },
    { key: "stripe", name: "Stripe billing", status: "not_connected" },
    { key: "ai", name: "AI responses", status: "demo_only" }
  ],
  demo: DEMO_MODE
}));

app.use((err, _req, res, _next) => {
  if (err?.code === 11000) return res.status(409).json({ error: "A record with these details already exists" });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
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
