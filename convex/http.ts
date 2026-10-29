import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { detectOptOut } from "./optOuts";

const http = httpRouter();

// ============================================
// AUTH HELPER
// ============================================

function authorized(request: Request): boolean {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const expected = process.env.CONVEX_AUTH_TOKEN;
  // FAIL CLOSED: if env var missing, block all authed endpoints.
  // Previous behavior (fail open when unset) was a critical security bug —
  // a misconfigured deploy would make every mutation publicly writable.
  if (!expected) {
    console.error("CRITICAL: CONVEX_AUTH_TOKEN env not set — all authed endpoints will 401 until fixed");
    return false;
  }
  return token === expected;
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ============================================
// INTAKE (WF-REV-INTAKE)
// ============================================

http.route({
  path: "/reviews/client-by-intake-phone",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const intakePhone = url.searchParams.get("intakePhone") || "";
    const client = await ctx.runQuery(api.reviewClients.byIntakePhone, { intakePhone });
    return json(client || { error: "not_found" }, client ? 200 : 404);
  }),
});

http.route({
  path: "/reviews/customer-add-via-text",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reviewCustomers.addViaText, {
      clientId: body.clientId as Id<"reviewClients">,
      firstName: body.firstName,
      phone: body.phone,
      intakedFromOwnerPhone: body.intakedFromOwnerPhone,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/customer-add-bulk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reviewCustomers.addBulk, {
      clientId: body.clientId as Id<"reviewClients">,
      customers: body.customers,
    });
    return json(result);
  }),
});

// ============================================
// DRIP QUEUE (WF-REV-01, WF-REV-02)
// ============================================

http.route({
  path: "/reviews/pending-checkin",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const result = await ctx.runQuery(api.reviewCustomers.pendingCheckin, { limit });
    return json(result);
  }),
});

http.route({
  path: "/reviews/sms-batch",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const result = await ctx.runQuery(api.reviewCustomers.smsBatch, { limit });
    return json(result);
  }),
});

http.route({
  path: "/reviews/mark-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reviewCustomers.markSent, {
      customerId: body.customerId as Id<"reviewCustomers">,
      stage: body.stage,
      closeActivityId: body.closeActivityId,
    });
    return json(result);
  }),
});

// ============================================
// SERVICE RECOVERY / STOP (WF-REV-INBOUND)
// ============================================

http.route({
  path: "/reviews/checkin-reply",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reviewCustomers.checkinReply, {
      closeLeadId: body.closeLeadId,
      text: body.text,
      sentiment: body.sentiment,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/opt-out",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.optOuts.add, {
      phone: body.phone,
      reason: body.reason || "stop_reply",
      keywordMatched: body.keywordMatched,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/opt-out-check",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone") || "";
    const result = await ctx.runQuery(api.optOuts.check, { phone });
    return json(result);
  }),
});

// ============================================
// REACTIVATION (WF-REV-03)
// ============================================

http.route({
  path: "/reviews/active-reactivations",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runQuery(api.reactivation.activeBatches, {});
    return json(result);
  }),
});

http.route({
  path: "/reviews/reactivation-tick",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reactivation.tick, {
      clientId: body.clientId as Id<"reviewClients">,
      batchSize: body.batchSize,
    });
    return json(result);
  }),
});

// ============================================
// AI RESPONSE (WF-REV-04)
// ============================================

http.route({
  path: "/reviews/clients-with-gbp-active",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runQuery(api.reviewClients.activeWithGbp, {});
    return json({ clients: result });
  }),
});

http.route({
  path: "/reviews/response-exists",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const gbpReviewId = url.searchParams.get("gbpReviewId") || "";
    const result = await ctx.runQuery(api.reviewResponses.existsByGbpId, { gbpReviewId });
    return json(result);
  }),
});

http.route({
  path: "/reviews/response-drafted",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reviewResponses.drafted, {
      clientId: body.clientId as Id<"reviewClients">,
      gbpReviewId: body.gbpReviewId,
      reviewerName: body.reviewerName,
      reviewRating: body.reviewRating,
      reviewText: body.reviewText,
      reviewedAt: body.reviewedAt,
      aiDraft: body.aiDraft,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/response-approved",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reviewResponses.approved, {
      responseId: body.responseId as Id<"reviewResponses">,
      approvedBy: body.approvedBy,
      editedText: body.editedText,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/response-posted",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reviewResponses.posted, {
      responseId: body.responseId as Id<"reviewResponses">,
      success: body.success,
      error: body.error,
      policyViolation: body.policyViolation,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/response-status",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    const result = await ctx.runQuery(api.reviewResponses.status, {
      responseId: id as Id<"reviewResponses">,
    });
    return json(result || { error: "not_found" }, result ? 200 : 404);
  }),
});

