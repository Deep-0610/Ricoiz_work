import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { isInQuietHours } from "./lib/quietHours";

const TWO_HOURS = 2 * 60 * 60 * 1000;
const THREE_HOURS = 3 * 60 * 60 * 1000;
const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;

/**
 * Add customer via owner text intake (from n8n WF-REV-INTAKE).
 * Checks dedup + global opt-out.
 */
export const addViaText = mutation({
  args: {
    clientId: v.id("reviewClients"),
    firstName: v.string(),
    phone: v.string(),
    intakedFromOwnerPhone: v.string(),
  },
  handler: async (ctx, { clientId, firstName, phone, intakedFromOwnerPhone }) => {
    // Check global opt-out
    const optOut = await ctx.db
      .query("optOuts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (optOut) {
      return { ok: false, error: "opted_out", customerId: null };
    }

    // Dedup check
    const existing = await ctx.db
      .query("reviewCustomers")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .filter((q) => q.eq(q.field("phone"), phone))
      .first();
    if (existing) {
      return { ok: false, error: "duplicate", customerId: existing._id };
    }

    const now = Date.now();
    const areaCode = phone.replace(/^\+1/, "").substring(0, 3);

    const customerId = await ctx.db.insert("reviewCustomers", {
      clientId,
      firstName,
      phone,
      phoneAreaCode: areaCode,
      jobCompletedAt: now,
      source: "ongoing",
      intakedByOwnerAt: now,
      checkinSent: false,
      checkinReplyReceived: false,
      checkinNegative: false,
      reviewRequestSent: false,
      nudgeSent: false,
      linkClicked: false,
      linkClickCount: 0,
      reviewReceived: false,
      optedOut: false,
      createdAt: now,
      updatedAt: now,
    });

    // Update intake activity
    const activity = await ctx.db
      .query("intakeActivity")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .first();
    if (activity) {
      await ctx.db.patch(activity._id, {
        lastIntakeAt: now,
        alertCount: 0,
      });
    } else {
      await ctx.db.insert("intakeActivity", { clientId, lastIntakeAt: now, alertCount: 0 });
    }

    return { ok: true, customerId, scheduledFor: now + TWO_HOURS };
  },
});

/**
 * Bulk add customers from CSV upload (reactivation).
 */
export const addBulk = mutation({
  args: {
    clientId: v.id("reviewClients"),
    customers: v.array(
      v.object({
        firstName: v.string(),
        phone: v.string(),
        lastServiceDate: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { clientId, customers }) => {
    const now = Date.now();
    let inserted = 0;
    let skipped = 0;

    for (const c of customers) {
      // Global opt-out check
      const optOut = await ctx.db
        .query("optOuts")
        .withIndex("by_phone", (q) => q.eq("phone", c.phone))
        .first();
      if (optOut) {
        skipped++;
        continue;
      }

      // Dedup
      const existing = await ctx.db
        .query("reviewCustomers")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .filter((q) => q.eq(q.field("phone"), c.phone))
        .first();
      if (existing) {
        skipped++;
        continue;
      }

      const areaCode = c.phone.replace(/^\+1/, "").substring(0, 3);
      await ctx.db.insert("reviewCustomers", {
        clientId,
        firstName: c.firstName,
        phone: c.phone,
        phoneAreaCode: areaCode,
        jobCompletedAt: c.lastServiceDate || now,
        source: "reactivation",
        checkinSent: false,
        checkinReplyReceived: false,
        checkinNegative: false,
        reviewRequestSent: false,
        nudgeSent: false,
        linkClicked: false,
        linkClickCount: 0,
        reviewReceived: false,
        optedOut: false,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }

    // Create reactivation batch
    if (inserted > 0) {
      await ctx.db.insert("reactivationBatches", {
        clientId,
        uploadedAt: now,
        totalCustomers: inserted,
        currentIndex: 0,
        sentToday: 0,
        sentTodayResetAt: now,
        dailyCap: 50,
        complete: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { inserted, skipped };
  },
});

/**
 * Get customers ready for Msg 1 (check-in).
 * Filters: jobCompletedAt < now - 2hr, not sent, not opted out, quiet hours OK.
 */
export const pendingCheckin = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    const now = Date.now();
    const cutoff = now - TWO_HOURS;

    // Get all active clients
    const clients = await ctx.db
      .query("reviewClients")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const clientMap = new Map(clients.map((c) => [c._id, c]));
    const activeClientIds = clients.map((c) => c._id);

    const results = [];
    for (const clientId of activeClientIds) {
      if (results.length >= limit) break;
      const customers = await ctx.db
        .query("reviewCustomers")
        .withIndex("by_client_pending_checkin", (q) =>
          q.eq("clientId", clientId).eq("checkinSent", false)
        )
        .filter((q) => q.and(q.eq(q.field("optedOut"), false), q.lt(q.field("jobCompletedAt"), cutoff)))
        .take(limit - results.length);

      for (const c of customers) {
        const client = clientMap.get(clientId);
        if (!client) continue;
        // Quiet hours check
        if (!isInQuietHours(c.phone, client.timezone)) continue;

        results.push({
          id: c._id,
          clientId,
          firstName: c.firstName,
          phone: c.phone,
          closeLeadId: c.closeLeadId,
          closeContactId: c.closeContactId,
          clientBusinessName: client.businessName,
          clientOwnerFirstName: client.ownerFirstName,
          clientSenderPhone: client.senderPhone,
          reviewLink: `${process.env.CLICK_TRACKER_DOMAIN || "https://YOUR_CONVEX_DEPLOYMENT"}/reviews/click/${c._id}`,
        });
      }
    }

    return { customers: results, count: results.length };
  },
});

/**
 * Get customers due for Msg 2 or Msg 3.
 */
export const smsBatch = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    const now = Date.now();

    const clients = await ctx.db
      .query("reviewClients")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const clientMap = new Map(clients.map((c) => [c._id, c]));

    const results = [];
    for (const client of clients) {
      if (results.length >= limit) break;

      // Msg 2 candidates: checkinSent, not negative, request not sent, 2hr past checkin
      const msg2Candidates = await ctx.db
        .query("reviewCustomers")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("checkinSent"), true),
            q.eq(q.field("checkinNegative"), false),
            q.eq(q.field("reviewRequestSent"), false),
            q.eq(q.field("optedOut"), false),
            q.lt(q.field("checkinSentAt"), now - TWO_HOURS)
          )
        )
        .take(50);

      for (const c of msg2Candidates) {
        if (results.length >= limit) break;
        if (!isInQuietHours(c.phone, client.timezone)) continue;
        results.push(buildCustomer(c, client, 2));
      }

      // Msg 3 candidates: reviewRequestSent, not clicked, nudge not sent, 72hr past request
      const msg3Candidates = await ctx.db
        .query("reviewCustomers")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("reviewRequestSent"), true),
            q.eq(q.field("linkClicked"), false),
            q.eq(q.field("nudgeSent"), false),
            q.eq(q.field("optedOut"), false),
            q.lt(q.field("reviewRequestSentAt"), now - SEVENTY_TWO_HOURS)
          )
        )
        .take(50);

      for (const c of msg3Candidates) {
        if (results.length >= limit) break;
        if (!isInQuietHours(c.phone, client.timezone)) continue;
        results.push(buildCustomer(c, client, 3));
      }
    }

    return { customers: results, count: results.length };
  },
});

