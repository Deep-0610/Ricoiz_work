import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

const DAY_MS = 24 * 60 * 60 * 1000;

// Niche to singular form used in SMS templates (matches docs/review-engine-sms-sequence.md v3).
const NICHE_SINGULAR: Record<string, string> = {
  roofing: "roofing company",
  roofer: "roofing company",
  plumbing: "plumbing company",
  plumber: "plumbing company",
  hvac: "HVAC company",
  electrical: "electrician",
  electrician: "electrician",
  concrete: "concrete company",
  "tree service": "tree service",
  septic: "septic company",
  landscaping: "landscaping company",
  "garage door": "garage door company",
  foundation: "foundation company",
  painting: "painting company",
  "pressure washing": "pressure washing company",
  remodeling: "remodeler",
  "deck builder": "deck builder",
  "junk removal": "junk removal company",
  "general contractor": "general contractor",
  gc: "general contractor",
  dentist: "dentist",
  chiropractor: "chiropractor",
  "med spa": "med spa",
  "auto repair": "auto shop",
  "pest control": "pest control company",
};

function niche2singular(niche: string): string {
  const key = niche.toLowerCase().trim();
  return NICHE_SINGULAR[key] || `${niche} company`;
}

// Bulk ingest scraped leads. Dedups by phone (E.164).
// Returns { inserted, skipped_dup, skipped_bad }.
export const bulkIngest = mutation({
  args: {
    leads: v.array(
      v.object({
        businessName: v.string(),
        ownerFirstName: v.optional(v.string()),
        ownerLastName: v.optional(v.string()),
        phone: v.string(),
        email: v.optional(v.string()),
        city: v.string(),
        state: v.optional(v.string()),
        niche: v.string(),
        googleReviewCount: v.optional(v.number()),
        googleRating: v.optional(v.number()),
        googleReviewUrl: v.optional(v.string()),
        googlePlaceId: v.optional(v.string()),
        topCompetitorName: v.optional(v.string()),
        topCompetitorReviewCount: v.optional(v.number()),
        source: v.string(),
      })
    ),
  },
  handler: async (ctx, { leads }) => {
    const now = Date.now();
    let inserted = 0;
    let skipped_dup = 0;
    let skipped_bad = 0;
    const inserted_ids: Id<"reviewSalesLeads">[] = [];

    for (const l of leads) {
      // Basic validation
      if (!l.phone || !l.phone.startsWith("+") || l.phone.length < 10) {
        skipped_bad++;
        continue;
      }

      // Dedup by phone
      const existing = await ctx.db
        .query("reviewSalesLeads")
        .withIndex("by_phone", (q) => q.eq("phone", l.phone))
        .first();
      if (existing) {
        skipped_dup++;
        continue;
      }

      const id = await ctx.db.insert("reviewSalesLeads", {
        ...l,
        nicheSingular: niche2singular(l.niche),
        status: "new",
        smsCount: 0,
        smsError: false,
        sourceScrapedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      inserted_ids.push(id);
      inserted++;
    }

    return { inserted, skipped_dup, skipped_bad, insertedIds: inserted_ids };
  },
});

// Get next batch for outbound (Touch 1). Assigns sender + marks as pushed_pending.
// Filters: status="new", has phone, review count in sweet spot 10-100.
// Assigns senders via round-robin from active pool respecting daily caps.
export const dailyBatch = query({
  args: {
    limit: v.optional(v.number()),
    minReviews: v.optional(v.number()),
    maxReviews: v.optional(v.number()),
    niche: v.optional(v.string()),
  },
  handler: async (ctx, { limit, minReviews, maxReviews, niche }) => {
    const cap = limit ?? 100;
    const minR = minReviews ?? 10;
    const maxR = maxReviews ?? 100;

    const nowResetBoundary = Date.now() - DAY_MS;
    const senders = await ctx.db
      .query("reviewSalesSenders")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const availableSenders = senders.filter((s) => {
      const resetIfNeeded =
        s.sentTodayResetAt < nowResetBoundary ? 0 : s.sentToday;
      return resetIfNeeded < s.dailyCap;
    });
    const totalDailyRemaining = availableSenders.reduce((sum, s) => {
      const st = s.sentTodayResetAt < nowResetBoundary ? 0 : s.sentToday;
      return sum + Math.max(0, s.dailyCap - st);
    }, 0);
    const effectiveCap = Math.min(cap, totalDailyRemaining);

    const query = niche
      ? ctx.db
          .query("reviewSalesLeads")
          .withIndex("by_niche_status", (q) => q.eq("niche", niche).eq("status", "new"))
      : ctx.db
          .query("reviewSalesLeads")
          .withIndex("by_status", (q) => q.eq("status", "new"));

    const candidates = await query.order("asc").take(effectiveCap * 3);
    const filtered = candidates
      .filter((c) => {
        if (c.googleReviewCount === undefined) return true;
        return c.googleReviewCount >= minR && c.googleReviewCount <= maxR;
      })
      .slice(0, effectiveCap);

    return {
      count: filtered.length,
      totalDailyRemaining,
      leads: filtered.map((c) => ({
        id: c._id,
        businessName: c.businessName,
        ownerFirstName: c.ownerFirstName ?? "",
        phone: c.phone,
        email: c.email ?? "",
        city: c.city,
        state: c.state ?? "",
        niche: c.niche,
        nicheSingular: c.nicheSingular ?? niche2singular(c.niche),
        googleReviewCount: c.googleReviewCount ?? null,
        googleRating: c.googleRating ?? null,
        googleReviewUrl: c.googleReviewUrl ?? null,
        googlePlaceId: c.googlePlaceId ?? null,
        topCompetitorName: c.topCompetitorName ?? null,
        topCompetitorReviewCount: c.topCompetitorReviewCount ?? null,
      })),
    };
  },
});

// Assign a specific sender to a lead, atomically bump sentToday.
// n8n calls this once per lead as it pushes to Close.
export const assignSender = mutation({
  args: { leadId: v.id("reviewSalesLeads") },
  handler: async (ctx, { leadId }) => {
    const now = Date.now();
    const nowResetBoundary = now - DAY_MS;

    const senders = await ctx.db
      .query("reviewSalesSenders")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // SEQUENTIAL-FILL logic (matches Voltaris WF-NW-02 AI1..AI11).
    // Sort by label (AI1, AI2, ... AI7) so we fill AI1 to cap FIRST, then AI2, etc.
    // This preserves carrier reputation on established senders.
    const sorted = senders.slice().sort((a, b) => {
      const la = (a.label || "").padStart(10, "0");
      const lb = (b.label || "").padStart(10, "0");
      return la.localeCompare(lb);
    });

    let best: Doc<"reviewSalesSenders"> | null = null;
    let bestRemaining = 0;
    for (const s of sorted) {
      const st = s.sentTodayResetAt < nowResetBoundary ? 0 : s.sentToday;
      const remaining = s.dailyCap - st;
      if (remaining > 0) {
        best = s;
        bestRemaining = remaining;
        break; // First sender with capacity wins (sequential-fill)
      }
    }
    if (!best) {
      return { ok: false, error: "no_sender_capacity" };
    }

    // Bump sender + assign to lead
    const st = best.sentTodayResetAt < nowResetBoundary ? 0 : best.sentToday;
    await ctx.db.patch(best._id, {
      sentToday: st + 1,
      sentTodayResetAt: best.sentTodayResetAt < nowResetBoundary ? now : best.sentTodayResetAt,
    });
    await ctx.db.patch(leadId, {
      assignedSenderPhone: best.phone,
      updatedAt: now,
    });

    return { ok: true, senderPhone: best.phone };
  },
});

// After Close /lead POST succeeds, record IDs.
export const markPushed = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    closeLeadId: v.string(),
    closeContactId: v.optional(v.string()),
    track: v.optional(v.union(v.literal("old"), v.literal("new"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.leadId, {
      status: "pushed",
      closeLeadId: args.closeLeadId,
      closeContactId: args.closeContactId,
      // Set track when SL-01 pushes to Close (defaults to "new" for future leads)
      track: args.track ?? "new",
      updatedAt: now,
    });
    return { ok: true };
  },
});

// After SMS Touch N send, record + schedule next touch.
export const recordSms = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    touchNumber: v.number(), // 1 / 2 / 3 / 4
    closeActivityId: v.optional(v.string()),
    text: v.string(),
    senderPhone: v.optional(v.string()),
    variant: v.optional(v.string()), // v5: T1 variant "V1"|"V2"|"V3"; T4 variant "V1"|"V2"|"V3"|"V4"
  },
  handler: async (ctx, { leadId, touchNumber, closeActivityId, text, senderPhone, variant }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return { ok: false, error: "not_found" };

    const now = Date.now();
    // v5 cadence: T1 + 2d = T2 (audit link), T2 + 3d = T3, T3 + 2d = T4.
    const gapDays: Record<number, number> = { 1: 2, 2: 3, 3: 2, 4: 0 };
    const nextTouchAt =
      touchNumber < 4 ? now + gapDays[touchNumber] * DAY_MS : undefined;

    const statusMap: Record<number, string> = {
      1: "t1_sent",
      2: "t2_sent",
      3: "t3_sent",
      4: "t4_sent",
    };

    const patch: any = {
      status: statusMap[touchNumber] ?? lead.status,
      smsCount: (lead.smsCount ?? 0) + 1,
      lastSmsAt: now,
      nextTouchAt,
      updatedAt: now,
    };
    // v5: stamp variant tag on the correct touch column so replies attribute to the right test cell.
    if (variant && touchNumber === 1) patch.t1Variant = variant;
    if (variant && touchNumber === 4) patch.t4Variant = variant;
    // v5: Touch 2 is the audit-link send from SL-02. Set demoSentAt so behavior follow-ups
    // (REV-FU-1 3h no-click / REV-FU-2 1h post-view) can pick this lead up. Both queries
    // index on by_demo_sent, so without this stamp, SL-02 Touch 2 sends never trigger nudges.
    // Only set once — never overwrite if manual WF-REV-DEMO-SEND already set it.
    if (touchNumber === 2 && !lead.demoSentAt) {
      patch.demoSentAt = now;
      if (senderPhone) patch.demoSenderPhone = senderPhone;
      if (closeActivityId) patch.demoCloseActivityId = closeActivityId;
    }

    await ctx.db.patch(leadId, patch);

    // Increment the sending number's daily count so "Assign Senders" rotates.
    // Each number sends up to its dailyCap (100), then the next run skips to the
    // next number. Without this, every run saw 0 and dumped everything on phone #1.
    if (senderPhone) {
      const boundary = now - DAY_MS;
      const allSenders = await ctx.db.query("reviewSalesSenders").collect();
      const sender = allSenders.find((s) => s.phone === senderPhone);
      if (sender) {
        const st = sender.sentTodayResetAt < boundary ? 0 : sender.sentToday;
        await ctx.db.patch(sender._id, {
          sentToday: st + 1,
          sentTodayResetAt: sender.sentTodayResetAt < boundary ? now : sender.sentTodayResetAt,
        });
      }
    }

    await ctx.db.insert("reviewSalesSmsActivity", {
      leadId,
      closeLeadId: lead.closeLeadId,
      direction: "outbound",
      touchNumber,
      senderPhone: senderPhone ?? lead.assignedSenderPhone,
      recipientPhone: lead.phone,
      text,
      sentAt: now,
      closeActivityId,
    });

    return { ok: true };
  },
});

