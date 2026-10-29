import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get last week's snapshot for competitor comparison.
 */
export const lastWeekSnapshot = query({
  args: { clientId: v.id("reviewClients") },
  handler: async (ctx, { clientId }) => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const snapshots = await ctx.db
      .query("competitorSnapshots")
      .withIndex("by_client_week", (q) => q.eq("clientId", clientId))
      .collect();
    return snapshots
      .filter((s) => s.weekOf >= twoWeeksAgo && s.weekOf < oneWeekAgo)
      .sort((a, b) => b.weekOf - a.weekOf)[0] || null;
  },
});

/**
 * Save this week's competitor snapshot.
 */
export const saveSnapshot = mutation({
  args: {
    clientId: v.id("reviewClients"),
    weekOf: v.number(),
    clientReviewCount: v.number(),
    clientAvgRating: v.number(),
    clientNewReviewsThisWeek: v.number(),
    competitors: v.array(
      v.object({
        placeId: v.string(),
        name: v.string(),
        reviewCount: v.number(),
        avgRating: v.number(),
        reviewsGained: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Dedup — one snapshot per client per week
    const existing = await ctx.db
      .query("competitorSnapshots")
      .withIndex("by_client_week", (q) => q.eq("clientId", args.clientId).eq("weekOf", args.weekOf))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
      return { id: existing._id, updated: true };
    }
    const id = await ctx.db.insert("competitorSnapshots", args);
    return { id, updated: false };
  },
});

/**
 * Mark report email sent.
 */
export const markReportSent = mutation({
  args: { snapshotId: v.id("competitorSnapshots") },
  handler: async (ctx, { snapshotId }) => {
    await ctx.db.patch(snapshotId, { reportSentAt: Date.now() });
    return { ok: true };
  },
});

/**
 * Clients due for weekly report (not sent this week yet).
 */
export const clientsDueForReport = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const monday = new Date(now);
    monday.setUTCHours(0, 0, 0, 0);
    monday.setUTCDate(monday.getUTCDate() - monday.getUTCDay() + 1);
    const mondayTs = monday.getTime();

    const clients = await ctx.db
      .query("reviewClients")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    const due = [];
    for (const client of clients) {
      const snapshot = await ctx.db
        .query("competitorSnapshots")
        .withIndex("by_client_week", (q) => q.eq("clientId", client._id).eq("weekOf", mondayTs))
        .first();
      if (snapshot?.reportSentAt) continue;
      due.push({
        id: client._id,
        businessName: client.businessName,
        ownerFirstName: client.ownerFirstName,
        ownerEmail: client.ownerEmail,
        city: client.city,
        vertical: client.vertical,
        gbpAccountId: client.gbpAccountId,
        gbpLocationId: client.gbpLocationId,
        gbpAccessToken: client.gbpAccessToken,
        competitorPlaceIds: client.competitorPlaceIds,
        weekOfMonday: mondayTs,
      });
    }
    return { clients: due };
  },
});