function buildCustomer(c: Doc<"reviewCustomers">, client: Doc<"reviewClients">, nextTouch: number) {
  return {
    id: c._id,
    clientId: client._id,
    firstName: c.firstName,
    phone: c.phone,
    nextTouch,
    checkinNegative: c.checkinNegative,
    closeLeadId: c.closeLeadId,
    closeContactId: c.closeContactId,
    clientBusinessName: client.businessName,
    clientOwnerFirstName: client.ownerFirstName,
    clientSenderPhone: client.senderPhone,
    reviewLink: `${process.env.CLICK_TRACKER_DOMAIN || "https://YOUR_CONVEX_DEPLOYMENT"}/reviews/click/${c._id}`,
  };
}

/**
 * Mark SMS sent (called after Close SMS success).
 */
export const markSent = mutation({
  args: {
    customerId: v.id("reviewCustomers"),
    stage: v.number(), // 1, 2, or 3
    closeActivityId: v.optional(v.string()),
  },
  handler: async (ctx, { customerId, stage, closeActivityId }) => {
    const now = Date.now();
    const update: any = { updatedAt: now };

    if (stage === 1) {
      update.checkinSent = true;
      update.checkinSentAt = now;
      update.checkinCloseActivityId = closeActivityId;
    } else if (stage === 2) {
      update.reviewRequestSent = true;
      update.reviewRequestSentAt = now;
      update.reviewRequestCloseActivityId = closeActivityId;
    } else if (stage === 3) {
      update.nudgeSent = true;
      update.nudgeSentAt = now;
      update.nudgeCloseActivityId = closeActivityId;
    }

    await ctx.db.patch(customerId, update);
    return { ok: true };
  },
});

/**
 * Record customer check-in reply + sentiment classification.
 */
export const checkinReply = mutation({
  args: {
    closeLeadId: v.string(),
    text: v.string(),
    sentiment: v.string(), // positive / neutral / negative
  },
  handler: async (ctx, { closeLeadId, text, sentiment }) => {
    const customer = await ctx.db
      .query("reviewCustomers")
      .withIndex("by_close_lead", (q) => q.eq("closeLeadId", closeLeadId))
      .first();
    if (!customer) return { ok: false, error: "not_found" };

    const now = Date.now();
    const client = await ctx.db.get(customer.clientId);
    await ctx.db.patch(customer._id, {
      checkinReplyReceived: true,
      checkinReplyAt: now,
      checkinReplyText: text,
      checkinNegative: sentiment === "negative",
      updatedAt: now,
    });

    return {
      ok: true,
      alertOwner: sentiment === "negative",
      customerFirstName: customer.firstName,
      customerReply: text,
      ownerPhone: client?.ownerPhone,
      ownerAlertLocalPhone: client?.senderPhone,
      businessName: client?.businessName,
    };
  },
});

/**
 * Record click on review link (called by click tracker).
 */
export const recordClick = internalMutation({
  args: { customerId: v.id("reviewCustomers") },
  handler: async (ctx, { customerId }) => {
    const c = await ctx.db.get(customerId);
    if (!c) return;
    await ctx.db.patch(customerId, {
      linkClicked: true,
      linkClickedAt: Date.now(),
      linkClickCount: (c.linkClickCount || 0) + 1,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get client + review URL for click tracker.
 */
export const getForClick = internalMutation({
  args: { customerId: v.id("reviewCustomers") },
  handler: async (ctx, { customerId }) => {
    const c = await ctx.db.get(customerId);
    if (!c) return null;
    const client = await ctx.db.get(c.clientId);
    return client ? { googleReviewUrl: client.googleReviewUrl } : null;
  },
});

/**
 * Mark customer as opted out (from STOP or manual).
 */
export const markOptedOut = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const customers = await ctx.db
      .query("reviewCustomers")
      .withIndex("by_phone_global", (q) => q.eq("phone", phone))
      .collect();
    for (const c of customers) {
      await ctx.db.patch(c._id, {
        optedOut: true,
        optedOutAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return { count: customers.length };
  },
});