// Get leads due for followup Touch 2/3/4.
// Filters: status IN (pushed, t1_sent, t2_sent, t3_sent), nextTouchAt <= now,
//          not opted out, not replied, not in HUMAN_HAND / closed status.
export const followupBatch = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = limit ?? 100;
    const now = Date.now();

    const eligibleStatuses = ["t1_sent", "t2_sent", "t3_sent"];
    const results: any[] = [];

    for (const s of eligibleStatuses) {
      const rows = await ctx.db
        .query("reviewSalesLeads")
        .withIndex("by_status_next_touch", (q) =>
          q.eq("status", s).lte("nextTouchAt", now)
        )
        .take(cap - results.length);

      for (const r of rows) {
        if (results.length >= cap) break;
        const nextTouch =
          r.status === "t1_sent"
            ? 2
            : r.status === "t2_sent"
              ? 3
              : r.status === "t3_sent"
                ? 4
                : 0;
        if (!nextTouch) continue;
        results.push({
          id: r._id,
          closeLeadId: r.closeLeadId,
          businessName: r.businessName,
          ownerFirstName: r.ownerFirstName ?? "",
          phone: r.phone,
          city: r.city,
          niche: r.niche,
          nicheSingular: r.nicheSingular ?? niche2singular(r.niche),
          assignedSenderPhone: r.assignedSenderPhone,
          nextTouch,
          smsCount: r.smsCount,
          // v5: dual-track routing — SL-02 uses this to pick OLD vs NEW Close credential
          track: r.track ?? "old",
        });
      }
    }

    return { count: results.length, leads: results };
  },
});

