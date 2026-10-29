import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
const submit = mutation({
  args: {
    businessName: v.string(),
    ownerFirstName: v.string(),
    ownerLastName: v.string(),
    ownerEmail: v.string(),
    ownerPhone: v.string(),
    timezone: v.string(),
    city: v.string(),
    googleReviewUrl: v.string(),
    consentMethod: v.string(),
    consentDateFrom: v.string(),
    consentDateTo: v.string(),
    consents: v.object({
      withinYear: v.boolean(),
      voluntary: v.boolean(),
      pewc: v.boolean(),
      notEBR: v.boolean(),
      indemnify: v.boolean()
    }),
    signature: v.string(),
    csvUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("pendingOnboardings", {
      ...args,
      status: "new",
      submittedAt: Date.now()
    });
    return { ok: true, id };
  }
});
const listPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pendingOnboardings").withIndex("by_status", (q) => q.eq("status", "new")).order("desc").take(50);
  }
});
const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db.query("pendingOnboardings").order("desc").take(limit ?? 100);
  }
});
const getById = query({
  args: { id: v.id("pendingOnboardings") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  }
});
const markProcessed = mutation({
  args: {
    id: v.id("pendingOnboardings"),
    clientId: v.id("reviewClients"),
    notes: v.optional(v.string())
  },
  handler: async (ctx, { id, clientId, notes }) => {
    await ctx.db.patch(id, {
      status: "processed",
      processedAt: Date.now(),
      processedClientId: clientId,
      notes
    });
    return { ok: true };
  }
});
const markRejected = mutation({
  args: {
    id: v.id("pendingOnboardings"),
    notes: v.string()
  },
  handler: async (ctx, { id, notes }) => {
    await ctx.db.patch(id, {
      status: "rejected",
      processedAt: Date.now(),
      notes
    });
    return { ok: true };
  }
});
export {
  getById,
  listAll,
  listPending,
  markProcessed,
  markRejected,
  submit
};
