import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
const DAYS_MS = 24 * 60 * 60 * 1e3;
const inactiveClients = query({
  args: { daysInactive: v.optional(v.number()) },
  handler: async (ctx, { daysInactive = 7 }) => {
    const cutoff = Date.now() - daysInactive * DAYS_MS;
    const now = Date.now();
    const activityRecords = await ctx.db.query("intakeActivity").collect();
    const clients = [];
    for (const activity of activityRecords) {
      if (activity.lastIntakeAt >= cutoff) continue;
      if (activity.snoozedUntil && activity.snoozedUntil > now) continue;
      if (activity.lastAlertSentAt && activity.lastAlertSentAt > now - 7 * DAYS_MS) continue;
      const client = await ctx.db.get(activity.clientId);
      if (!client || !client.active) continue;
      clients.push({
        id: client._id,
        businessName: client.businessName,
        ownerFirstName: client.ownerFirstName,
        ownerPhone: client.ownerPhone,
        intakePhone: client.intakePhone,
        daysSinceLastIntake: Math.floor((now - activity.lastIntakeAt) / DAYS_MS),
        alertCount: activity.alertCount
      });
    }
    return { clients };
  }
});
const intakeAlertSent = mutation({
  args: { clientId: v.id("reviewClients") },
  handler: async (ctx, { clientId }) => {
    const activity = await ctx.db.query("intakeActivity").withIndex("by_client", (q) => q.eq("clientId", clientId)).first();
    if (!activity) return { ok: false, error: "no_activity_record" };
    await ctx.db.patch(activity._id, {
      lastAlertSentAt: Date.now(),
      alertCount: activity.alertCount + 1
    });
    return { ok: true, alertCount: activity.alertCount + 1, escalate: activity.alertCount + 1 >= 2 };
  }
});
const snooze = mutation({
  args: { ownerPhone: v.string(), snoozeDays: v.optional(v.number()) },
  handler: async (ctx, { ownerPhone, snoozeDays = 7 }) => {
    const clients = await ctx.db.query("reviewClients").withIndex("by_active", (q) => q.eq("active", true)).collect();
    const match = clients.find((c) => c.ownerPhone === ownerPhone);
    if (!match) return { ok: false, error: "client_not_found" };
    const activity = await ctx.db.query("intakeActivity").withIndex("by_client", (q) => q.eq("clientId", match._id)).first();
    if (!activity) return { ok: false, error: "no_activity_record" };
    await ctx.db.patch(activity._id, {
      snoozedUntil: Date.now() + snoozeDays * DAYS_MS,
      alertCount: 0
    });
    return { ok: true };
  }
});
const recordIntake = mutation({
  args: { clientId: v.id("reviewClients") },
  handler: async (ctx, { clientId }) => {
    const activity = await ctx.db.query("intakeActivity").withIndex("by_client", (q) => q.eq("clientId", clientId)).first();
    if (activity) {
      await ctx.db.patch(activity._id, {
        lastIntakeAt: Date.now(),
        alertCount: 0
      });
    } else {
      await ctx.db.insert("intakeActivity", { clientId, lastIntakeAt: Date.now(), alertCount: 0 });
    }
    return { ok: true };
  }
});
export {
  inactiveClients,
  intakeAlertSent,
  recordIntake,
  snooze
};
