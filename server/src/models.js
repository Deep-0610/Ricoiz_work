import mongoose from "mongoose";

const { Schema, model, models } = mongoose;
const opts = { timestamps: true, versionKey: false };

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["owner", "admin", "member"], default: "owner" },
  clientId: { type: Schema.Types.ObjectId, ref: "Client", default: null },
  isActive: { type: Boolean, default: true }
}, opts);

const clientSchema = new Schema({
  businessName: { type: String, required: true, trim: true },
  ownerName: String,
  ownerEmail: { type: String, lowercase: true, trim: true },
  ownerPhone: String,
  city: String,
  timezone: { type: String, default: "Asia/Kolkata" },
  googleReviewUrl: String,
  status: { type: String, enum: ["demo", "pending", "active", "paused"], default: "demo" },
  demo: { type: Boolean, default: true }
}, opts);

const customerSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  consentStatus: { type: String, enum: ["unknown", "granted", "revoked"], default: "unknown" },
  consentSource: String,
  consentAt: Date,
  optedOutAt: Date,
  tags: [String],
  lastContactedAt: Date
}, opts);
customerSchema.index({ clientId: 1, phone: 1 }, { unique: true });

const reviewSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
  platform: { type: String, enum: ["google", "yelp", "facebook", "demo"], default: "demo" },
  externalId: String,
  author: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  text: String,
  response: String,
  responseStatus: { type: String, enum: ["not_started", "draft", "approved", "published"], default: "not_started" },
  reviewedAt: { type: Date, default: Date.now },
  demo: { type: Boolean, default: true }
}, opts);

const campaignSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  name: { type: String, required: true, trim: true },
  channel: { type: String, enum: ["sms", "email"], default: "sms" },
  status: { type: String, enum: ["draft", "scheduled", "active", "paused", "completed"], default: "draft" },
  audienceCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  messageTemplate: String,
  demo: { type: Boolean, default: true }
}, opts);

const smsActivitySchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
  direction: { type: String, enum: ["inbound", "outbound"], required: true },
  body: String,
  status: { type: String, enum: ["queued", "sent", "delivered", "failed", "mock"], default: "mock" },
  providerId: String,
  demo: { type: Boolean, default: true }
}, opts);

const onboardingSchema = new Schema({
  businessName: { type: String, required: true },
  ownerFirstName: { type: String, required: true },
  ownerLastName: { type: String, required: true },
  ownerEmail: { type: String, required: true, lowercase: true },
  ownerPhone: { type: String, required: true },
  timezone: String,
  city: String,
  googleReviewUrl: String,
  consentMethod: String,
  consentDateFrom: String,
  consentDateTo: String,
  consents: { type: Schema.Types.Mixed, default: {} },
  signature: String,
  status: { type: String, enum: ["new", "processed", "rejected"], default: "new" },
  demo: { type: Boolean, default: true }
}, opts);

export const User = models.User || model("User", userSchema);
export const Client = models.Client || model("Client", clientSchema);
export const Customer = models.Customer || model("Customer", customerSchema);
export const Review = models.Review || model("Review", reviewSchema);
export const Campaign = models.Campaign || model("Campaign", campaignSchema);
export const SmsActivity = models.SmsActivity || model("SmsActivity", smsActivitySchema);
const integrationConnectionSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  provider: { type: String, required: true, enum: ["google-business-profile", "close-crm", "n8n", "stripe", "ai"] },
  status: { type: String, enum: ["connected", "reauth_required", "disconnected"], default: "disconnected" },
  accessTokenEncrypted: String,
  refreshTokenEncrypted: String,
  tokenExpiresAt: Date,
  scopes: [String],
  externalAccountName: String,
  externalAccountEmail: String,
  locationName: String,
  locationTitle: String,
  connectedAt: Date,
  metadata: { type: Schema.Types.Mixed, default: {} }
}, opts);
integrationConnectionSchema.index({ clientId: 1, provider: 1 }, { unique: true });

export const IntegrationConnection = models.IntegrationConnection || model("IntegrationConnection", integrationConnectionSchema);
export const Onboarding = models.Onboarding || model("Onboarding", onboardingSchema);
