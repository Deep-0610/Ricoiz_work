import { v } from "convex/values";
import { query, internalMutation, mutation } from "./_generated/server";

/**
 * List active reactivation batches (for WF-REV-03 trickler).
 */
export const activeBatches = query({
  args: {},
  handler: async (ctx) => {
    const batches = await ctx.db.query("reactivationBatches").collect();
    return {
      clients: batches
        .filter((b) => !b.complete)
        .map((b) => ({
          clientId: b.clientId,
          batchId: b._id,
          currentIndex: b.currentIndex,
          totalCustomers: b.totalCustomers,
          sentToday: b.sentToday,
          dailyCap: b.dailyCap,
        })),
    };
  },
});

/**
 * Trickle next N customers from a client's reactivation batch into main drip queue.
 * Enforces ≤50/day cap.
 */
export const tick = mutation({
  args: { clientId: v.id("reviewClients"), batchSize: v.optional(v.number()) },
  handler: async (ctx, { clientId, batchSize = 3 }) => {
    const now = Date.now();
    const batch = await ctx.db
      .query("reactivationBatches")
      .withIndex("by_client_active", (q) => q.eq("clientId", clientId).eq("complete", false))
      .first();
    if (!batch) return { inserted: 0, reason: "no_active_batch" };

    // Reset today counter if new day
    let sentToday = batch.sentToday;
    let resetAt = batch.sentTodayResetAt;
    const dayMs = 24 * 60 * 60 * 1000;
    if (now - resetAt >= dayMs) {
      sentToday = 0;
      resetAt = now;
    }

    // Cap check
    const availableToday = Math.max(0, batch.dailyCap - sentToday);
    const toInsert = Math.min(batchSize, availableToday);
    if (toInsert === 0) return { inserted: 0, reason: "daily_cap_reached" };

    // Get reactivation customers not yet drip-eligible
    const eligible = await ctx.db
      .query("reviewCustomers")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .filter((q) => q.eq(q.field("source"), "reactivation"))
      .filter((q) => q.eq(q.field("checkinSent"), false))
      .filter((q) => q.eq(q.field("optedOut"), false))
      .take(toInsert);

    // Bump jobCompletedAt so they become drip-eligible immediately
    for (const c of eligible) {
      await ctx.db.patch(c._id, {
        jobCompletedAt: now - 3 * 60 * 60 * 1000, // 3hr ago = eligible for WF-REV-01
        updatedAt: now,
      });
    }

    const newIndex = batch.currentIndex + eligible.length;
    const newSentToday = sentToday + eligible.length;
    const isComplete = newIndex >= batch.totalCustomers;

    await ctx.db.patch(batch._id, {
      currentIndex: newIndex,
      sentToday: newSentToday,
      sentTodayResetAt: resetAt,
      complete: isComplete,
      completedAt: isComplete ? now : undefined,
      updatedAt: now,
    });

    return {
      inserted: eligible.length,
      batchProgress: `${newIndex}/${batch.totalCustomers}`,
      batchComplete: isComplete,
    };
  },
});

/**
 * How many reactivation SMS sent today for a client (for external throttle check).
 */
export const todayCount = query({
  args: { clientId: v.id("reviewClients") },
  handler: async (ctx, { clientId }) => {
    const batch = await ctx.db
      .query("reactivationBatches")
      .withIndex("by_client_active", (q) => q.eq("clientId", clientId).eq("complete", false))
      .first();
    return { sentToday: batch?.sentToday || 0, dailyCap: batch?.dailyCap || 50 };
  },
});