// Log arbitrary activity (used by delivery-cleanup and reply-classifier flows too).
export const logActivity = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    direction: v.string(),
    touchNumber: v.optional(v.number()),
    senderPhone: v.optional(v.string()),
    recipientPhone: v.string(),
    text: v.string(),
    closeActivityId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    await ctx.db.insert("reviewSalesSmsActivity", {
      ...args,
      closeLeadId: lead?.closeLeadId,
      sentAt: Date.now(),
    });
    return { ok: true };
  },
});

// Leads pending delivery status check: recently sent (last 24h), phoneType=unknown.
export const deliveryCheckBatch = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = limit ?? 50;
    const now = Date.now();
    const cutoff = now - DAY_MS;

    const rows = await ctx.db
      .query("reviewSalesLeads")
      .withIndex("by_status_next_touch")
      .take(500);
    const filtered = rows
      .filter(
        (r) =>
          (r.phoneType === undefined || r.phoneType === "unknown") &&
          r.lastSmsAt !== undefined &&
          r.lastSmsAt > cutoff &&
          r.closeLeadId
      )
      .slice(0, cap);

    return {
      count: filtered.length,
      leads: filtered.map((r) => ({
        id: r._id,
        closeLeadId: r.closeLeadId,
        phone: r.phone,
      })),
    };
  },
});

