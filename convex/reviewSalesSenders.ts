import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a sender to the pool.
export const add = mutation({
  args: {
    phone: v.string(),
    label: v.optional(v.string()),
    dailyCap: v.optional(v.number()),
  },
  handler: async (ctx, { phone, label, dailyCap }) => {
    const existing = await ctx.db
      .query("reviewSalesSenders")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (existing) return { ok: true, id: existing._id, already: true };

    const id = await ctx.db.insert("reviewSalesSenders", {
      phone,
      label: label ?? "",
      dailyCap: dailyCap ?? 100,
      sentToday: 0,
      sentTodayResetAt: Date.now(),
      active: true,
      createdAt: Date.now(),
    });
    return { ok: true, id, already: false };
  },
});

// List all senders + capacity.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const rows = await ctx.db.query("reviewSalesSenders").collect();
    return rows.map((s) => ({
      id: s._id,
      phone: s.phone,
      label: s.label,
      dailyCap: s.dailyCap,
      sentToday:
        s.sentTodayResetAt < now - DAY_MS ? 0 : s.sentToday,
      remaining:
        s.dailyCap -
        (s.sentTodayResetAt < now - DAY_MS ? 0 : s.sentToday),
      active: s.active,
    }));
  },
});

// Returns per-phone sent-today count for batch sender assignment.
// Matches Voltaris /senders/today endpoint shape used by WF-NW-02 Assign Senders JS.
export const perPhoneToday = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const rows = await ctx.db.query("reviewSalesSenders").collect();
    const perPhone: Record<string, number> = {};
    for (const s of rows) {
      const st = s.sentTodayResetAt < now - DAY_MS ? 0 : s.sentToday;
      perPhone[s.phone] = st;
    }
    return { perPhone };
  },
});

// Reset sentToday counter to 0 for one sender (used after tests).
export const resetSentToday = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const row = await ctx.db
      .query("reviewSalesSenders")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (!row) return { ok: false, error: "not_found" };
    await ctx.db.patch(row._id, {
      sentToday: 0,
      sentTodayResetAt: Date.now(),
    });
    return { ok: true };
  },
});

// Activate / deactivate a sender (pause a number).
export const setActive = mutation({
  args: { phone: v.string(), active: v.boolean() },
  handler: async (ctx, { phone, active }) => {
    const row = await ctx.db
      .query("reviewSalesSenders")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (!row) return { ok: false, error: "not_found" };
    await ctx.db.patch(row._id, { active });
    return { ok: true };
  },
});
