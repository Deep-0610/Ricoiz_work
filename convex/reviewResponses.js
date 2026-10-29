import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { contentFilterCheck } from "./lib/templates";
const SLA_MINUTES = 60;
const existsByGbpId = query({
  args: { gbpReviewId: v.string() },
  handler: async (ctx, { gbpReviewId }) => {
    const existing = await ctx.db.query("reviewResponses").withIndex("by_gbp_review", (q) => q.eq("gbpReviewId", gbpReviewId)).first();
    return { exists: !!existing, id: existing?._id, status: existing?.status };
  }
});
const drafted = mutation({
  args: {
    clientId: v.id("reviewClients"),
    gbpReviewId: v.string(),
    reviewerName: v.string(),
    reviewRating: v.number(),
    reviewText: v.string(),
    reviewedAt: v.number(),
    aiDraft: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("reviewResponses").withIndex("by_gbp_review", (q) => q.eq("gbpReviewId", args.gbpReviewId)).first();
    if (existing) return { id: existing._id, status: existing.status, isNew: false };
    const filter = contentFilterCheck(args.aiDraft);
    const client = await ctx.db.get(args.clientId);
    let status2;
    let finalDraft = args.aiDraft;
    if (!filter.pass) {
      status2 = "pending_approval";
    } else if (args.reviewRating >= 4) {
      status2 = "auto_posted";
    } else {
      status2 = "pending_approval";
    }
    const now = Date.now();
    const id = await ctx.db.insert("reviewResponses", {
      clientId: args.clientId,
      gbpReviewId: args.gbpReviewId,
      reviewerName: args.reviewerName,
      reviewText: args.reviewText,
      reviewRating: args.reviewRating,
      reviewedAt: args.reviewedAt,
      aiDraft: finalDraft,
      aiDraftGeneratedAt: now,
      contentFilterPassed: filter.pass,
      contentFilterReason: filter.reason,
      status: status2,
      createdAt: now,
      updatedAt: now
    });
    if (client) {
      await ctx.db.patch(args.clientId, {
        // Guarantee counts reviews since signup
        ...client.guaranteeStartAt && args.reviewedAt >= client.guaranteeStartAt ? { guaranteeReviewsCount: (client.guaranteeReviewsCount || 0) + 1 } : {},
        updatedAt: now
      });
    }
    return {
      id,
      status: status2,
      isNew: true,
      shouldAutoPost: status2 === "auto_posted",
      shouldSlackApproval: status2 === "pending_approval",
      finalDraft,
      businessName: client?.businessName,
      ownerFirstName: client?.ownerFirstName,
      ownerPhone: client?.ownerPhone
    };
  }
});
const approved = mutation({
  args: {
    responseId: v.id("reviewResponses"),
    approvedBy: v.string(),
    editedText: v.optional(v.string())
  },
  handler: async (ctx, { responseId, approvedBy, editedText }) => {
    const now = Date.now();
    await ctx.db.patch(responseId, {
      status: "approved",
      approvedBy,
      approvedAt: now,
      approvalEditedText: editedText,
      updatedAt: now
    });
    return { ok: true };
  }
});
const posted = mutation({
  args: {
    responseId: v.id("reviewResponses"),
    success: v.boolean(),
    error: v.optional(v.string()),
    policyViolation: v.optional(v.string())
  },
  handler: async (ctx, { responseId, success, error, policyViolation }) => {
    const now = Date.now();
    await ctx.db.patch(responseId, {
      status: success ? "posted" : "failed",
      postedAt: success ? now : void 0,
      postError: error,
      policyViolation,
      updatedAt: now
    });
    return { ok: true };
  }
});
const pendingApprovalSlaBreached = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - SLA_MINUTES * 60 * 1e3;
    const pending = await ctx.db.query("reviewResponses").filter((q) => q.eq(q.field("status"), "pending_approval")).collect();
    return pending.filter((r) => r.createdAt < cutoff).map((r) => ({
      id: r._id,
      clientId: r.clientId,
      gbpReviewId: r.gbpReviewId,
      aiDraft: r.aiDraft,
      reviewRating: r.reviewRating
    }));
  }
});
const status = query({
  args: { responseId: v.id("reviewResponses") },
  handler: async (ctx, { responseId }) => {
    const r = await ctx.db.get(responseId);
    return r ? { status: r.status, aiDraft: r.aiDraft, approvalEditedText: r.approvalEditedText } : null;
  }
});
export {
  approved,
  drafted,
  existsByGbpId,
  pendingApprovalSlaBreached,
  posted,
  status
};