// Update phone type after delivery check.
export const setPhoneType = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    phoneType: v.string(), // "mobile" / "landline"
  },
  handler: async (ctx, { leadId, phoneType }) => {
    await ctx.db.patch(leadId, {
      phoneType,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// Move landline / bad-number leads out of pipeline.
export const moveToError = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    reason: v.string(), // "landline" / "unknown_carrier" / "invalid"
  },
  handler: async (ctx, { leadId, reason }) => {
    await ctx.db.patch(leadId, {
      status: reason === "landline" ? "landline" : "bad_number",
      smsError: true,
      nextTouchAt: undefined,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// AI classifier writes back after inbound reply.
export const updateStatus = mutation({
  args: {
    leadId: v.optional(v.id("reviewSalesLeads")),
    closeLeadId: v.optional(v.string()),
    phone: v.optional(v.string()),
    newStatus: v.string(),
    lastReplyText: v.optional(v.string()),
    lastReplyIntent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let lead: Doc<"reviewSalesLeads"> | null = null;

    if (args.leadId) {
      lead = await ctx.db.get(args.leadId);
    } else if (args.closeLeadId) {
      lead = await ctx.db
        .query("reviewSalesLeads")
        .withIndex("by_close_lead", (q) => q.eq("closeLeadId", args.closeLeadId))
        .first();
    } else if (args.phone) {
      lead = await ctx.db
        .query("reviewSalesLeads")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone!))
        .first();
    }

    if (!lead) return { ok: false, error: "not_found" };

    const now = Date.now();
    await ctx.db.patch(lead._id, {
      status: args.newStatus,
      lastReplyText: args.lastReplyText,
      lastReplyAt: args.lastReplyText ? now : lead.lastReplyAt,
      lastReplyIntent: args.lastReplyIntent,
      nextTouchAt: undefined, // stop the cadence
      updatedAt: now,
    });
    return { ok: true, leadId: lead._id };
  },
});

// Queries the auto-website /api/run-follow-ups-audit endpoint uses to fetch
// leads that need a 3-hour no-click nudge. Ported from auto-website's
// demos.getPendingFollowUp1 pattern.
// Criteria: demoSentAt <= thresholdMs, no audit click, no followup1 yet.
export const getPendingAuditFollowUp1 = query({
  args: { thresholdMs: v.number() },
  handler: async (ctx, { thresholdMs }) => {
    // We can't index on demoSentAt directly with by_demo_sent + range, so scan
    // demo-sent leads (small set) and filter.
    const leads = await ctx.db
      .query("reviewSalesLeads")
      .withIndex("by_demo_sent", (q) => q.gt("demoSentAt", 0))
      .order("desc")
      .take(500);
    return leads
      .filter(
        (l) =>
          (l.demoSentAt ?? 0) > 0 &&
          (l.demoSentAt ?? 0) <= thresholdMs &&
          !l.auditFirstClickedAt &&
          !l.auditFollowup1SentAt
      )
      .map((l) => ({
        leadId: l._id,
        closeLeadId: l.closeLeadId,
        businessName: l.businessName,
        city: l.city,
        state: l.state ?? "",
        remotePhone: l.phone,
        localPhone: l.demoSenderPhone ?? l.assignedSenderPhone,
        demoSentAt: l.demoSentAt ?? 0,
        // Dual-track routing
        track: l.track ?? "old",
      }));
  },
});

// Queries for the 1-hour post-view no-reply nudge.
// Criteria: auditFirstClickedAt <= thresholdMs, no followup2 yet.
// Reply check happens at run time (auto-website route checks Close SMS history).
export const getPendingAuditFollowUp2 = query({
  args: { thresholdMs: v.number() },
  handler: async (ctx, { thresholdMs }) => {
    const leads = await ctx.db
      .query("reviewSalesLeads")
      .withIndex("by_demo_sent", (q) => q.gt("demoSentAt", 0))
      .order("desc")
      .take(500);
    return leads
      .filter(
        (l) =>
          (l.auditFirstClickedAt ?? 0) > 0 &&
          (l.auditFirstClickedAt ?? 0) <= thresholdMs &&
          !l.auditFollowup2SentAt
      )
      .map((l) => ({
        leadId: l._id,
        closeLeadId: l.closeLeadId,
        businessName: l.businessName,
        city: l.city,
        state: l.state ?? "",
        remotePhone: l.phone,
        localPhone: l.demoSenderPhone ?? l.assignedSenderPhone,
        auditClickedAt: l.auditFirstClickedAt ?? 0,
        // Dual-track routing
        track: l.track ?? "old",
      }));
  },
});

// Called by the API route after successfully sending the follow-up SMS.
export const markAuditFollowup1Sent = mutation({
  args: { leadId: v.id("reviewSalesLeads"), sentAt: v.number() },
  handler: async (ctx, { leadId, sentAt }) => {
    await ctx.db.patch(leadId, { auditFollowup1SentAt: sentAt, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const markAuditFollowup2Sent = mutation({
  args: { leadId: v.id("reviewSalesLeads"), sentAt: v.number() },
  handler: async (ctx, { leadId, sentAt }) => {
    await ctx.db.patch(leadId, { auditFollowup2SentAt: sentAt, updatedAt: Date.now() });
    return { ok: true };
  },
});

// Called by WF-REV-DEMO-SEND after Close SMS API succeeds. Records that we sent
// the demo link SMS to this lead so the dashboard can show sent-but-not-clicked leads.
export const recordDemoSent = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    senderPhone: v.string(),
    closeActivityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return { ok: false, error: "not_found" };
    const now = Date.now();
    await ctx.db.patch(lead._id, {
      demoSentAt: now,
      demoSenderPhone: args.senderPhone,
      demoCloseActivityId: args.closeActivityId,
      updatedAt: now,
    });
    return { ok: true, leadId: lead._id };
  },
});

// Admin: bulk-import city-level competitors. Idempotent — upserts by (city,niche).
// Used once after scraping the top roofer per city; every reviewSalesLead in that
// city then shares this one competitor reference (no per-lead scrape cost).
export const bulkImportCityCompetitors = mutation({
  args: {
    entries: v.array(
      v.object({
        city: v.string(),
        state: v.string(),
        niche: v.string(),
        competitorName: v.string(),
        competitorReviewCount: v.number(),
        competitorRating: v.optional(v.number()),
        competitorWebsite: v.optional(v.string()),
        competitorPhone: v.optional(v.string()),
        competitorAddress: v.optional(v.string()),
        competitorPlaceId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { entries }) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;
    for (const e of entries) {
      const cityKey = e.city.trim();
      const nicheKey = e.niche.toLowerCase().trim();
      // Find existing by (city, niche) via index
      const existing = await ctx.db
        .query("reviewCityCompetitors")
        .withIndex("by_city_niche", (q) => q.eq("city", cityKey).eq("niche", nicheKey))
        .first();
      const payload = {
        city: cityKey,
        state: e.state,
        niche: nicheKey,
        competitorName: e.competitorName,
        competitorReviewCount: e.competitorReviewCount,
        competitorRating: e.competitorRating,
        competitorWebsite: e.competitorWebsite,
        competitorPhone: e.competitorPhone,
        competitorAddress: e.competitorAddress,
        competitorPlaceId: e.competitorPlaceId,
        updatedAt: now,
      };
      if (existing) {
        await ctx.db.patch(existing._id, payload);
        updated++;
      } else {
        await ctx.db.insert("reviewCityCompetitors", payload);
        inserted++;
      }
    }
    return { ok: true, inserted, updated, total: entries.length };
  },
});

// Admin: set a sender's sentToday count directly (backfill / correction).
export const setSenderToday = mutation({
  args: { phone: v.string(), sentToday: v.number() },
  handler: async (ctx, { phone, sentToday }) => {
    const all = await ctx.db.query("reviewSalesSenders").collect();
    const s = all.find((x) => x.phone === phone);
    if (!s) return { ok: false, error: "sender_not_found", phone };
    await ctx.db.patch(s._id, { sentToday, sentTodayResetAt: Date.now() });
    return { ok: true, phone, sentToday };
  },
});

// ── V2 opener second-text queue ──────────────────────────────────────────────
// SL-01 sends text_1 then queues text_2 here (dueAt = now+3min). A cron drains it.
export const queueV2SecondText = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    closeLeadId: v.string(),
    senderPhone: v.string(),
    recipientPhone: v.string(),
    text: v.string(),
    track: v.optional(v.string()),
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const now = Date.now();
    const id = await ctx.db.insert("reviewV2Queue", {
      leadId: a.leadId,
      closeLeadId: a.closeLeadId,
      senderPhone: a.senderPhone,
      recipientPhone: a.recipientPhone,
      text: a.text,
      track: a.track ?? "new",
      dueAt: now + (a.delayMs ?? 3 * 60 * 1000),
      sent: false,
      createdAt: now,
    });
    return { ok: true, id };
  },
});

// Return due, unsent V2 second-texts (batched). Cron sends each then marks sent.
export const dueV2SecondTexts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("reviewV2Queue")
      .withIndex("by_sent_due", (q) => q.eq("sent", false).lte("dueAt", now))
      .take(limit ?? 50);
    return {
      count: rows.length,
      items: rows.map((r) => ({
        id: r._id,
        leadId: r.leadId,
        closeLeadId: r.closeLeadId,
        senderPhone: r.senderPhone,
        recipientPhone: r.recipientPhone,
        text: r.text,
        track: r.track ?? "new",
      })),
    };
  },
});

export const markV2Sent = mutation({
  args: { id: v.id("reviewV2Queue"), closeActivityId: v.optional(v.string()) },
  handler: async (ctx, { id, closeActivityId }) => {
    await ctx.db.patch(id, { sent: true, sentAt: Date.now(), closeActivityId });
    return { ok: true };
  },
});

// Admin: set the 5-6 shared competitor POOL per (city, niche). Upserts by (city,niche).
// Every lead in that city+niche later picks from this same pool the competitor that
// best fits its own review gap. No per-lead data, no external scraping.
export const setCityCompetitorPools = mutation({
  args: {
    pools: v.array(
      v.object({
        city: v.string(),
        state: v.string(),
        niche: v.string(),
        competitors: v.array(
          v.object({
            name: v.string(),
            reviewCount: v.number(),
            rating: v.optional(v.number()),
          })
        ),
      })
    ),
  },
  handler: async (ctx, { pools }) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;
    for (const p of pools) {
      const cityKey = p.city.trim();
      const nicheKey = p.niche.toLowerCase().trim();
      const existing = await ctx.db
        .query("reviewCityCompetitors")
        .withIndex("by_city_niche", (q) => q.eq("city", cityKey).eq("niche", nicheKey))
        .first();
      // Top of the pool doubles as the legacy single-competitor fields for back-compat.
      const top = [...p.competitors].sort((a, b) => b.reviewCount - a.reviewCount)[0];
      const payload = {
        city: cityKey,
        state: p.state,
        niche: nicheKey,
        competitorName: top?.name ?? "",
        competitorReviewCount: top?.reviewCount ?? 0,
        competitorRating: top?.rating,
        pool: p.competitors,
        updatedAt: now,
      };
      if (existing) {
        await ctx.db.patch(existing._id, payload);
        updated++;
      } else {
        await ctx.db.insert("reviewCityCompetitors", payload);
        inserted++;
      }
    }
    return { ok: true, inserted, updated, total: pools.length };
  },
});

