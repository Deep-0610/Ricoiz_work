import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Create a new client (called by Stripe webhook on successful checkout).
 */
export const create = mutation({
  args: {
    businessName: v.string(),
    ownerFirstName: v.string(),
    ownerLastName: v.string(),
    ownerEmail: v.string(),
    ownerPhone: v.string(),
    timezone: v.string(),
    vertical: v.string(),
    city: v.string(),
    googleReviewUrl: v.string(),
    senderPhone: v.string(),
    intakePhone: v.string(),
    isFoundingClient: v.boolean(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    currentPeriodEnd: v.number(),
    referredByClientId: v.optional(v.id("reviewClients")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const referralCode = `REFER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const clientId = await ctx.db.insert("reviewClients", {
      ...args,
      competitorPlaceIds: [],
      referralCode,
      monthsFreeEarned: 0,
      foundingTestimonialReceived: false,
      setupFeeWaived: args.isFoundingClient,
      setupFeeBackBilled: false,
      guaranteeStartAt: now,
      guaranteeReviewsCount: 0,
      guaranteeMet: false,
      subscriptionStatus: "active",
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // Initialize intake activity
    await ctx.db.insert("intakeActivity", {
      clientId,
      lastIntakeAt: now,
      alertCount: 0,
    });

    return clientId;
  },
});

/**
 * Lookup client by intake phone (n8n WF-REV-INTAKE).
 */
export const byIntakePhone = query({
  args: { intakePhone: v.string() },
  handler: async (ctx, { intakePhone }) => {
    const client = await ctx.db
      .query("reviewClients")
      .withIndex("by_intake_phone", (q) => q.eq("intakePhone", intakePhone))
      .first();
    if (!client || !client.active) return null;
    return {
      clientId: client._id,
      businessName: client.businessName,
      ownerFirstName: client.ownerFirstName,
      ownerPhone: client.ownerPhone,
      senderPhone: client.senderPhone,
      timezone: client.timezone,
    };
  },
});

/**
 * Get active clients whose GBP API is active (past 7-day cooldown).
 */
export const activeWithGbp = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const now = Date.now();
    const clients = await ctx.db
      .query("reviewClients")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return clients
      .filter((c) => c.gbpApiActiveFrom && c.gbpApiActiveFrom <= now)
      .filter((c) => !c.lastPolledAt || c.lastPolledAt < now - 15 * 60 * 1000)
      .slice(0, limit)
      .map((c) => ({
        id: c._id,
        businessName: c.businessName,
        ownerFirstName: c.ownerFirstName,
        ownerPhone: c.ownerPhone,
        gbpAccountId: c.gbpAccountId,
        gbpLocationId: c.gbpLocationId,
        gbpAccessToken: c.gbpAccessToken,
        gbpTokenExpiresAt: c.gbpTokenExpiresAt,
        lastPolledAt: c.lastPolledAt,
      }));
  },
});

/**
 * All active clients (for weekly report).
 */
export const allActive = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db
      .query("reviewClients")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return clients.map((c) => ({
      id: c._id,
      businessName: c.businessName,
      ownerFirstName: c.ownerFirstName,
      ownerEmail: c.ownerEmail,
      city: c.city,
      vertical: c.vertical,
      gbpAccountId: c.gbpAccountId,
      gbpLocationId: c.gbpLocationId,
      gbpAccessToken: c.gbpAccessToken,
      competitorPlaceIds: c.competitorPlaceIds,
    }));
  },
});

/**
 * Clients whose 7-day GBP cooldown has just expired (called by cooldown check workflow).
 */
export const withExpiredCooldown = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const clients = await ctx.db
      .query("reviewClients")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return clients
      .filter((c) => c.gbpManagerAcceptedAt && !c.gbpApiActiveFrom)
      .filter((c) => c.gbpManagerAcceptedAt! + 7 * 24 * 60 * 60 * 1000 <= now)
      .map((c) => ({
        id: c._id,
        businessName: c.businessName,
        ownerEmail: c.ownerEmail,
      }));
  },
});

/**
 * Activate GBP API for client (after cooldown clears).
 */
export const activateGbp = internalMutation({
  args: { clientId: v.id("reviewClients") },
  handler: async (ctx, { clientId }) => {
    await ctx.db.patch(clientId, {
      gbpApiActiveFrom: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Clients that just hit 10-review milestone (guarantee met).
 */
export const hittingMilestone = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db
      .query("reviewClients")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return clients
      .filter((c) => c.guaranteeReviewsCount >= 10 && !c.guaranteeMet)
      .map((c) => ({
        id: c._id,
        businessName: c.businessName,
        ownerFirstName: c.ownerFirstName,
        ownerPhone: c.ownerPhone,
        vertical: c.vertical,
        referralCode: c.referralCode,
      }));
  },
});

/**
 * Mark guarantee met + set founding testimonial due date if applicable.
 */
export const markGuaranteeMet = internalMutation({
  args: { clientId: v.id("reviewClients") },
  handler: async (ctx, { clientId }) => {
    const client = await ctx.db.get(clientId);
    if (!client) return;
    const now = Date.now();
    await ctx.db.patch(clientId, {
      guaranteeMet: true,
      guaranteeMetAt: now,
      referralAskSentAt: now,
      foundingTestimonialDueAt: client.isFoundingClient ? now + 60 * 24 * 60 * 60 * 1000 : undefined,
      updatedAt: now,
    });
  },
});

/**
 * Founding 5 clients approaching 60-day testimonial deadline.
 */
export const foundingApproachingDeadline = query({
  args: { daysRemaining: v.number() },
  handler: async (ctx, { daysRemaining }) => {
    const now = Date.now();
    const threshold = now + daysRemaining * 24 * 60 * 60 * 1000;
    const clients = await ctx.db
      .query("reviewClients")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return clients
      .filter((c) => c.isFoundingClient && !c.foundingTestimonialReceived && !c.setupFeeBackBilled)
      .filter((c) => c.foundingTestimonialDueAt && c.foundingTestimonialDueAt <= threshold && c.foundingTestimonialDueAt > now)
      .map((c) => ({
        id: c._id,
        businessName: c.businessName,
        ownerFirstName: c.ownerFirstName,
        ownerPhone: c.ownerPhone,
        ownerEmail: c.ownerEmail,
        daysRemaining: Math.floor((c.foundingTestimonialDueAt! - now) / (24 * 60 * 60 * 1000)),
      }));
  },
});

/**
 * Founding 5 clients past deadline — back-bill setup fee.
 */
export const foundingPastDeadline = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const clients = await ctx.db
      .query("reviewClients")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return clients
      .filter((c) => c.isFoundingClient && !c.foundingTestimonialReceived && !c.setupFeeBackBilled)
      .filter((c) => c.foundingTestimonialDueAt && c.foundingTestimonialDueAt <= now)
      .map((c) => ({
        id: c._id,
        businessName: c.businessName,
        ownerEmail: c.ownerEmail,
        stripeCustomerId: c.stripeCustomerId,
      }));
  },
});

/**
 * Mark setup fee back-billed.
 */
export const markSetupBackBilled = internalMutation({
  args: { clientId: v.id("reviewClients") },
  handler: async (ctx, { clientId }) => {
    await ctx.db.patch(clientId, {
      setupFeeBackBilled: true,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update poll timestamp.
 */
export const markPolled = internalMutation({
  args: { clientId: v.id("reviewClients") },
  handler: async (ctx, { clientId }) => {
    await ctx.db.patch(clientId, {
      lastPolledAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Deactivate client (Stripe subscription cancelled).
 */
export const deactivate = internalMutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    const client = await ctx.db
      .query("reviewClients")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", stripeCustomerId))
      .first();
    if (!client) return;
    await ctx.db.patch(client._id, {
      active: false,
      subscriptionStatus: "canceled",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update subscription status (past_due / active).
 */
export const updateSubscriptionStatus = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, { stripeCustomerId, status, currentPeriodEnd }) => {
    const client = await ctx.db
      .query("reviewClients")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", stripeCustomerId))
      .first();
    if (!client) return;
    await ctx.db.patch(client._id, {
      subscriptionStatus: status,
      ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
      updatedAt: Date.now(),
    });
  },
});
