# 04. Convex HTTP Endpoints

**Base**: `https://YOUR_CONVEX_DEPLOYMENT/reviews/*`
**Auth**: `httpHeaderAuth` cred "Convex Sync (website-lead)" (id `B3cJKuMPTZTQnFxq`)

## Intake

### POST `/reviews/customer-add-via-text`

Called by n8n WF-REV-INTAKE after parsing owner's intake text.

Body:
```json
{
  "clientId": "cli_xyz",
  "firstName": "Sarah",
  "phone": "+14155551234",
  "intakedFromOwnerPhone": "+13305551111"
}
```

**Logic**:
- Validate phone (E.164)
- Dedup: skip if already exists for this client
- Check global opt-out
- Insert with `jobCompletedAt = now`, `source = "ongoing"`, `intakedByOwnerAt = now`
- Update `intakeActivity.lastIntakeAt = now` for the client
- Return `{ customerId, scheduledFor: now + 2hr }`

### POST `/reviews/customer-add-bulk`

CSV upload during onboarding (reactivation).

Body: `{ clientId, csvUrl, headerMap }`

Creates customers with `source = "reactivation"`, `jobCompletedAt = now - 3hr` (immediately eligible). Trickle enforced by WF-REV-03.

## Drip Queue

### GET `/reviews/pending-checkin?limit=100`

Returns customers ready for Msg 1.

**Filter**: `checkinSent=false AND optedOut=false AND jobCompletedAt < (now - 2hr) AND client.active=true`

Response includes: customer + client fields + `reviewLink: https://go.<domain>/r/<customerId>`

### GET `/reviews/sms-batch?limit=100`

Returns customers due for Msg 2 or 3.

**Msg 2 filter**: `reviewRequestSent=false AND checkinSent=true AND checkinNegative=false AND checkinSentAt < (now - 2hr)`

**Msg 3 filter**: `nudgeSent=false AND reviewRequestSent=true AND linkClicked=false AND reviewRequestSentAt < (now - 72hr)`

Each customer includes `nextTouch: 2 | 3`.

### POST `/reviews/mark-sent`

Body: `{ customerId, stage: 1|2|3, closeActivityId }`

Marks stage + timestamps.

## Service Recovery

### POST `/reviews/checkin-reply`

Called by n8n WF-REV-INBOUND when customer replies to Msg 1.

Body:
```json
{
  "customerId": "cust_abc",
  "text": "It's still leaking",
  "sentiment": "negative"       // classified by Claude in workflow
}
```

**Logic**:
- Update `checkinReplyReceived=true, checkinReplyText=text`
- If `sentiment=negative`: set `checkinNegative=true` → suppresses Msg 2 & 3 in gate
- Return `{ ok: true, alertOwner: true|false }`

## Click Tracking

### GET `go.<domain>/r/:customerId`

**Public. On own domain (not convex.site).**

1. Load customer
2. Async: update `linkClicked=true, linkClickedAt=now`
3. HTTP 302 redirect to `client.googleReviewUrl`

## AI Response Queue

### POST `/reviews/response-drafted`

Body:
```json
{
  "clientId": "cli_xyz",
  "gbpReviewId": "gr_abc",
  "reviewerName": "Sarah",
  "reviewRating": 5,
  "reviewText": "Amazing!",
  "reviewedAt": 1720000000000,
  "aiDraft": "Sarah — thanks so much!"
}
```

**Logic**:
- Insert `reviewResponses` row
- If `reviewRating >= 4`: `status="auto_posted"` → returned flag triggers immediate post
- Else: `status="pending_approval"` → returned flag triggers Slack post

### POST `/reviews/response-approved`

Slack callback → n8n → this endpoint.

Body: `{ responseId, approvedBy }` → status="approved", triggers GBP post.

### POST `/reviews/response-posted`

After GBP post succeeds.

Body: `{ responseId, success, postedAt }` → status="posted"

## Competitor Report

### GET `/reviews/clients-due-for-report`

Called Monday 9AM cron.

Returns clients where last report `weekOf < this Monday`.

### POST `/reviews/competitor-snapshot`

Body: `{ clientId, weekOf, clientData, competitorsData }`

Stores snapshot for weekly email generation.

## Intake Activity

### GET `/reviews/inactive-clients?daysInactive=7`

Called daily by WF-REV-06.

Returns clients where `intakeActivity.lastIntakeAt < (now - 7 days) AND (snoozedUntil IS NULL OR snoozedUntil < now)`.

### POST `/reviews/intake-snoozed`

Body: `{ clientId, snoozeDays: 7 }` — when owner replies YES to inactivity alert.

## Opt-Out

### POST `/reviews/opt-out`

Body: `{ phone, clientId, reason }`

Adds to global `optOuts` + marks all matching customers across all clients as `optedOut=true`.

## Stripe Webhook

### POST `/reviews/stripe-webhook`

Standard Stripe events: `checkout.completed` (create client), `subscription.deleted` (deactivate), `invoice.payment_failed` (Slack alert).

## Referrals

### POST `/reviews/referral-tracked`

Body: `{ referrerClientId, referredEmail }` → creates referral row + Stripe promo code.

### POST `/reviews/referral-converted`

Triggered when referred lead converts to paid client. Applies 1 month free credit to `referrerClientId` via Stripe.