http.route({
  path: "/reviews/pending-sla-breached",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runQuery(api.reviewResponses.pendingApprovalSlaBreached, {});
    return json({ responses: result });
  }),
});

// ============================================
// REPORTS (WF-REV-05)
// ============================================

http.route({
  path: "/reviews/active-clients",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runQuery(api.reviewClients.allActive, {});
    return json({ clients: result });
  }),
});

http.route({
  path: "/reviews/clients-due-for-report",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runQuery(api.reports.clientsDueForReport, {});
    return json(result);
  }),
});

http.route({
  path: "/reviews/last-week-snapshot",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") || "";
    const result = await ctx.runQuery(api.reports.lastWeekSnapshot, {
      clientId: clientId as Id<"reviewClients">,
    });
    return json(result || { snapshot: null });
  }),
});

http.route({
  path: "/reviews/competitor-snapshot",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reports.saveSnapshot, body);
    return json(result);
  }),
});

http.route({
  path: "/reviews/report-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reports.markReportSent, {
      snapshotId: body.snapshotId as Id<"competitorSnapshots">,
    });
    return json(result);
  }),
});

// ============================================
// MONITORING (WF-REV-06)
// ============================================

http.route({
  path: "/reviews/inactive-clients",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("daysInactive") || "7", 10);
    const result = await ctx.runQuery(api.monitoring.inactiveClients, { daysInactive: days });
    return json(result);
  }),
});

http.route({
  path: "/reviews/intake-alert-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.monitoring.intakeAlertSent, {
      clientId: body.clientId as Id<"reviewClients">,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/intake-snoozed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.monitoring.snooze, {
      ownerPhone: body.ownerPhone,
      snoozeDays: body.snoozeDays,
    });
    return json(result);
  }),
});

// ============================================
// GBP COOLDOWN + GUARANTEE + FOUNDING
// ============================================

http.route({
  path: "/reviews/clients-with-expired-cooldown",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runQuery(api.reviewClients.withExpiredCooldown, {});
    return json({ clients: result });
  }),
});

http.route({
  path: "/reviews/activate-gbp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    await ctx.runMutation(internal.reviewClients.activateGbp, {
      clientId: body.clientId as Id<"reviewClients">,
    });
    return json({ ok: true });
  }),
});

http.route({
  path: "/reviews/clients-hitting-milestone",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runQuery(api.reviewClients.hittingMilestone, {});
    return json({ clients: result });
  }),
});

http.route({
  path: "/reviews/mark-guarantee-met",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    await ctx.runMutation(internal.reviewClients.markGuaranteeMet, {
      clientId: body.clientId as Id<"reviewClients">,
    });
    return json({ ok: true });
  }),
});

http.route({
  path: "/reviews/founding-approaching",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("daysRemaining") || "14", 10);
    const result = await ctx.runQuery(api.reviewClients.foundingApproachingDeadline, { daysRemaining: days });
    return json({ clients: result });
  }),
});

http.route({
  path: "/reviews/founding-past-deadline",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runQuery(api.reviewClients.foundingPastDeadline, {});
    return json({ clients: result });
  }),
});

http.route({
  path: "/reviews/mark-founding-back-billed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    await ctx.runMutation(internal.reviewClients.markSetupBackBilled, {
      clientId: body.clientId as Id<"reviewClients">,
    });
    return json({ ok: true });
  }),
});

// ============================================
// REFERRALS
// ============================================

http.route({
  path: "/reviews/referral-by-code",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const code = url.searchParams.get("code") || "";
    const result = await ctx.runQuery(api.referrals.byCode, { code });
    return json(result || { error: "not_found" }, result ? 200 : 404);
  }),
});

