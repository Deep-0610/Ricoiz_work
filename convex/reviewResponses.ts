import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { contentFilterCheck, AI_FALLBACK_TEMPLATES } from "./lib/templates";

const SLA_MINUTES = 60;

/**
 * Check if we've already processed this GBP review (dedup).
 */
export const existsByGbpId = query({
  args: { gbpReviewId: v.string() },
  handler: async (ctx, { gbpReviewId }) => {
    const existing = await ctx.db
      .query("reviewResponses")
      .withIndex("by_gbp_review", (q) => q.eq("gbpReviewId", gbpReviewId))
      .first();
    return { exists: !!existing, id: existing?._id, status: existing?.status };
  },
});

/**
 * Store AI draft. Determines whether to auto-post (4-5 star) or Slack approval (1-3 star).
 * Also runs content filter.
 */
export const drafted = mutation({
  args: {
    clientId: v.id("reviewClients"),
    gbpReviewId: v.string(),
    reviewerName: v.string(),
    reviewRating: v.number(),
    reviewText: v.string(),
    reviewedAt: v.number(),
    aiDraft: v.string(),
  },
  handler: async (ctx, args) => {
    // Dedup guard
    const existing = await ctx.db
      .query("reviewResponses")
      .withIndex("by_gbp_review", (q) => q.eq("gbpReviewId", args.gbpReviewId))
      .first();
    if (existing) return { id: existing._id, status: existing.status, isNew: false };

    // Content filter
    const filter = contentFilterCheck(args.aiDraft);
    const client = await ctx.db.get(args.clientId);

    // If filter fails, route to Slack approval regardless of rating
    // If 1-3 star, always Slack approval
    // If 4-5 star + filter passed, auto-post
    let status: string;
    let finalDraft = args.aiDraft;

    if (!filter.pass) {
      status = "pending_approval";
    } else if (args.reviewRating >= 4) {
      status = "auto_posted"; // will trigger 10-min delay + post
    } else {
      status = "pending_approval"; // 1-3 stars always require approval
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
      status,
      createdAt: now,
      updatedAt: now,
    });

    // Update client's guarantee counter (any received review counts)
    if (client) {
      await ctx.db.patch(args.clientId, {
        // Guarantee counts reviews since signup
        ...(client.guaranteeStartAt && args.reviewedAt >= client.guaranteeStartAt
          ? { guaranteeReviewsCount: (client.guaranteeReviewsCount || 0) + 1 }
          : {}),
        updatedAt: now,
      });
    }

    return {
      id,
      status,
      isNew: true,
      shouldAutoPost: status === "auto_posted",
      shouldSlackApproval: status === "pending_approval",
      finalDraft,
      businessName: client?.businessName,
      ownerFirstName: client?.ownerFirstName,
      ownerPhone: client?.ownerPhone,
    };
  },
});

/**
 * Slack approval callback. Approve, edit, or skip.
 */
export const approved = mutation({
  args: {
    responseId: v.id("reviewResponses"),
    approvedBy: v.string(),
    editedText: v.optional(v.string()),
  },
  handler: async (ctx, { responseId, approvedBy, editedText }) => {
    const now = Date.now();
    await ctx.db.patch(responseId, {
      status: "approved",
      approvedBy,
      approvedAt: now,
      approvalEditedText: editedText,
      updatedAt: now,
    });
    return { ok: true };
  },
});

/**
 * Mark response as posted to Google.
 */
export const posted = mutation({
  args: {
    responseId: v.id("reviewResponses"),
    success: v.boolean(),
    error: v.optional(v.string()),
    policyViolation: v.optional(v.string()),
  },
  handler: async (ctx, { responseId, success, error, policyViolation }) => {
    const now = Date.now();
    await ctx.db.patch(responseId, {
      status: success ? "posted" : "failed",
      postedAt: success ? now : undefined,
      postError: error,
      policyViolation,
      updatedAt: now,
    });
    return { ok: true };
  },
});

/**
 * SLA fallback check — 1-3 star responses waiting >60 min → auto-post.
 */
export const pendingApprovalSlaBreached = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - SLA_MINUTES * 60 * 1000;
    const pending = await ctx.db
      .query("reviewResponses")
      .filter((q) => q.eq(q.field("status"), "pending_approval"))
      .collect();
    return pending
      .filter((r) => r.createdAt < cutoff)
      .map((r) => ({
        id: r._id,
        clientId: r.clientId,
        gbpReviewId: r.gbpReviewId,
        aiDraft: r.aiDraft,
        reviewRating: r.reviewRating,
      }));
  },
});

/**
 * Get response status (for external SLA fallback check).
 */
export const status = query({
  args: { responseId: v.id("reviewResponses") },
  handler: async (ctx, { responseId }) => {
    const r = await ctx.db.get(responseId);
    return r ? { status: r.status, aiDraft: r.aiDraft, approvalEditedText: r.approvalEditedText } : null;
  },
});