// Public (no auth): fetch lead's audit data for YOUR_APP_HOST/audit?l=<leadId>.
// Returns lightweight fields only. LeadId is opaque, so this is safe to expose.
export const getAuditData = query({
  args: {
    leadId: v.id("reviewSalesLeads"),
  },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return null;

    // Pick a competitor that's CATCHABLE in 8-16 months with our system.
    // Math: our system adds ~12 reviews/mo, competitor adds ~4/mo, net +8/mo.
    // Ideal gap = 64-128 reviews (8-16 months to close).
    // Sweet spot target = 96 (12 months).
    // Widest acceptable = 32-160 (4-20 months). Anything wider feels impossible.
    const cityKey = (lead.city || "").trim().toLowerCase();
    const leadReviews = lead.googleReviewCount ?? 0;
    const idealMin = leadReviews + 64;    // ~8 months to close
    const idealMax = leadReviews + 128;   // ~16 months to close
    const fallbackMin = leadReviews + 32;    // 4 months
    const fallbackMax = leadReviews + 160;   // 20 months
    let topCompetitor: null | { name: string; count: number; rating?: number } = null;

    const nicheKey = (lead.niche || "").toLowerCase().trim();

    // PRIMARY: the shared 5-6 competitor pool for this (city, niche).
    // Every lead in the city+niche picks from this same pool the competitor that
    // best fits its own gap. Curated, consistent, no per-lead scan.
    if (cityKey && nicheKey) {
      const cityRow = await ctx.db
        .query("reviewCityCompetitors")
        .withIndex("by_city_niche", (q) => q.eq("city", (lead.city || "").trim()).eq("niche", nicheKey))
        .first();
      if (cityRow?.pool && cityRow.pool.length > 0) {
        // Only competitors ranking ABOVE this lead count as "ranking above you".
        // Exclude the lead itself — a re-scrape can list this same business (with a
        // slightly different count) in its own city pool, which would show it vs itself.
        const leadName = (lead.businessName || "").trim().toLowerCase();
        const above = cityRow.pool.filter(
          (c) => c.reviewCount > leadReviews && c.name.trim().toLowerCase() !== leadName
        );
        if (above.length > 0) {
          const idealTarget = leadReviews + 96; // ~12 months to close
          above.sort(
            (a, b) => Math.abs(a.reviewCount - idealTarget) - Math.abs(b.reviewCount - idealTarget)
          );
          const best = above[0];
          topCompetitor = { name: best.name, count: best.reviewCount, rating: best.rating };
        }
      }
    }

    // FALLBACK (only if the pool gave nothing): live cohort scan of other leads.
    if (!topCompetitor && cityKey && lead.niche) {
      // Pool = other leads in the same city+niche with higher review counts.
      // These are the businesses actually ranking above the prospect in Google Maps.
      const sameNicheLeads = await ctx.db
        .query("reviewSalesLeads")
        .withIndex("by_niche_status", (q) => q.eq("niche", lead.niche))
        .collect();
      const sameCity = sameNicheLeads.filter(
        (l) =>
          l._id !== lead._id &&
          (l.city || "").trim().toLowerCase() === cityKey &&
          (l.googleReviewCount ?? 0) > leadReviews
      );

      // 1. Try IDEAL range (catchable in 7-12 months).
      let pool = sameCity.filter(
        (l) =>
          (l.googleReviewCount ?? 0) >= idealMin &&
          (l.googleReviewCount ?? 0) <= idealMax
      );

      // 2. Widen to 3-18 month gap if no ideal match.
      if (pool.length === 0) {
        pool = sameCity.filter(
          (l) =>
            (l.googleReviewCount ?? 0) >= fallbackMin &&
            (l.googleReviewCount ?? 0) <= fallbackMax
        );
      }

      // 3. Last resort: any lead with higher review count.
      if (pool.length === 0) {
        pool = sameCity;
      }

      if (pool.length > 0) {
        // Pick the one CLOSEST to ideal target (leadReviews + 96 = ~12 months).
        const idealTarget = leadReviews + 96;
        pool.sort(
          (a, b) =>
            Math.abs((a.googleReviewCount ?? 0) - idealTarget) -
            Math.abs((b.googleReviewCount ?? 0) - idealTarget)
        );
        const best = pool[0];
        topCompetitor = {
          name: best.businessName,
          count: best.googleReviewCount ?? 0,
          rating: best.googleRating,
        };
      }

      // 4. Final fallback: city competitor table (only if no cohort match at all).
      // MUST rank strictly ABOVE this lead and not be the lead itself — otherwise a
      // top-of-market lead would fabricate a zero-gap "competitor" (even itself).
      if (!topCompetitor) {
        const cityRow = await ctx.db
          .query("reviewCityCompetitors")
          .withIndex("by_city_niche", (q) => q.eq("city", lead.city || "").eq("niche", (lead.niche || "").toLowerCase().trim()))
          .first();
        if (
          cityRow &&
          cityRow.competitorReviewCount > leadReviews &&
          cityRow.competitorName.trim().toLowerCase() !== (lead.businessName || "").trim().toLowerCase()
        ) {
          topCompetitor = {
            name: cityRow.competitorName,
            count: cityRow.competitorReviewCount,
            rating: cityRow.competitorRating,
          };
        }
      }
    }

    return {
      id: lead._id,
      businessName: lead.businessName,
      city: lead.city,
      state: lead.state ?? "",
      niche: lead.niche,
      nicheSingular: lead.nicheSingular ?? "",
      ownerFirstName: lead.ownerFirstName ?? "",
      googleReviewCount: lead.googleReviewCount ?? null,
      googleRating: lead.googleRating ?? null,
      googleReviewUrl: lead.googleReviewUrl ?? null,
      // Dual-track routing: consumers use this to pick old vs new credential.
      track: lead.track ?? "old",
      // Derived per city instead of per lead — cheap and reuses existing scrape data.
      topCompetitorName: topCompetitor?.name ?? lead.topCompetitorName ?? null,
      topCompetitorReviewCount: topCompetitor?.count ?? lead.topCompetitorReviewCount ?? null,
    };
  },
});

