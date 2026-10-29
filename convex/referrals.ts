import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Look up client by referral code (used when new signup applies referral).
 */
export const byCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const client = await ctx.db
      .query("reviewClients")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", code))
      .first();
    return client ? { clientId: client._id, businessName: client.businessName } : null;
  },
});

/**
 * Track a referral (from public referral page click).
 */
export const track = mutation({
  args: {
    referralCode: v.string(),
    referredEmail: v.optional(v.string()),
  },
  handler: async (ctx, { referralCode, referredEmail }) => {
    const referrer = await ctx.db
      .query("reviewClients")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
      .first();
    if (!referrer) return { ok: false, error: "invalid_code" };

    // Dedup by email
    if (referredEmail) {
      const existing = await ctx.db
        .query("referrals")
        .withIndex("by_referrer", (q) => q.eq("referrerClientId", referrer._id))
        .filter((q) => q.eq(q.field("referredEmail"), referredEmail))
        .first();
      if (existing) return { ok: true, referralId: existing._id, already: true };
    }

    const id = await ctx.db.insert("referrals", {
      referrerClientId: referrer._id,
      referralCode,
      referredEmail,
      status: "invited",
      createdAt: Date.now(),
    });
    return { ok: true, referralId: id, already: false };
  },
});

/**
 * Mark referral converted (referred lead signed up + paid).
 * Credits referrer with 1 month free.
 */
export const converted = mutation({
  args: {
    referralCode: v.string(),
    referredClientId: v.id("reviewClients"),
    stripePromoCodeId: v.optional(v.string()),
  },
  handler: async (ctx, { referralCode, referredClientId, stripePromoCodeId }) => {
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_code", (q) => q.eq("referralCode", referralCode))
      .first();
    if (!referral) return { ok: false, error: "referral_not_found" };

    const referrer = await ctx.db.get(referral.referrerClientId);
    if (!referrer) return { ok: false, error: "referrer_not_found" };

    const now = Date.now();
    await ctx.db.patch(referral._id, {
      referredClientId,
      status: "credit_applied",
      creditAppliedAt: now,
      stripePromoCodeId,
    });

    await ctx.db.patch(referrer._id, {
      monthsFreeEarned: (referrer.monthsFreeEarned || 0) + 1,
      updatedAt: now,
    });

    return {
      ok: true,
      referrerClientId: referrer._id,
      referrerStripeCustomerId: referrer.stripeCustomerId,
      referrerBusinessName: referrer.businessName,
    };
  },
});
