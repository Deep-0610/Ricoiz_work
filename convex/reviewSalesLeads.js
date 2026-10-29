import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
const DAY_MS = 24 * 60 * 60 * 1e3;
const NICHE_SINGULAR = {
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
  "pest control": "pest control company"
};
function niche2singular(niche) {
  const key = niche.toLowerCase().trim();
  return NICHE_SINGULAR[key] || `${niche} company`;
}
const bulkIngest = mutation({
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
        source: v.string()
      })
    )
  },
  handler: async (ctx, { leads }) => {
    const now = Date.now();
    let inserted = 0;
    let skipped_dup = 0;
    let skipped_bad = 0;
    const inserted_ids = [];
    for (const l of leads) {
      if (!l.phone || !l.phone.startsWith("+") || l.phone.length < 10) {
        skipped_bad++;
        continue;
      }
      const existing = await ctx.db.query("reviewSalesLeads").withIndex("by_phone", (q) => q.eq("phone", l.phone)).first();
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
        updatedAt: now
      });
      inserted_ids.push(id);
      inserted++;
    }
    return { inserted, skipped_dup, skipped_bad, insertedIds: inserted_ids };
  }
});
const dailyBatch = query({
  args: {
    limit: v.optional(v.number()),
    minReviews: v.optional(v.number()),
    maxReviews: v.optional(v.number()),
    niche: v.optional(v.string())
  },
  handler: async (ctx, { limit, minReviews, maxReviews, niche }) => {
    const cap = limit ?? 100;
    const minR = minReviews ?? 10;
    const maxR = maxReviews ?? 100;
    const nowResetBoundary = Date.now() - DAY_MS;
    const senders = await ctx.db.query("reviewSalesSenders").withIndex("by_active", (q) => q.eq("active", true)).collect();
    const availableSenders = senders.filter((s) => {
      const resetIfNeeded = s.sentTodayResetAt < nowResetBoundary ? 0 : s.sentToday;
      return resetIfNeeded < s.dailyCap;
    });
    const totalDailyRemaining = availableSenders.reduce((sum, s) => {
      const st = s.sentTodayResetAt < nowResetBoundary ? 0 : s.sentToday;
      return sum + Math.max(0, s.dailyCap - st);
    }, 0);
    const effectiveCap = Math.min(cap, totalDailyRemaining);
    const query2 = niche ? ctx.db.query("reviewSalesLeads").withIndex("by_niche_status", (q) => q.eq("niche", niche).eq("status", "new")) : ctx.db.query("reviewSalesLeads").withIndex("by_status", (q) => q.eq("status", "new"));
    const candidates = await query2.order("asc").take(effectiveCap * 3);
    const filtered = candidates.filter((c) => {
      if (c.googleReviewCount === void 0) return true;
      return c.googleReviewCount >= minR && c.googleReviewCount <= maxR;
    }).slice(0, effectiveCap);
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
        topCompetitorReviewCount: c.topCompetitorReviewCount ?? null
      }))
    };
  }
});
const assignSender = mutation({
  args: { leadId: v.id("reviewSalesLeads") },
  handler: async (ctx, { leadId }) => {
    const now = Date.now();
    const nowResetBoundary = now - DAY_MS;
    const senders = await ctx.db.query("reviewSalesSenders").withIndex("by_active", (q) => q.eq("active", true)).collect();
    const sorted = senders.slice().sort((a, b) => {
      const la = (a.label || "").padStart(10, "0");
      const lb = (b.label || "").padStart(10, "0");
      return la.localeCompare(lb);
    });
    let best = null;
    let bestRemaining = 0;
    for (const s of sorted) {
      const st2 = s.sentTodayResetAt < nowResetBoundary ? 0 : s.sentToday;
      const remaining = s.dailyCap - st2;
      if (remaining > 0) {
        best = s;
        bestRemaining = remaining;
        break;
      }
    }
    if (!best) {
      return { ok: false, error: "no_sender_capacity" };
    }
    const st = best.sentTodayResetAt < nowResetBoundary ? 0 : best.sentToday;
    await ctx.db.patch(best._id, {
      sentToday: st + 1,
      sentTodayResetAt: best.sentTodayResetAt < nowResetBoundary ? now : best.sentTodayResetAt
    });
    await ctx.db.patch(leadId, {
      assignedSenderPhone: best.phone,
      updatedAt: now
    });
    return { ok: true, senderPhone: best.phone };
  }
});
const markPushed = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    closeLeadId: v.string(),
    closeContactId: v.optional(v.string()),
    track: v.optional(v.union(v.literal("old"), v.literal("new")))
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.leadId, {
      status: "pushed",
      closeLeadId: args.closeLeadId,
      closeContactId: args.closeContactId,
      // Set track when SL-01 pushes to Close (defaults to "new" for future leads)
      track: args.track ?? "new",
      updatedAt: now
    });
    return { ok: true };
  }
});
const recordSms = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    touchNumber: v.number(),
    // 1 / 2 / 3 / 4
    closeActivityId: v.optional(v.string()),
    text: v.string(),
    senderPhone: v.optional(v.string()),
    variant: v.optional(v.string())
    // v5: T1 variant "V1"|"V2"|"V3"; T4 variant "V1"|"V2"|"V3"|"V4"
  },
  handler: async (ctx, { leadId, touchNumber, closeActivityId, text, senderPhone, variant }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return { ok: false, error: "not_found" };
    const now = Date.now();
    const gapDays = { 1: 2, 2: 3, 3: 2, 4: 0 };
    const nextTouchAt = touchNumber < 4 ? now + gapDays[touchNumber] * DAY_MS : void 0;
    const statusMap = {
      1: "t1_sent",
      2: "t2_sent",
      3: "t3_sent",
      4: "t4_sent"
    };
    const patch = {
      status: statusMap[touchNumber] ?? lead.status,
      smsCount: (lead.smsCount ?? 0) + 1,
      lastSmsAt: now,
      nextTouchAt,
      updatedAt: now
    };
    if (variant && touchNumber === 1) patch.t1Variant = variant;
    if (variant && touchNumber === 4) patch.t4Variant = variant;
    if (touchNumber === 2 && !lead.demoSentAt) {
      patch.demoSentAt = now;
      if (senderPhone) patch.demoSenderPhone = senderPhone;
      if (closeActivityId) patch.demoCloseActivityId = closeActivityId;
    }
    await ctx.db.patch(leadId, patch);
    if (senderPhone) {
      const boundary = now - DAY_MS;
      const allSenders = await ctx.db.query("reviewSalesSenders").collect();
      const sender = allSenders.find((s) => s.phone === senderPhone);
      if (sender) {
        const st = sender.sentTodayResetAt < boundary ? 0 : sender.sentToday;
        await ctx.db.patch(sender._id, {
          sentToday: st + 1,
          sentTodayResetAt: sender.sentTodayResetAt < boundary ? now : sender.sentTodayResetAt
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
      closeActivityId
    });
    return { ok: true };
  }
});
const followupBatch = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = limit ?? 100;
    const now = Date.now();
    const eligibleStatuses = ["t1_sent", "t2_sent", "t3_sent"];
    const results = [];
    for (const s of eligibleStatuses) {
      const rows = await ctx.db.query("reviewSalesLeads").withIndex(
        "by_status_next_touch",
        (q) => q.eq("status", s).lte("nextTouchAt", now)
      ).take(cap - results.length);
      for (const r of rows) {
        if (results.length >= cap) break;
        const nextTouch = r.status === "t1_sent" ? 2 : r.status === "t2_sent" ? 3 : r.status === "t3_sent" ? 4 : 0;
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
          track: r.track ?? "old"
        });
      }
    }
    return { count: results.length, leads: results };
  }
});
const logActivity = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    direction: v.string(),
    touchNumber: v.optional(v.number()),
    senderPhone: v.optional(v.string()),
    recipientPhone: v.string(),
    text: v.string(),
    closeActivityId: v.optional(v.string()),
    error: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    await ctx.db.insert("reviewSalesSmsActivity", {
      ...args,
      closeLeadId: lead?.closeLeadId,
      sentAt: Date.now()
    });
    return { ok: true };
  }
});
const deliveryCheckBatch = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = limit ?? 50;
    const now = Date.now();
    const cutoff = now - DAY_MS;
    const rows = await ctx.db.query("reviewSalesLeads").withIndex("by_status_next_touch").take(500);
    const filtered = rows.filter(
      (r) => (r.phoneType === void 0 || r.phoneType === "unknown") && r.lastSmsAt !== void 0 && r.lastSmsAt > cutoff && r.closeLeadId
    ).slice(0, cap);
    return {
      count: filtered.length,
      leads: filtered.map((r) => ({
        id: r._id,
        closeLeadId: r.closeLeadId,
        phone: r.phone
      }))
    };
  }
});
const setPhoneType = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    phoneType: v.string()
    // "mobile" / "landline"
  },
  handler: async (ctx, { leadId, phoneType }) => {
    await ctx.db.patch(leadId, {
      phoneType,
      updatedAt: Date.now()
    });
    return { ok: true };
  }
});
const moveToError = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    reason: v.string()
    // "landline" / "unknown_carrier" / "invalid"
  },
  handler: async (ctx, { leadId, reason }) => {
    await ctx.db.patch(leadId, {
      status: reason === "landline" ? "landline" : "bad_number",
      smsError: true,
      nextTouchAt: void 0,
      updatedAt: Date.now()
    });
    return { ok: true };
  }
});
const updateStatus = mutation({
  args: {
    leadId: v.optional(v.id("reviewSalesLeads")),
    closeLeadId: v.optional(v.string()),
    phone: v.optional(v.string()),
    newStatus: v.string(),
    lastReplyText: v.optional(v.string()),
    lastReplyIntent: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let lead = null;
    if (args.leadId) {
      lead = await ctx.db.get(args.leadId);
    } else if (args.closeLeadId) {
      lead = await ctx.db.query("reviewSalesLeads").withIndex("by_close_lead", (q) => q.eq("closeLeadId", args.closeLeadId)).first();
    } else if (args.phone) {
      lead = await ctx.db.query("reviewSalesLeads").withIndex("by_phone", (q) => q.eq("phone", args.phone)).first();
    }
    if (!lead) return { ok: false, error: "not_found" };
    const now = Date.now();
    await ctx.db.patch(lead._id, {
      status: args.newStatus,
      lastReplyText: args.lastReplyText,
      lastReplyAt: args.lastReplyText ? now : lead.lastReplyAt,
      lastReplyIntent: args.lastReplyIntent,
      nextTouchAt: void 0,
      // stop the cadence
      updatedAt: now
    });
    return { ok: true, leadId: lead._id };
  }
});
const getPendingAuditFollowUp1 = query({
  args: { thresholdMs: v.number() },
  handler: async (ctx, { thresholdMs }) => {
    const leads = await ctx.db.query("reviewSalesLeads").withIndex("by_demo_sent", (q) => q.gt("demoSentAt", 0)).order("desc").take(500);
    return leads.filter(
      (l) => (l.demoSentAt ?? 0) > 0 && (l.demoSentAt ?? 0) <= thresholdMs && !l.auditFirstClickedAt && !l.auditFollowup1SentAt
    ).map((l) => ({
      leadId: l._id,
      closeLeadId: l.closeLeadId,
      businessName: l.businessName,
      city: l.city,
      state: l.state ?? "",
      remotePhone: l.phone,
      localPhone: l.demoSenderPhone ?? l.assignedSenderPhone,
      demoSentAt: l.demoSentAt ?? 0,
      // Dual-track routing
      track: l.track ?? "old"
    }));
  }
});
const getPendingAuditFollowUp2 = query({
  args: { thresholdMs: v.number() },
  handler: async (ctx, { thresholdMs }) => {
    const leads = await ctx.db.query("reviewSalesLeads").withIndex("by_demo_sent", (q) => q.gt("demoSentAt", 0)).order("desc").take(500);
    return leads.filter(
      (l) => (l.auditFirstClickedAt ?? 0) > 0 && (l.auditFirstClickedAt ?? 0) <= thresholdMs && !l.auditFollowup2SentAt
    ).map((l) => ({
      leadId: l._id,
      closeLeadId: l.closeLeadId,
      businessName: l.businessName,
      city: l.city,
      state: l.state ?? "",
      remotePhone: l.phone,
      localPhone: l.demoSenderPhone ?? l.assignedSenderPhone,
      auditClickedAt: l.auditFirstClickedAt ?? 0,
      // Dual-track routing
      track: l.track ?? "old"
    }));
  }
});
const markAuditFollowup1Sent = mutation({
  args: { leadId: v.id("reviewSalesLeads"), sentAt: v.number() },
  handler: async (ctx, { leadId, sentAt }) => {
    await ctx.db.patch(leadId, { auditFollowup1SentAt: sentAt, updatedAt: Date.now() });
    return { ok: true };
  }
});
const markAuditFollowup2Sent = mutation({
  args: { leadId: v.id("reviewSalesLeads"), sentAt: v.number() },
  handler: async (ctx, { leadId, sentAt }) => {
    await ctx.db.patch(leadId, { auditFollowup2SentAt: sentAt, updatedAt: Date.now() });
    return { ok: true };
  }
});
const recordDemoSent = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    senderPhone: v.string(),
    closeActivityId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return { ok: false, error: "not_found" };
    const now = Date.now();
    await ctx.db.patch(lead._id, {
      demoSentAt: now,
      demoSenderPhone: args.senderPhone,
      demoCloseActivityId: args.closeActivityId,
      updatedAt: now
    });
    return { ok: true, leadId: lead._id };
  }
});
const bulkImportCityCompetitors = mutation({
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
        competitorPlaceId: v.optional(v.string())
      })
    )
  },
  handler: async (ctx, { entries }) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;
    for (const e of entries) {
      const cityKey = e.city.trim();
      const nicheKey = e.niche.toLowerCase().trim();
      const existing = await ctx.db.query("reviewCityCompetitors").withIndex("by_city_niche", (q) => q.eq("city", cityKey).eq("niche", nicheKey)).first();
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
        updatedAt: now
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
  }
});
const setSenderToday = mutation({
  args: { phone: v.string(), sentToday: v.number() },
  handler: async (ctx, { phone, sentToday }) => {
    const all = await ctx.db.query("reviewSalesSenders").collect();
    const s = all.find((x) => x.phone === phone);
    if (!s) return { ok: false, error: "sender_not_found", phone };
    await ctx.db.patch(s._id, { sentToday, sentTodayResetAt: Date.now() });
    return { ok: true, phone, sentToday };
  }
});
const queueV2SecondText = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    closeLeadId: v.string(),
    senderPhone: v.string(),
    recipientPhone: v.string(),
    text: v.string(),
    track: v.optional(v.string()),
    delayMs: v.optional(v.number())
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
      dueAt: now + (a.delayMs ?? 3 * 60 * 1e3),
      sent: false,
      createdAt: now
    });
    return { ok: true, id };
  }
});
const dueV2SecondTexts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const now = Date.now();
    const rows = await ctx.db.query("reviewV2Queue").withIndex("by_sent_due", (q) => q.eq("sent", false).lte("dueAt", now)).take(limit ?? 50);
    return {
      count: rows.length,
      items: rows.map((r) => ({
        id: r._id,
        leadId: r.leadId,
        closeLeadId: r.closeLeadId,
        senderPhone: r.senderPhone,
        recipientPhone: r.recipientPhone,
        text: r.text,
        track: r.track ?? "new"
      }))
    };
  }
});
const markV2Sent = mutation({
  args: { id: v.id("reviewV2Queue"), closeActivityId: v.optional(v.string()) },
  handler: async (ctx, { id, closeActivityId }) => {
    await ctx.db.patch(id, { sent: true, sentAt: Date.now(), closeActivityId });
    return { ok: true };
  }
});
const setCityCompetitorPools = mutation({
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
            rating: v.optional(v.number())
          })
        )
      })
    )
  },
  handler: async (ctx, { pools }) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;
    for (const p of pools) {
      const cityKey = p.city.trim();
      const nicheKey = p.niche.toLowerCase().trim();
      const existing = await ctx.db.query("reviewCityCompetitors").withIndex("by_city_niche", (q) => q.eq("city", cityKey).eq("niche", nicheKey)).first();
      const top = [...p.competitors].sort((a, b) => b.reviewCount - a.reviewCount)[0];
      const payload = {
        city: cityKey,
        state: p.state,
        niche: nicheKey,
        competitorName: top?.name ?? "",
        competitorReviewCount: top?.reviewCount ?? 0,
        competitorRating: top?.rating,
        pool: p.competitors,
        updatedAt: now
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
  }
});
const getAuditData = query({
  args: {
    leadId: v.id("reviewSalesLeads")
  },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return null;
    const cityKey = (lead.city || "").trim().toLowerCase();
    const leadReviews = lead.googleReviewCount ?? 0;
    const idealMin = leadReviews + 64;
    const idealMax = leadReviews + 128;
    const fallbackMin = leadReviews + 32;
    const fallbackMax = leadReviews + 160;
    let topCompetitor = null;
    const nicheKey = (lead.niche || "").toLowerCase().trim();
    if (cityKey && nicheKey) {
      const cityRow = await ctx.db.query("reviewCityCompetitors").withIndex("by_city_niche", (q) => q.eq("city", (lead.city || "").trim()).eq("niche", nicheKey)).first();
      if (cityRow?.pool && cityRow.pool.length > 0) {
        const leadName = (lead.businessName || "").trim().toLowerCase();
        const above = cityRow.pool.filter(
          (c) => c.reviewCount > leadReviews && c.name.trim().toLowerCase() !== leadName
        );
        if (above.length > 0) {
          const idealTarget = leadReviews + 96;
          above.sort(
            (a, b) => Math.abs(a.reviewCount - idealTarget) - Math.abs(b.reviewCount - idealTarget)
          );
          const best = above[0];
          topCompetitor = { name: best.name, count: best.reviewCount, rating: best.rating };
        }
      }
    }
    if (!topCompetitor && cityKey && lead.niche) {
      const sameNicheLeads = await ctx.db.query("reviewSalesLeads").withIndex("by_niche_status", (q) => q.eq("niche", lead.niche)).collect();
      const sameCity = sameNicheLeads.filter(
        (l) => l._id !== lead._id && (l.city || "").trim().toLowerCase() === cityKey && (l.googleReviewCount ?? 0) > leadReviews
      );
      let pool = sameCity.filter(
        (l) => (l.googleReviewCount ?? 0) >= idealMin && (l.googleReviewCount ?? 0) <= idealMax
      );
      if (pool.length === 0) {
        pool = sameCity.filter(
          (l) => (l.googleReviewCount ?? 0) >= fallbackMin && (l.googleReviewCount ?? 0) <= fallbackMax
        );
      }
      if (pool.length === 0) {
        pool = sameCity;
      }
      if (pool.length > 0) {
        const idealTarget = leadReviews + 96;
        pool.sort(
          (a, b) => Math.abs((a.googleReviewCount ?? 0) - idealTarget) - Math.abs((b.googleReviewCount ?? 0) - idealTarget)
        );
        const best = pool[0];
        topCompetitor = {
          name: best.businessName,
          count: best.googleReviewCount ?? 0,
          rating: best.googleRating
        };
      }
      if (!topCompetitor) {
        const cityRow = await ctx.db.query("reviewCityCompetitors").withIndex("by_city_niche", (q) => q.eq("city", lead.city || "").eq("niche", (lead.niche || "").toLowerCase().trim())).first();
        if (cityRow && cityRow.competitorReviewCount > leadReviews && cityRow.competitorName.trim().toLowerCase() !== (lead.businessName || "").trim().toLowerCase()) {
          topCompetitor = {
            name: cityRow.competitorName,
            count: cityRow.competitorReviewCount,
            rating: cityRow.competitorRating
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
      topCompetitorReviewCount: topCompetitor?.count ?? lead.topCompetitorReviewCount ?? null
    };
  }
});
const trackAuditClick = mutation({
  args: {
    leadId: v.id("reviewSalesLeads")
  },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return { ok: false, error: "not_found" };
    const now = Date.now();
    await ctx.db.patch(lead._id, {
      auditFirstClickedAt: lead.auditFirstClickedAt ?? now,
      auditLastClickedAt: now,
      auditClickCount: (lead.auditClickCount ?? 0) + 1,
      updatedAt: now
    });
    return { ok: true, firstClick: !lead.auditFirstClickedAt };
  }
});
const trackDemoClick = mutation({
  args: {
    leadId: v.id("reviewSalesLeads")
  },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return { ok: false, error: "not_found" };
    const now = Date.now();
    await ctx.db.patch(lead._id, {
      demoFirstClickedAt: lead.demoFirstClickedAt ?? now,
      demoLastClickedAt: now,
      demoClickCount: (lead.demoClickCount ?? 0) + 1,
      updatedAt: now
    });
    return { ok: true, firstClick: !lead.demoFirstClickedAt };
  }
});
const salesClicksDashboard = query({
  args: {
    limit: v.optional(v.number()),
    onlyClicked: v.optional(v.boolean())
  },
  handler: async (ctx, { limit, onlyClicked }) => {
    const cap = limit ?? 500;
    const leads = await ctx.db.query("reviewSalesLeads").withIndex("by_demo_sent", (q) => q.gt("demoSentAt", 0)).order("desc").take(cap);
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
      closeLeadId: l.closeLeadId ?? null
    }));
    const totals = {
      total: rows.length,
      clicked: rows.filter((r) => r.demoClicked).length,
      notClicked: rows.filter((r) => !r.demoClicked).length
    };
    return { totals, rows };
  }
});
const bulkBackfillTrack = mutation({
  args: {
    track: v.union(v.literal("old"), v.literal("new")),
    onlyWithCloseLeadId: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("reviewSalesLeads").collect();
    let patched = 0;
    let skipped = 0;
    for (const lead of all) {
      if (lead.track) {
        skipped++;
        continue;
      }
      if (args.onlyWithCloseLeadId && !lead.closeLeadId) {
        skipped++;
        continue;
      }
      await ctx.db.patch(lead._id, { track: args.track, updatedAt: Date.now() });
      patched++;
    }
    return { ok: true, patched, skipped, total: all.length };
  }
});
const updateNiche = mutation({
  args: {
    leadId: v.id("reviewSalesLeads"),
    niche: v.string(),
    nicheSingular: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return { ok: false, error: "not_found" };
    await ctx.db.patch(lead._id, {
      niche: args.niche,
      nicheSingular: args.nicheSingular ?? niche2singular(args.niche),
      updatedAt: Date.now()
    });
    return { ok: true, leadId: lead._id, niche: args.niche };
  }
});
const resetByStatus = mutation({
  args: { status: v.string() },
  handler: async (ctx, { status }) => {
    if (status === "new") return { ok: false, error: "already_new" };
    const rows = await ctx.db.query("reviewSalesLeads").withIndex("by_status", (q) => q.eq("status", status)).collect();
    let reset = 0;
    for (const r of rows) {
      if (r.closeLeadId && !r.closeLeadId.startsWith("lead_")) continue;
      await ctx.db.patch(r._id, {
        status: "new",
        closeLeadId: void 0,
        closeContactId: void 0,
        assignedSenderPhone: void 0,
        phoneType: void 0,
        smsCount: 0,
        lastSmsAt: void 0,
        nextTouchAt: void 0,
        smsError: false,
        updatedAt: Date.now()
      });
      reset++;
    }
    return { ok: true, reset };
  }
});
const resetSimulatedLeads = mutation({
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
          closeLeadId: void 0,
          closeContactId: void 0,
          assignedSenderPhone: void 0,
          phoneType: void 0,
          smsCount: 0,
          lastSmsAt: void 0,
          nextTouchAt: void 0,
          lastReplyText: void 0,
          lastReplyAt: void 0,
          lastReplyIntent: void 0,
          smsError: false,
          updatedAt: Date.now()
        });
        reset++;
      }
    }
    return { ok: true, reset };
  }
});
const deleteBySource = mutation({
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
  }
});
const resetAuditClicks = mutation({
  args: { leadId: v.id("reviewSalesLeads") },
  handler: async (ctx, { leadId }) => {
    await ctx.db.patch(leadId, {
      auditFirstClickedAt: void 0,
      auditLastClickedAt: void 0,
      auditClickCount: 0,
      auditFollowup1SentAt: void 0,
      auditFollowup2SentAt: void 0,
      demoSentAt: void 0,
      demoSenderPhone: void 0,
      demoCloseActivityId: void 0,
      demoFirstClickedAt: void 0,
      demoLastClickedAt: void 0,
      demoClickCount: 0,
      updatedAt: Date.now()
    });
    return { ok: true };
  }
});
const restoreToT1Sent = mutation({
  args: { leadId: v.id("reviewSalesLeads") },
  handler: async (ctx, { leadId }) => {
    const now = Date.now();
    await ctx.db.patch(leadId, {
      status: "t1_sent",
      smsCount: 1,
      // Set nextTouchAt to now - 1 hour so it's immediately eligible for T2 pickup by SL-02
      nextTouchAt: now - 3600 * 1e3,
      // Also clear audit + demo tracking so it's fully clean
      auditFirstClickedAt: void 0,
      auditLastClickedAt: void 0,
      auditClickCount: 0,
      auditFollowup1SentAt: void 0,
      auditFollowup2SentAt: void 0,
      demoSentAt: void 0,
      demoSenderPhone: void 0,
      demoCloseActivityId: void 0,
      updatedAt: now
    });
    return { ok: true };
  }
});
const recordMockSmsSend = mutation({
  args: {
    leadId: v.string(),
    localPhone: v.string(),
    remotePhone: v.string(),
    text: v.string(),
    mockActivityId: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("mockSmsSends", { ...args, at: Date.now() });
    return { ok: true };
  }
});
const listMockSmsSends = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db.query("mockSmsSends").withIndex("by_at").order("desc").take(limit ?? 20);
  }
});
const clearMockSmsSends = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("mockSmsSends").collect();
    for (const r of rows) await ctx.db.delete(r._id);
    return { ok: true, cleared: rows.length };
  }
});
const listAllBasic = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("reviewSalesLeads").collect();
    return rows.map((r) => ({
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
      city: r.city
    }));
  }
});
const getById = query({
  args: { leadId: v.id("reviewSalesLeads") },
  handler: async (ctx, { leadId }) => {
    return await ctx.db.get(leadId);
  }
});
const getByCloseLeadId = query({
  args: { closeLeadId: v.string() },
  handler: async (ctx, { closeLeadId }) => {
    return await ctx.db.query("reviewSalesLeads").withIndex("by_close_lead", (q) => q.eq("closeLeadId", closeLeadId)).first();
  }
});
export {
  assignSender,
  bulkBackfillTrack,
  bulkImportCityCompetitors,
  bulkIngest,
  clearMockSmsSends,
  dailyBatch,
  deleteBySource,
  deliveryCheckBatch,
  dueV2SecondTexts,
  followupBatch,
  getAuditData,
  getByCloseLeadId,
  getById,
  getPendingAuditFollowUp1,
  getPendingAuditFollowUp2,
  listAllBasic,
  listMockSmsSends,
  logActivity,
  markAuditFollowup1Sent,
  markAuditFollowup2Sent,
  markPushed,
  markV2Sent,
  moveToError,
  queueV2SecondText,
  recordDemoSent,
  recordMockSmsSend,
  recordSms,
  resetAuditClicks,
  resetByStatus,
  resetSimulatedLeads,
  restoreToT1Sent,
  salesClicksDashboard,
  setCityCompetitorPools,
  setPhoneType,
  setSenderToday,
  trackAuditClick,
  trackDemoClick,
  updateNiche,
  updateStatus
};