// Public (no auth): tracked audit-page click from YOUR_APP_HOST/audit?l=<leadId>.
// Same idempotent pattern as trackDemoClick.
export const trackAuditClick = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
  },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return { ok: false, error: "not_found" };
    const now = Date.now();
    await ctx.db.patch(lead._id, {
      auditFirstClickedAt: lead.auditFirstClickedAt ?? now,
      auditLastClickedAt: now,
      auditClickCount: (lead.auditClickCount ?? 0) + 1,
      updatedAt: now,
    });
    return { ok: true, firstClick: !lead.auditFirstClickedAt };
  },
});

// Public (no auth): tracked demo-video click from YOUR_APP_HOST/watch?l=<leadId>.
// Idempotent — first click stamps demoFirstClickedAt; every click bumps count + lastClickedAt.
// Fire-and-forget from browser JS on page mount.
export const trackDemoClick = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
  },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return { ok: false, error: "not_found" };
    const now = Date.now();
    await ctx.db.patch(lead._id, {
      demoFirstClickedAt: lead.demoFirstClickedAt ?? now,
      demoLastClickedAt: now,
      demoClickCount: (lead.demoClickCount ?? 0) + 1,
      updatedAt: now,
    });
    return { ok: true, firstClick: !lead.demoFirstClickedAt };
  },
});

