# 03. Convex Schema

**Deployment**: `YOUR_CONVEX_DEPLOYMENT` (existing)

## Tables

### `reviewClients`

```typescript
{
  _id,
  businessName: string,
  ownerFirstName: string,
  ownerLastName: string,
  ownerEmail: string,
  ownerPhone: string,          // for service recovery routing
  googleReviewUrl: string,
  senderPhone: string,          // dedicated Close CRM number
  intakePhone: string,          // dedicated intake number (owner texts here)
  timezone: string,             // default for quiet hours + reports
  
  // GBP Manager access tracking
  gbpManagerInvitedAt?: number,
  gbpManagerAcceptedAt?: number,
  gbpApiActiveFrom?: number,    // = acceptedAt + 7 days
  
  // Founding 5 tracking
  isFoundingClient: boolean,
  foundingTestimonialDueAt?: number,  // = first review + 60 days
  foundingTestimonialReceived: boolean,
  setupFeeWaived: boolean,
  setupFeeBackBilled: boolean,
  
  // Competitor tracking config
  competitorPlaceIds: string[],  // 3 competitors for weekly report
  competitorCity: string,        // for SerpAPI queries
  
  // Referral tracking
  referralCode: string,
  referredByClientId?: Id<"reviewClients">,
  monthsFreeEarned: number,
  
  active: boolean,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  createdAt: number,
}
```

### `reviewCustomers`

```typescript
{
  _id,
  clientId: Id<"reviewClients">,
  firstName: string,
  phone: string,                    // E.164
  phoneAreaCode: string,            // for quiet hours override
  jobCompletedAt: number,
  source: "reactivation" | "ongoing" | "manual",
  intakedByOwnerAt?: number,        // when owner texted us this customer
  
  // Drip state
  checkinSent: boolean,
  checkinSentAt?: number,
  checkinReplyReceived: boolean,
  checkinReplyText?: string,
  checkinNegative: boolean,         // if true, suppress Msg 2 & 3
  reviewRequestSent: boolean,
  reviewRequestSentAt?: number,
  nudgeSent: boolean,
  nudgeSentAt?: number,
  linkClicked: boolean,
  linkClickedAt?: number,
  reviewReceived: boolean,          // detected via GBP polling
  reviewReceivedAt?: number,
  reviewRating?: number,
  
  optedOut: boolean,
  optedOutAt?: number,
  
  // Close CRM refs
  closeLeadId?: string,
  closeContactId?: string,
  
  createdAt: number,
}
```

### `reviewResponses` (AI response queue)

```typescript
{
  _id,
  clientId: Id<"reviewClients">,
  gbpReviewId: string,              // unique per Google review
  reviewerName: string,
  reviewRating: number,
  reviewText: string,
  reviewedAt: number,
  
  aiDraft: string,
  aiDraftGeneratedAt: number,
  
  status: "auto_posted" | "pending_approval" | "approved" | "posted" | "auto_posted_after_sla",
  postedAt?: number,
  approvedBy?: string,
  slackMessageTs?: string,          // for approval callback
  
  createdAt: number,
}
```

### `competitorSnapshots` (for weekly report)

```typescript
{
  _id,
  clientId: Id<"reviewClients">,
  weekOf: number,                   // Monday timestamp
  
  clientReviewCount: number,
  clientAvgRating: number,
  clientNewReviewsThisWeek: number,
  
  competitors: {
    placeId: string,
    name: string,
    reviewCount: number,
    avgRating: number,
    reviewsGained: number,          // vs last week
  }[],
  
  reportSentAt?: number,
}
```

### `intakeActivity` (for owner drip check-in)

```typescript
{
  _id,
  clientId: Id<"reviewClients">,
  lastIntakeAt: number,             // updated on every owner text
  lastAlertSentAt?: number,         // don't spam alerts
  snoozedUntil?: number,            // if owner replied "YES" to snooze
}
```

### `referrals`

```typescript
{
  _id,
  referrerClientId: Id<"reviewClients">,
  referredEmail?: string,
  referredClientId?: Id<"reviewClients">,   // filled when they sign up
  status: "invited" | "signed_up" | "paid" | "credit_applied",
  creditAppliedAt?: number,
  stripePromoCodeId?: string,
  createdAt: number,
}
```

### `optOuts` (global, across all clients)

```typescript
{
  _id,
  phone: string,
  optedOutAt: number,
  triggerClientId: Id<"reviewClients">,
  reason: string,
}
```

## Indexes

- `reviewClients.by_active` (active)
- `reviewClients.by_stripe_customer` (stripeCustomerId)
- `reviewCustomers.by_client_pending_checkin` (clientId, checkinSent, jobCompletedAt)
- `reviewCustomers.by_client_pending_review` (clientId, checkinSent, checkinNegative, reviewRequestSent, checkinSentAt)
- `reviewCustomers.by_client_pending_nudge` (clientId, reviewRequestSent, nudgeSent, linkClicked, reviewRequestSentAt)
- `reviewCustomers.by_phone_global` (phone)
- `reviewResponses.by_client_status` (clientId, status)
- `intakeActivity.by_client` (clientId)
- `optOuts.by_phone` (phone)