http.route({
  path: "/reviews/referral-track",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.referrals.track, {
      referralCode: body.referralCode,
      referredEmail: body.referredEmail,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/referral-converted",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.referrals.converted, {
      referralCode: body.referralCode,
      referredClientId: body.referredClientId as Id<"reviewClients">,
      stripePromoCodeId: body.stripePromoCodeId,
    });
    return json(result);
  }),
});

// ============================================
// CLICK TRACKER (public, no auth)
// ============================================

http.route({
  pathPrefix: "/reviews/click/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const customerId = url.pathname.replace("/reviews/click/", "") as Id<"reviewCustomers">;

    const data = await ctx.runMutation(internal.reviewCustomers.getForClick, { customerId });
    if (!data) {
      return new Response("Not found", { status: 404 });
    }

    // Async click log (don't block redirect)
    await ctx.runMutation(internal.reviewCustomers.recordClick, { customerId });

    return new Response(null, {
      status: 302,
      headers: { Location: data.googleReviewUrl },
    });
  }),
});

// ============================================
// STRIPE WEBHOOK — disabled in Phase 1 (Payment Links, manual admin)
// Re-enable in Phase 2 by restoring _disabled/stripe.ts.bak
// ============================================

// ============================================
// SALES PIPELINE ENDPOINTS (prospecting outreach)
// Mirrors WF-NW-02/03/04 architecture
// ============================================