// Dashboard: list all leads that have been pushed to Close, with click status.
// Returns lightweight rows (no huge fields).
export const salesClicksDashboard = query({
  args: {
    limit: v.optional(v.number()),
    onlyClicked: v.optional(v.boolean()),
  },
  handler: async (ctx, { limit, onlyClicked }) => {
    const cap = limit ?? 500;
    // Use index: pull leads with demoSentAt set (i.e. we sent them a demo SMS).
    // Ordered descending on demoSentAt so newest sends appear first.
    const leads = await ctx.db
      .query("reviewSalesLeads")
      .withIndex("by_demo_sent", (q) => q.gt("demoSentAt", 0))
      .order("desc")
      .take(cap);
    const filtered = onlyClicked ? leads.filter((l) => !!l.demoFirstClickedAt) : leads;

    const rows = filtered.map((l) => ({
      id: l._id,
      businessName: l.businessName,
      city: l.city,
      state: l.state ?? "",
      niche: l.niche,
      phone: l.phone,
      status: l.status,
      smsCount: l.smsCount,
      lastSmsAt: l.lastSmsAt ?? null,
      demoSentAt: l.demoSentAt ?? null,
      demoSenderPhone: l.demoSenderPhone ?? null,
      demoClicked: !!l.demoFirstClickedAt,
      demoFirstClickedAt: l.demoFirstClickedAt ?? null,
      demoLastClickedAt: l.demoLastClickedAt ?? null,
      demoClickCount: l.demoClickCount ?? 0,
      closeLeadId: l.closeLeadId ?? null,
    }));

    const totals = {
      total: rows.length,
      clicked: rows.filter((r) => r.demoClicked).length,
      notClicked: rows.filter((r) => !r.demoClicked).length,
    };

    return { totals, rows };
  },
});

// Admin one-shot: backfill track="old" on all leads that have been pushed to Close
// but don't have track set yet. Run once during dual-track migration.
export const bulkBackfillTrack = mutation({
  args: {
    track: v.union(v.literal("old"), v.literal("new")),
    onlyWithCloseLeadId: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("reviewSalesLeads").collect();
    let patched = 0;
    let skipped = 0;
    for (const lead of all) {
      // Only backfill leads that don't have track yet
      if (lead.track) { skipped++; continue; }
      // Optionally require closeLeadId (means they've been contacted)
      if (args.onlyWithCloseLeadId && !lead.closeLeadId) { skipped++; continue; }
      await ctx.db.patch(lead._id, { track: args.track, updatedAt: Date.now() });
      patched++;
    }
    return { ok: true, patched, skipped, total: all.length };
  },
});

// Admin: fix a lead's niche + nicheSingular (used to correct scraper misclassifications).
export const updateNiche = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    niche: v.string(),
    nicheSingular: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return { ok: false, error: "not_found" };
    await ctx.db.patch(lead._id, {
      niche: args.niche,
      nicheSingular: args.nicheSingular ?? niche2singular(args.niche),
      updatedAt: Date.now(),
    });
    return { ok: true, leadId: lead._id, niche: args.niche };
  },
});

// Reset leads with a specific status back to status=new.
// Used when a simulation touched a lead without setting a close_lead_id.
export const resetByStatus = mutation({
  args: { status: v.string() },
  handler: async (ctx, { status }) => {
    if (status === "new") return { ok: false, error: "already_new" };
    const rows = await ctx.db
      .query("reviewSalesLeads")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect();
    let reset = 0;
    for (const r of rows) {
      // Only reset if no real close_lead_id set (safety guard)
      if (r.closeLeadId && !r.closeLeadId.startsWith("lead_")) continue;
      await ctx.db.patch(r._id, {
        status: "new",
        closeLeadId: undefined,
        closeContactId: undefined,
        assignedSenderPhone: undefined,
        phoneType: undefined,
        smsCount: 0,
        lastSmsAt: undefined,
        nextTouchAt: undefined,
        smsError: false,
        updatedAt: Date.now(),
      });
      reset++;
    }
    return { ok: true, reset };
  },
});

