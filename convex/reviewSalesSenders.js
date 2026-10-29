import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
const add = mutation({
  args: {
    phone: v.string(),
    label: v.optional(v.string()),
    dailyCap: v.optional(v.number())
  },
  handler: async (ctx, { phone, label, dailyCap }) => {
    const existing = await ctx.db.query("reviewSalesSenders").withIndex("by_phone", (q) => q.eq("phone", phone)).first();
    if (existing) return { ok: true, id: existing._id, already: true };
    const id = await ctx.db.insert("reviewSalesSenders", {
      phone,
      label: label ?? "",
      dailyCap: dailyCap ?? 100,
      sentToday: 0,
      sentTodayResetAt: Date.now(),
      active: true,
      createdAt: Date.now()
    });
    return { ok: true, id, already: false };
  }
});
const list = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1e3;
    const rows = await ctx.db.query("reviewSalesSenders").collect();
    return rows.map((s) => ({
      id: s._id,
      phone: s.phone,
      label: s.label,
      dailyCap: s.dailyCap,
      sentToday: s.sentTodayResetAt < now - DAY_MS ? 0 : s.sentToday,
      remaining: s.dailyCap - (s.sentTodayResetAt < now - DAY_MS ? 0 : s.sentToday),
      active: s.active
    }));
  }
});
const perPhoneToday = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1e3;
    const rows = await ctx.db.query("reviewSalesSenders").collect();
    const perPhone = {};
    for (const s of rows) {
      const st = s.sentTodayResetAt < now - DAY_MS ? 0 : s.sentToday;
      perPhone[s.phone] = st;
    }
    return { perPhone };
  }
});
const resetSentToday = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const row = await ctx.db.query("reviewSalesSenders").withIndex("by_phone", (q) => q.eq("phone", phone)).first();
    if (!row) return { ok: false, error: "not_found" };
    await ctx.db.patch(row._id, {
      sentToday: 0,
      sentTodayResetAt: Date.now()
    });
    return { ok: true };
  }
});
const setActive = mutation({
  args: { phone: v.string(), active: v.boolean() },
  handler: async (ctx, { phone, active }) => {
    const row = await ctx.db.query("reviewSalesSenders").withIndex("by_phone", (q) => q.eq("phone", phone)).first();
    if (!row) return { ok: false, error: "not_found" };
    await ctx.db.patch(row._id, { active });
    return { ok: true };
  }
});
export {
  add,
  list,
  perPhoneToday,
  resetSentToday,
  setActive
};