http.route({
  path: "/reviews/sales-lead-ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      if (!body.leads || !Array.isArray(body.leads)) {
        return json({ error: "leads array required" }, 400);
      }
      const result = await ctx.runMutation(api.reviewSalesLeads.bulkIngest, {
        leads: body.leads,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-daily-batch",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const minReviews = url.searchParams.get("minReviews")
      ? parseInt(url.searchParams.get("minReviews")!, 10)
      : undefined;
    const maxReviews = url.searchParams.get("maxReviews")
      ? parseInt(url.searchParams.get("maxReviews")!, 10)
      : undefined;
    const niche = url.searchParams.get("niche") || undefined;
    const result = await ctx.runQuery(api.reviewSalesLeads.dailyBatch, {
      limit,
      minReviews,
      maxReviews,
      niche,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/sales-assign-sender",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.assignSender, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-mark-pushed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.markPushed, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
        closeLeadId: body.closeLeadId,
        closeContactId: body.closeContactId,
        track: body.track,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-record-sms",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.recordSms, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
        touchNumber: body.touchNumber,
        closeActivityId: body.closeActivityId,
        text: body.text,
        senderPhone: body.senderPhone,
        variant: body.variant,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-followup-batch",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const result = await ctx.runQuery(api.reviewSalesLeads.followupBatch, {
      limit,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/sales-log-activity",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.logActivity, body);
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-delivery-check-batch",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const result = await ctx.runQuery(api.reviewSalesLeads.deliveryCheckBatch, {
      limit,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/sales-set-phone-type",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.setPhoneType, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
        phoneType: body.phoneType,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-move-to-error",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.moveToError, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
        reason: body.reason,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-update-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.updateStatus, {
        leadId: body.leadId as Id<"reviewSalesLeads"> | undefined,
        closeLeadId: body.closeLeadId,
        phone: body.phone,
        newStatus: body.newStatus,
        lastReplyText: body.lastReplyText,
        lastReplyIntent: body.lastReplyIntent,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// Called by auto-website /api/run-follow-ups-audit poker (authed).
// Type 1: leads where demo was sent >3h ago AND no click yet AND no followup1 yet.
http.route({
  path: "/reviews/sales-pending-audit-followup1",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const thresholdMs = parseInt(url.searchParams.get("thresholdMs") || "0", 10);
    const result = await ctx.runQuery(api.reviewSalesLeads.getPendingAuditFollowUp1, { thresholdMs });
    return json(result);
  }),
});

// Type 2: leads where audit was clicked >1h ago AND no followup2 yet.
http.route({
  path: "/reviews/sales-pending-audit-followup2",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const thresholdMs = parseInt(url.searchParams.get("thresholdMs") || "0", 10);
    const result = await ctx.runQuery(api.reviewSalesLeads.getPendingAuditFollowUp2, { thresholdMs });
    return json(result);
  }),
});

// Mark follow-up sent (idempotency).
http.route({
  path: "/reviews/sales-mark-audit-followup1-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.markAuditFollowup1Sent, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
        sentAt: body.sentAt,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-mark-audit-followup2-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.markAuditFollowup2Sent, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
        sentAt: body.sentAt,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// Called by WF-REV-DEMO-SEND workflow after successful Close SMS activity POST.
http.route({
  path: "/reviews/sales-record-demo-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.recordDemoSent, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
        senderPhone: body.senderPhone,
        closeActivityId: body.closeActivityId,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// Admin: bulk-import city-level competitors (one-shot, run once per state batch).
http.route({
  path: "/reviews/sales-import-city-competitors",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.bulkImportCityCompetitors, {
        entries: body.entries,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// PUBLIC (no auth) — fetches audit data for a lead. Called by the /audit page (server component).
http.route({
  path: "/reviews/sales-audit-data",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const leadId = url.searchParams.get("l");
    if (!leadId) return json({ error: "missing leadId" }, 400);
    try {
      const result = await ctx.runQuery(api.reviewSalesLeads.getAuditData, {
        leadId: leadId as Id<"reviewSalesLeads">,
      });
      if (!result) return json({ error: "not_found" }, 404);
      const res = json(result);
      res.headers.set("Access-Control-Allow-Origin", "*");
      return res;
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// PUBLIC (no auth) — audit page click tracking (called from browser on mount).
http.route({
  path: "/reviews/sales-track-audit-click",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const leadId = body.leadId;
      if (!leadId || typeof leadId !== "string") {
        return json({ error: "leadId required" }, 400);
      }
      const result = await ctx.runMutation(api.reviewSalesLeads.trackAuditClick, {
        leadId: leadId as Id<"reviewSalesLeads">,
      });
      const res = json(result);
      res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type");
      return res;
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-track-audit-click",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// PUBLIC (no auth) — called from YOUR_APP_HOST/watch on page mount to record a click.
// Rate-limiting is per-lead-id via idempotent upsert (Convex handles concurrent writes).
http.route({
  path: "/reviews/sales-track-demo-click",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const leadId = body.leadId;
      if (!leadId || typeof leadId !== "string") {
        return json({ error: "leadId required" }, 400);
      }
      const result = await ctx.runMutation(api.reviewSalesLeads.trackDemoClick, {
        leadId: leadId as Id<"reviewSalesLeads">,
      });
      const res = json(result);
      // Public endpoint — allow browser calls from YOUR_APP_HOST (and any host, since
      // leadId is opaque; worst-case someone with a leadId bumps their own click count).
      res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type");
      return res;
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-track-demo-click",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// Dashboard: list of pushed-to-Close leads with click status. Requires auth.
http.route({
  path: "/reviews/sales-clicks-dashboard",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : undefined;
    const onlyClicked = url.searchParams.get("onlyClicked") === "1";
    const result = await ctx.runQuery(api.reviewSalesLeads.salesClicksDashboard, {
      limit,
      onlyClicked,
    });
    return json(result);
  }),
});

http.route({
  path: "/reviews/sales-backfill-track",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.bulkBackfillTrack, {
        track: body.track,
        onlyWithCloseLeadId: body.onlyWithCloseLeadId,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-update-niche",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.updateNiche, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
        niche: body.niche,
        nicheSingular: body.nicheSingular,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-reset-by-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.resetByStatus, {
        status: body.status,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-reset-simulated",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runMutation(api.reviewSalesLeads.resetSimulatedLeads, {});
    return json(result);
  }),
});

// Admin: lightweight full-list for audits (name/niche/status only).
http.route({
  path: "/reviews/sales-list-all-basic",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const rows = await ctx.runQuery(api.reviewSalesLeads.listAllBasic, {});
    return json({ count: rows.length, leads: rows });
  }),
});

// Admin: set a sender's sentToday count (backfill).
http.route({
  path: "/reviews/sales-set-sender-today",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const b = await request.json();
    const r = await ctx.runMutation(api.reviewSalesLeads.setSenderToday, {
      phone: b.phone,
      sentToday: b.sentToday,
    });
    return json(r);
  }),
});

// V2 second-text queue: enqueue, fetch due, mark sent.
http.route({
  path: "/reviews/v2-queue",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const b = await request.json();
    const r = await ctx.runMutation(api.reviewSalesLeads.queueV2SecondText, {
      leadId: b.leadId as Id<"reviewSalesLeads">,
      closeLeadId: b.closeLeadId,
      senderPhone: b.senderPhone,
      recipientPhone: b.recipientPhone,
      text: b.text,
      track: b.track,
      delayMs: b.delayMs,
    });
    return json(r);
  }),
});

http.route({
  path: "/reviews/v2-due",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const r = await ctx.runQuery(api.reviewSalesLeads.dueV2SecondTexts, { limit });
    return json(r);
  }),
});

http.route({
  path: "/reviews/v2-mark-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const b = await request.json();
    const r = await ctx.runMutation(api.reviewSalesLeads.markV2Sent, {
      id: b.id as Id<"reviewV2Queue">,
      closeActivityId: b.closeActivityId,
    });
    return json(r);
  }),
});

// Admin: set the 5-6 shared competitor pool per (city, niche).
http.route({
  path: "/reviews/sales-set-competitor-pools",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const body = await request.json();
    const result = await ctx.runMutation(api.reviewSalesLeads.setCityCompetitorPools, {
      pools: body.pools,
    });
    return json(result);
  }),
});

// Admin: reset audit click tracking on a specific lead (used to clean up test clicks).
http.route({
  path: "/reviews/sales-reset-audit-clicks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.resetAuditClicks, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// TEST-ONLY: mock Close SMS API. Accepts any body/auth. Returns a Close-shaped
// activity response with fake id. Used during E2E testing to prevent real SMS sends.
// Log every mock send to a table so we can inspect what would have been sent.
http.route({
  path: "/reviews/mock-close-sms",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: any = {}
    try { body = await request.json() } catch (e) {}
    const mockId = `acti_MOCK_${Math.random().toString(36).slice(2, 12)}`
    // Log to a Convex table so we have receipts of every mock send
    await ctx.runMutation(api.reviewSalesLeads.recordMockSmsSend, {
      leadId: body.lead_id ?? "unknown",
      localPhone: body.local_phone ?? "",
      remotePhone: body.remote_phone ?? "",
      text: body.text ?? "",
      mockActivityId: mockId,
    }).catch(() => {})
    // Return Close-shaped response so n8n downstream nodes see .id
    return json({
      id: mockId,
      lead_id: body.lead_id ?? "",
      date_created: new Date().toISOString(),
      date_updated: new Date().toISOString(),
      text: body.text ?? "",
      status: body.status ?? "sent",
      local_phone: body.local_phone ?? "",
      remote_phone: body.remote_phone ?? "",
      direction: body.direction ?? "outbound",
      mock: true,
    })
  }),
})

http.route({
  path: "/reviews/mock-close-sms-log",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const limit = parseInt(new URL(request.url).searchParams.get("limit") || "20", 10)
    const rows = await ctx.runQuery(api.reviewSalesLeads.listMockSmsSends, { limit })
    return json({ count: rows.length, sends: rows })
  }),
})