// Reset leads with test/fake close_lead_ids back to status=new.
// Used to undo simulation touches. Only resets leads with closeLeadId prefixes.
export const resetSimulatedLeads = mutation({
  args: {},
  handler: async (ctx) => {
    const PREFIXES = ["lead_fake_", "lead_sim_", "lead_stop_", "lead_pos_"];
    const all = await ctx.db.query("reviewSalesLeads").collect();
    let reset = 0;
    for (const r of all) {
      const cid = r.closeLeadId || "";
      if (PREFIXES.some((p) => cid.startsWith(p))) {
        await ctx.db.patch(r._id, {
          status: "new",
          closeLeadId: undefined,
          closeContactId: undefined,
          assignedSenderPhone: undefined,
          phoneType: undefined,
          smsCount: 0,
          lastSmsAt: undefined,
          nextTouchAt: undefined,
          lastReplyText: undefined,
          lastReplyAt: undefined,
          lastReplyIntent: undefined,
          smsError: false,
          updatedAt: Date.now(),
        });
        reset++;
      }
    }
    return { ok: true, reset };
  },
});

// Delete leads matching a specific source (used for test cleanup only).
export const deleteBySource = mutation({
  args: { source: v.string() },
  handler: async (ctx, { source }) => {
    if (!source || source.length < 3) return { ok: false, error: "bad_source" };
    const ALLOWED = ["test_scrape", "v3_test", "manual_test", "test"];
    if (!ALLOWED.includes(source)) {
      return { ok: false, error: "not_a_test_source", allowed: ALLOWED };
    }
    const rows = await ctx.db.query("reviewSalesLeads").collect();
    const matching = rows.filter((r) => r.source === source);
    let deleted = 0;
    for (const r of matching) {
      await ctx.db.delete(r._id);
      deleted++;
    }
    return { ok: true, deleted, source };
  },
});

// Admin: reset audit click tracking on a lead (used to clean up test clicks before production activation).
export const resetAuditClicks = mutation({
  args: { leadId: v.id("reviewSalesLeads") },
  handler: async (ctx, { leadId }) => {
    await ctx.db.patch(leadId, {
      auditFirstClickedAt: undefined,
      auditLastClickedAt: undefined,
      auditClickCount: 0,
      auditFollowup1SentAt: undefined,
      auditFollowup2SentAt: undefined,
      demoSentAt: undefined,
      demoSenderPhone: undefined,
      demoCloseActivityId: undefined,
      demoFirstClickedAt: undefined,
      demoLastClickedAt: undefined,
      demoClickCount: 0,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// Admin: restore a lead to "T1 sent, T2 pending" state (used after test recordSms bumps state).
export const restoreToT1Sent = mutation({
  args: { leadId: v.id("reviewSalesLeads") },
  handler: async (ctx, { leadId }) => {
    const now = Date.now();
    await ctx.db.patch(leadId, {
      status: "t1_sent",
      smsCount: 1,
      // Set nextTouchAt to now - 1 hour so it's immediately eligible for T2 pickup by SL-02
      nextTouchAt: now - 3600 * 1000,
      // Also clear audit + demo tracking so it's fully clean
      auditFirstClickedAt: undefined,
      auditLastClickedAt: undefined,
      auditClickCount: 0,
      auditFollowup1SentAt: undefined,
      auditFollowup2SentAt: undefined,
      demoSentAt: undefined,
      demoSenderPhone: undefined,
      demoCloseActivityId: undefined,
      updatedAt: now,
    });
    return { ok: true };
  },
});

// TEST-ONLY: log a mock SMS send so we can inspect what would have been sent.
export const recordMockSmsSend = mutation({
  args: {
    leadId: v.string(),
    localPhone: v.string(),
    remotePhone: v.string(),
    text: v.string(),
    mockActivityId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("mockSmsSends", { ...args, at: Date.now() });
    return { ok: true };
  },
});

export const listMockSmsSends = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db.query("mockSmsSends").withIndex("by_at").order("desc").take(limit ?? 20);
  },
});

export const clearMockSmsSends = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("mockSmsSends").collect();
    for (const r of rows) await ctx.db.delete(r._id);
    return { ok: true, cleared: rows.length };
  },
});

// Admin: lightweight list of every lead (id, name, niche, status) for audits.
export const listAllBasic = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("reviewSalesLeads").collect();
    return rows.map(r => ({
      id: r._id,
      closeLeadId: r.closeLeadId ?? null,
      phone: r.phone,
      businessName: r.businessName,
      niche: r.niche,
      city: r.city,
      state: r.state ?? null,
      hasCompetitor: !!(r.topCompetitorName && r.topCompetitorReviewCount != null),
      googlePlaceId: r.googlePlaceId ?? null,
      googleReviewCount: r.googleReviewCount ?? null,
      nicheSingular: r.nicheSingular ?? null,
      status: r.status,
      city: r.city,
    }));
  },
});

// Read a single lead's full record.
export const getById = query({
  args: { leadId: v.id("reviewSalesLeads") },
  handler: async (ctx, { leadId }) => {
    return await ctx.db.get(leadId);
  },
});

// Read by Close CRM lead id.
export const getByCloseLeadId = query({
  args: { closeLeadId: v.string() },
  handler: async (ctx, { closeLeadId }) => {
    return await ctx.db
      .query("reviewSalesLeads")
      .withIndex("by_close_lead", (q) => q.eq("closeLeadId", closeLeadId))
      .first();
  },
});
