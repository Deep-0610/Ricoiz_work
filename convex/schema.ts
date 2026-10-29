import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reviewClients: defineTable({
    // Business identity
    businessName: v.string(),
    ownerFirstName: v.string(),
    ownerLastName: v.string(),
    ownerEmail: v.string(),
    ownerPhone: v.string(),
    timezone: v.string(),
    vertical: v.string(), // roofing / hvac / dental / etc.
    city: v.string(),

    // Google Business Profile
    googleReviewUrl: v.string(),
    googlePlaceId: v.optional(v.string()),
    gbpAccountId: v.optional(v.string()),
    gbpLocationId: v.optional(v.string()),
    gbpAccessToken: v.optional(v.string()),
    gbpRefreshToken: v.optional(v.string()),
    gbpTokenExpiresAt: v.optional(v.number()),
    gbpManagerInvitedAt: v.optional(v.number()),
    gbpManagerAcceptedAt: v.optional(v.number()),
    gbpApiActiveFrom: v.optional(v.number()), // = acceptedAt + 7 days
    lastPolledAt: v.optional(v.number()),

    // SMS config
    senderPhone: v.string(), // outbound customer SMS
    intakePhone: v.string(), // owner texts here

    // Founding 5 tracking
    isFoundingClient: v.boolean(),
    foundingSignedReleaseAt: v.optional(v.number()),
    foundingTestimonialDueAt: v.optional(v.number()),
    foundingTestimonialReceived: v.boolean(),
    setupFeeWaived: v.boolean(),
    setupFeeBackBilled: v.boolean(),

    // Competitor tracking config
    competitorPlaceIds: v.array(v.string()),

    // Referral tracking
    referralCode: v.string(),
    referredByClientId: v.optional(v.id("reviewClients")),
    monthsFreeEarned: v.number(),

    // Guarantee tracking
    guaranteeStartAt: v.optional(v.number()),
    guaranteeReviewsCount: v.number(),
    guaranteeMet: v.boolean(),
    guaranteeMetAt: v.optional(v.number()),
    referralAskSentAt: v.optional(v.number()),

    // Stripe
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    subscriptionStatus: v.string(), // active / past_due / canceled
    currentPeriodEnd: v.number(),

    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_intake_phone", ["intakePhone"])
    .index("by_referral_code", ["referralCode"])
    .index("by_last_polled", ["lastPolledAt"]),

  reviewCustomers: defineTable({
    clientId: v.id("reviewClients"),

    // Customer identity
    firstName: v.string(),
    lastName: v.optional(v.string()),
    phone: v.string(), // E.164
    phoneAreaCode: v.string(),
    email: v.optional(v.string()),

    // Job context
    jobCompletedAt: v.number(),
    source: v.string(), // reactivation / ongoing / manual
    intakedByOwnerAt: v.optional(v.number()),

    // Msg 1 - Check-in
    checkinSent: v.boolean(),
    checkinSentAt: v.optional(v.number()),
    checkinCloseActivityId: v.optional(v.string()),
    checkinReplyReceived: v.boolean(),
    checkinReplyAt: v.optional(v.number()),
    checkinReplyText: v.optional(v.string()),
    checkinNegative: v.boolean(), // if true, suppress Msg 2 & 3

    // Msg 2 - Review Request
    reviewRequestSent: v.boolean(),
    reviewRequestSentAt: v.optional(v.number()),
    reviewRequestCloseActivityId: v.optional(v.string()),

    // Msg 3 - Nudge
    nudgeSent: v.boolean(),
    nudgeSentAt: v.optional(v.number()),
    nudgeCloseActivityId: v.optional(v.string()),

    // Click tracking
    linkClicked: v.boolean(),
    linkClickedAt: v.optional(v.number()),
    linkClickCount: v.number(),

    // Outcome
    reviewReceived: v.boolean(),
    reviewReceivedAt: v.optional(v.number()),
    reviewRating: v.optional(v.number()),
    reviewGbpId: v.optional(v.string()),

    // Opt-out
    optedOut: v.boolean(),
    optedOutAt: v.optional(v.number()),

    // Close CRM refs
    closeLeadId: v.optional(v.string()),
    closeContactId: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_client_pending_checkin", ["clientId", "checkinSent", "jobCompletedAt"])
    .index("by_client_pending_review", ["clientId", "reviewRequestSent", "checkinSent", "checkinNegative"])
    .index("by_client_pending_nudge", ["clientId", "nudgeSent", "linkClicked", "reviewRequestSent"])
    .index("by_phone_global", ["phone"])
    .index("by_close_lead", ["closeLeadId"]),

  reviewResponses: defineTable({
    clientId: v.id("reviewClients"),

    // Source review from GBP
    gbpReviewId: v.string(),
    reviewerName: v.string(),
    reviewText: v.string(),
    reviewRating: v.number(),
    reviewedAt: v.number(),

    // Matched customer (if any)
    matchedCustomerId: v.optional(v.id("reviewCustomers")),

    // AI draft
    aiDraft: v.string(),
    aiDraftGeneratedAt: v.number(),
    contentFilterPassed: v.boolean(),
    contentFilterReason: v.optional(v.string()),

    // Status
    status: v.string(),
    // pending_approval | approved | auto_posted | auto_posted_after_sla | posted | failed | skipped

    // Approval
    slackMessageTs: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    approvalEditedText: v.optional(v.string()),

    // Posting
    postedAt: v.optional(v.number()),
    postError: v.optional(v.string()),
    policyViolation: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_client_status", ["clientId", "status"])
    .index("by_gbp_review", ["gbpReviewId"]),

  competitorSnapshots: defineTable({
    clientId: v.id("reviewClients"),
    weekOf: v.number(), // Monday timestamp UTC

    clientReviewCount: v.number(),
    clientAvgRating: v.number(),
    clientNewReviewsThisWeek: v.number(),

    competitors: v.array(
      v.object({
        placeId: v.string(),
        name: v.string(),
        reviewCount: v.number(),
        avgRating: v.number(),
        reviewsGained: v.number(), // vs last week
      })
    ),

    reportSentAt: v.optional(v.number()),
  })
    .index("by_client_week", ["clientId", "weekOf"]),

  intakeActivity: defineTable({
    clientId: v.id("reviewClients"),
    lastIntakeAt: v.number(),
    lastAlertSentAt: v.optional(v.number()),
    alertCount: v.number(), // for escalation
    snoozedUntil: v.optional(v.number()),
  })
    .index("by_client", ["clientId"]),

  referrals: defineTable({
    referrerClientId: v.id("reviewClients"),
    referralCode: v.string(),
    referredEmail: v.optional(v.string()),
    referredClientId: v.optional(v.id("reviewClients")),
    status: v.string(), // invited / signed_up / paid / credit_applied
    creditAppliedAt: v.optional(v.number()),
    stripePromoCodeId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_code", ["referralCode"])
    .index("by_referrer", ["referrerClientId"]),

  optOuts: defineTable({
    phone: v.string(),
    optedOutAt: v.number(),
    triggerClientId: v.optional(v.id("reviewClients")),
    triggerCustomerId: v.optional(v.id("reviewCustomers")),
    reason: v.string(), // stop_reply / manual / landline / natural_language
    keywordMatched: v.optional(v.string()),
  })
    .index("by_phone", ["phone"]),

  reactivationBatches: defineTable({
    clientId: v.id("reviewClients"),
    uploadedAt: v.number(),
    totalCustomers: v.number(),
    currentIndex: v.number(),
    sentToday: v.number(),
    sentTodayResetAt: v.number(),
    dailyCap: v.number(), // default 50
    complete: v.boolean(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client_active", ["clientId", "complete"]),

  smsActivityLog: defineTable({
    clientId: v.id("reviewClients"),
    customerId: v.optional(v.id("reviewCustomers")),
    stage: v.number(), // 1=checkin, 2=review request, 3=nudge, 0=other
    direction: v.string(), // outbound / inbound
    text: v.string(),
    sentAt: v.number(),
    closeActivityId: v.string(),
    closeLeadId: v.optional(v.string()),
    status: v.string(),
    senderPhone: v.string(),
    remotePhone: v.string(),
  })
    .index("by_client_date", ["clientId", "sentAt"])
    .index("by_customer", ["customerId"]),

  senderWarmup: defineTable({
    phone: v.string(),
    clientId: v.optional(v.id("reviewClients")),
    kind: v.string(), // client_sender / sales_sender
    activatedAt: v.number(),
    sentToday: v.number(),
    sentTodayResetAt: v.number(),
    dailyCap: v.number(),
    fullyWarmedAt: v.optional(v.number()),
  })
    .index("by_phone", ["phone"]),

  // ─────────────────────────────────────────────────
  // SALES PIPELINE (prospecting to sell Review Engine)
  // Mirrors Voltaris websell architecture (WF-NW-02/03/04 + AI classifier)
  // ─────────────────────────────────────────────────

  reviewSalesLeads: defineTable({
    // Business identity
    businessName: v.string(),
    ownerFirstName: v.optional(v.string()),
    ownerLastName: v.optional(v.string()),
    phone: v.string(), // E.164 primary contact
    email: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    niche: v.string(), // roofing / hvac / plumbing / electrician / etc.
    nicheSingular: v.optional(v.string()), // "roofing company" for template v3
    nichePlural: v.optional(v.string()), // LEGACY (kept optional so pre-v3 test data validates)

    // Google Business Profile intel
    googleReviewCount: v.optional(v.number()),
    googleRating: v.optional(v.number()),
    googleReviewUrl: v.optional(v.string()),
    googlePlaceId: v.optional(v.string()),
    topCompetitorName: v.optional(v.string()),
    topCompetitorReviewCount: v.optional(v.number()),

    // Source metadata
    source: v.string(), // "google_maps_scrape" / "apify" / "manual" / etc.
    sourceScrapedAt: v.number(),

    // Pipeline state
    status: v.string(),
    // States: new / pushed / t1_sent / t2_sent / t3_sent / t4_sent / replied
    //         / positive / negative / opted_out / booked / closed_won / closed_lost
    //         / HUMAN_HAND / landline / bad_number

    // Sender rotation + touch tracking
    assignedSenderPhone: v.optional(v.string()),
    phoneType: v.optional(v.string()), // "mobile" / "landline" / "unknown"
    smsCount: v.number(),
    lastSmsAt: v.optional(v.number()),
    nextTouchAt: v.optional(v.number()),
    smsError: v.boolean(),

    // Close CRM linkage
    closeLeadId: v.optional(v.string()),
    closeContactId: v.optional(v.string()),

    // AI classifier output
    lastReplyText: v.optional(v.string()),
    lastReplyAt: v.optional(v.number()),
    lastReplyIntent: v.optional(v.string()), // POSITIVE / QUESTION / NOT_INTERESTED / etc.

    // Dual-track: which Close CRM key + sender pool this lead was contacted from
    //   "old" = existing 464 leads sent from AI1-AI7 via Vantage Views key (Owner)
    //   "new" = future leads sent from 5 new phones via VoiceSDR AI key
    // Undefined = never sent yet (still in "ready" or "new" status)
    track: v.optional(v.union(v.literal("old"), v.literal("new"))),

    // Demo video: send + click tracking (triggered by Close "Review Engine - Demo Send" flip)
    demoSentAt: v.optional(v.number()),
    demoSenderPhone: v.optional(v.string()),
    demoCloseActivityId: v.optional(v.string()),
    // Click tracking (YOUR_APP_HOST/watch?l=<id>)
    demoFirstClickedAt: v.optional(v.number()),
    demoLastClickedAt: v.optional(v.number()),
    demoClickCount: v.optional(v.number()),
    // Audit page tracking (YOUR_APP_HOST/audit?l=<id>) — sent via Close CRM flip
    auditFirstClickedAt: v.optional(v.number()),
    auditLastClickedAt: v.optional(v.number()),
    auditClickCount: v.optional(v.number()),
    // Behavior-based follow-ups after audit send
    auditFollowup1SentAt: v.optional(v.number()),  // 3h no-click → nudge SMS
    auditFollowup2SentAt: v.optional(v.number()),  // clicked but no reply → nudge SMS

    // v5 A/B/C test variant tracking
    t1Variant: v.optional(v.string()),  // "V1" | "V2" | "V3" — Touch 1 opener variant
    t4Variant: v.optional(v.string()),  // "V1" | "V2" | "V3" | "V4" — Touch 4 breakup variant

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_status_next_touch", ["status", "nextTouchAt"])
    .index("by_phone", ["phone"])
    .index("by_close_lead", ["closeLeadId"])
    .index("by_niche_status", ["niche", "status"])
    .index("by_demo_clicked", ["demoFirstClickedAt"])
    .index("by_demo_sent", ["demoSentAt"]),

  // One top competitor per (city, niche). Shared across all reviewSalesLeads in that city.
  // Populated once via bulkImportCityCompetitors. No per-lead cost, no repeat scraping.
  reviewCityCompetitors: defineTable({
    city: v.string(),           // matched case-insensitive
    state: v.string(),
    niche: v.string(),          // "roofing"
    competitorName: v.string(),
    competitorReviewCount: v.number(),
    competitorRating: v.optional(v.number()),
    competitorWebsite: v.optional(v.string()),
    competitorPhone: v.optional(v.string()),
    competitorAddress: v.optional(v.string()),
    competitorPlaceId: v.optional(v.string()),
    // 5-6 shared competitors for this (city, niche). Every lead in the city+niche
    // picks from this same pool the one that best fits its own review gap.
    pool: v.optional(
      v.array(
        v.object({
          name: v.string(),
          reviewCount: v.number(),
          rating: v.optional(v.number()),
        })
      )
    ),
    updatedAt: v.number(),
  })
    .index("by_city_niche", ["city", "niche"])
    .index("by_state", ["state"]),

  // Queue for the V2 opener's SECOND text. SL-01 sends the first text ("is this the
  // owner?") then queues the second here with dueAt = now+3min, so the main send loop
  // never blocks. A lightweight cron drains due, unsent rows.
  reviewV2Queue: defineTable({
    leadId: v.id("reviewSalesLeads"),
    closeLeadId: v.string(),
    senderPhone: v.string(),
    recipientPhone: v.string(),
    text: v.string(),
    track: v.optional(v.string()),   // "new" | "old" — which Close account to send from
    dueAt: v.number(),
    sent: v.boolean(),
    sentAt: v.optional(v.number()),
    closeActivityId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_sent_due", ["sent", "dueAt"]),

  reviewSalesSenders: defineTable({
    phone: v.string(), // Close CRM sender number
    label: v.optional(v.string()), // "SL1", "SL2", etc.
    dailyCap: v.number(), // typically 100
    sentToday: v.number(),
    sentTodayResetAt: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_active", ["active", "sentToday"])
    .index("by_phone", ["phone"]),

  // TEST-ONLY: log of mock Close SMS sends (used during E2E testing to verify pipeline without real SMS).
  mockSmsSends: defineTable({
    leadId: v.string(),
    localPhone: v.string(),
    remotePhone: v.string(),
    text: v.string(),
    mockActivityId: v.string(),
    at: v.number(),
  }).index("by_at", ["at"]),

  reviewSalesSmsActivity: defineTable({
    leadId: v.id("reviewSalesLeads"),
    closeLeadId: v.optional(v.string()),
    direction: v.string(), // "outbound" / "inbound"
    touchNumber: v.optional(v.number()), // 1 / 2 / 3 / 4 (outbound only)
    senderPhone: v.optional(v.string()),
    recipientPhone: v.string(),
    text: v.string(),
    sentAt: v.number(),
    closeActivityId: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_lead", ["leadId", "sentAt"])
    .index("by_lead_direction", ["leadId", "direction", "sentAt"]),

  // Client-submitted onboarding forms — Owner reviews + manually creates client
  pendingOnboardings: defineTable({
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
      indemnify: v.boolean(),
    }),
    signature: v.string(),
    csvUrl: v.optional(v.string()),
    status: v.string(), // "new" / "processed" / "rejected"
    processedAt: v.optional(v.number()),
    processedClientId: v.optional(v.id("reviewClients")),
    notes: v.optional(v.string()),
    submittedAt: v.number(),
  })
    .index("by_status", ["status", "submittedAt"])
    .index("by_email", ["ownerEmail"]),
});