http.route({
  path: "/reviews/mock-close-sms-clear",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runMutation(api.reviewSalesLeads.clearMockSmsSends, {})
    return json(result)
  }),
})

// Admin: restore a lead to "T1 sent, T2 pending" state (used after test recordSms bumps state).
http.route({
  path: "/reviews/sales-restore-to-t1-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.restoreToT1Sent, {
        leadId: body.leadId as Id<"reviewSalesLeads">,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-senders-today",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const result = await ctx.runQuery(api.reviewSalesSenders.perPhoneToday, {});
    return json(result);
  }),
});

http.route({
  path: "/reviews/sales-senders-reset-today",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesSenders.resetSentToday, {
        phone: body.phone,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-senders-set-active",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesSenders.setActive, {
        phone: body.phone,
        active: body.active,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-delete-by-source",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesLeads.deleteBySource, {
        source: body.source,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

http.route({
  path: "/reviews/sales-get-by-close-lead",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const closeLeadId = url.searchParams.get("closeLeadId") || "";
    const row = await ctx.runQuery(api.reviewSalesLeads.getByCloseLeadId, { closeLeadId });
    return json(row || { error: "not_found" }, row ? 200 : 404);
  }),
});

http.route({
  path: "/reviews/sales-senders-list",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const rows = await ctx.runQuery(api.reviewSalesSenders.list, {});
    return json({ count: rows.length, senders: rows });
  }),
});

http.route({
  path: "/reviews/sales-senders-add",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.reviewSalesSenders.add, {
        phone: body.phone,
        label: body.label,
        dailyCap: body.dailyCap,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// ============================================
// ONBOARDING LIST (admin authed — Owner triage view)
// ============================================

http.route({
  path: "/reviews/onboarding-list",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    if (status === "new") {
      const rows = await ctx.runQuery(api.onboardings.listPending, {});
      return json({ count: rows.length, onboardings: rows });
    }
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const rows = await ctx.runQuery(api.onboardings.listAll, { limit });
    return json({ count: rows.length, onboardings: rows });
  }),
});

http.route({
  path: "/reviews/onboarding-mark-processed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.onboardings.markProcessed, {
        id: body.id as Id<"pendingOnboardings">,
        clientId: body.clientId as Id<"reviewClients">,
        notes: body.notes,
      });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// ============================================
// OPT-OUT REMOVE (public authed — START/UNSTOP re-subscribe)
// ============================================

http.route({
  path: "/reviews/opt-out-remove",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      if (!body.phone) return json({ error: "missing phone" }, 400);
      const result = await ctx.runMutation(api.optOuts.remove, { phone: body.phone });
      return json(result);
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// ============================================
// CLIENT CREATE (admin — after payment received)
// ============================================

http.route({
  path: "/reviews/client-create",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return unauthorized();
    try {
      const body = await request.json();
      const clientId = await ctx.runMutation(api.reviewClients.create, {
        businessName: body.businessName,
        ownerFirstName: body.ownerFirstName,
        ownerLastName: body.ownerLastName || "",
        ownerEmail: body.ownerEmail,
        ownerPhone: body.ownerPhone,
        timezone: body.timezone || "America/New_York",
        vertical: body.vertical || "roofing",
        city: body.city || "",
        googleReviewUrl: body.googleReviewUrl,
        senderPhone: body.senderPhone,
        intakePhone: body.intakePhone,
        isFoundingClient: body.isFoundingClient !== false,
        stripeCustomerId: body.stripeCustomerId || "manual",
        stripeSubscriptionId: body.stripeSubscriptionId || "manual",
        currentPeriodEnd: body.currentPeriodEnd || Date.now() + 30 * 24 * 60 * 60 * 1000,
        referredByClientId: body.referredByClientId,
      });
      return json({ ok: true, clientId });
    } catch (e: any) {
      return json({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// ============================================
// ONBOARDING FORM SUBMIT (PUBLIC — client-facing)
// ============================================

function corsJson(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

http.route({
  path: "/reviews/onboarding-submit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // PUBLIC endpoint — no auth (anyone completing onboarding can submit)
    try {
      const body = await request.json();
      const required = [
        "businessName", "ownerFirstName", "ownerLastName", "ownerEmail",
        "ownerPhone", "googleReviewUrl", "signature",
      ];
      for (const k of required) {
        if (!body[k] || typeof body[k] !== "string") {
          return corsJson({ error: `missing_or_invalid: ${k}` }, 400);
        }
      }
      if (!body.consents || typeof body.consents !== "object") {
        return corsJson({ error: "missing_consents" }, 400);
      }
      const allConsents = ["withinYear", "voluntary", "pewc", "notEBR", "indemnify"]
        .every(k => body.consents[k] === true);
      if (!allConsents) {
        return corsJson({ error: "all_consents_required" }, 400);
      }
      const result = await ctx.runMutation(api.onboardings.submit, {
        businessName: body.businessName,
        ownerFirstName: body.ownerFirstName,
        ownerLastName: body.ownerLastName,
        ownerEmail: body.ownerEmail,
        ownerPhone: body.ownerPhone,
        timezone: body.timezone || "America/New_York",
        city: body.city || "",
        googleReviewUrl: body.googleReviewUrl,
        consentMethod: body.consentMethod || "",
        consentDateFrom: body.consentDateFrom || "",
        consentDateTo: body.consentDateTo || "",
        consents: body.consents,
        signature: body.signature,
        csvUrl: body.csvUrl,
      });
      return corsJson(result);
    } catch (e: any) {
      return corsJson({ error: "bad_request", detail: e?.message }, 400);
    }
  }),
});

// CORS preflight for onboarding form
http.route({
  path: "/reviews/onboarding-submit",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

export default http;
