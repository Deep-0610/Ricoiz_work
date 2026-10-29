# 05. n8n Workflows

**Mirror WF-NW-02 (`q1bEDwQodQmLmY6n`) and WF-NW-03 (`nRKqnzXPVwdiAB4s`)** — verified 2026-07-10.

Both use:
- Close CRM SMS endpoint (cred `zX24LQcydXoiwuvk`)
- Convex `YOUR_CONVEX_DEPLOYMENT` for state
- `scheduleTrigger` cron, TZ `America/New_York`
- SplitInBatches(10) + Wait 1.5s

## 9 Workflows Total (v2)

| ID | Purpose | Trigger |
|---|---|---|
| WF-REV-INTAKE | Parse owner text → create customer | Close CRM inbound webhook |
| WF-REV-01 | Check-in SMS (Msg 1) | Cron `*/20 8-20 * * *` ET |
| WF-REV-02 | Review Request + Nudge (Msg 2+3) | Cron `0 9-20 * * *` ET |
| WF-REV-03 | Reactivation Trickler | Cron `*/12 9-19 * * 1-5` ET |
| WF-REV-04 | AI Auto-Response (GBP polling) | Cron `*/15 * * * *` |
| WF-REV-05 | Weekly Competitor Report | Cron `0 9 * * 1` ET (Mon 9AM) |
| WF-REV-06 | Intake Activity Check-in | Cron `0 10 * * *` ET (daily 10AM) |
| WF-REV-INBOUND | Route replies (STOP + service recovery) | Close CRM inbound webhook |
| WF-REV-AUDIT | Generate pre-demo audit | Trigger from Close CRM lead tag |

Plus sales cadence (WF-REV-SALES-01 through 04) — see [08-sales-funnel.md](08-sales-funnel.md).

---

## WF-REV-INTAKE: Parse Owner Text

**Trigger**: Close CRM inbound webhook (client's dedicated intake number)

Payload arrives with `remote_phone` = owner phone, `text` = "John Smith 330-555-0142".

```
Webhook
  ↓
Code: Regex parse "{firstName} {phone}"
  → Match: firstName + normalize phone to E.164
  → Reject if not parseable (Slack alert to owner: "Couldn't parse, format: 'FirstName +1XXXXXXXXXX'")
  ↓
Lookup clientId by intakePhone (Convex)
  ↓
POST Convex /reviews/customer-add-via-text
  ↓
Update intakeActivity.lastIntakeAt
  ↓
Slack notify to #review-engine-ops
```

---

## WF-REV-01: Check-in SMS

**Trigger**: `*/20 8-20 * * *` ET

```
Schedule
  ↓
GET Convex /reviews/pending-checkin?limit=100
  ↓
Code: Filter by RECIPIENT quiet hours
  → localHour(customer.phoneAreaCode || client.timezone) BETWEEN 8 AND 21
  → Skip if outside window (retry next cycle)
  ↓
SplitInBatches (10)
  ↓
Code: Build SMS body from template
  ↓
POST Close /activity/sms/
  ↓
POST Convex /reviews/mark-sent (stage=1)
  ↓
Wait 1.5s → Loop
```

**Close SMS**:
```json
{
  "lead_id": "{{ closeLeadId }}",
  "contact_id": "{{ closeContactId }}",
  "direction": "outbound",
  "status": "outbox",
  "local_phone": "{{ clientSenderPhone }}",
  "remote_phone": "{{ phone }}",
  "text": "Hey {{ firstName }}, this is {{ clientOwnerFirstName }} from {{ clientBusinessName }}. Just checking in to make sure everything looks good with the work we did today."
}
```

---

## WF-REV-02: Review Request + Nudge

Copy WF-NW-03 skeleton. **Add service recovery check + quiet hours + recipient-local TZ.**

```js
const GAP_HOURS = { 2: 2, 3: 72 };
const MAX_TOUCHES = 3;

// Recipient local time check
const localHour = getLocalHour(c.phoneAreaCode || c.timezone);
if (localHour < 8 || localHour >= 21) continue;

// Service recovery gate — new in v2
if (c.checkinNegative) continue;

const TEMPLATES = {
  2: "Hi {firstName}, {ownerFirstName} here from {businessName}. Just wanted to say thanks again for the opportunity to work with you. If you have 30 seconds, would you mind sharing your experience in a quick Google review? {reviewLink} It helps other customers know they can trust us.",
  3: "Just a quick follow-up. If you haven't had a chance yet, we'd really appreciate a quick Google review. It helps others know they can trust us. {reviewLink}"
};
```

Sticky sender + Close inbound reply check (same as WF-NW-03).

---

## WF-REV-03: Reactivation Trickler

**Trigger**: `*/12 9-19 * * 1-5` ET

```
Schedule
  ↓
Loop active reactivation batches
  ↓
Check per-client cap: skip if today's sent >= 50
  ↓
Insert 2-3 customers into main queue (jobCompletedAt = now - 3hr)
  ↓
Feeds into WF-REV-01 → 02 flow
```

Adam's "2-3 every 20 min" pace = ~50/day/client cap.

---

## WF-REV-04: AI Auto-Response

**Trigger**: `*/15 * * * *`

```
Schedule
  ↓
GET Convex /reviews/clients-with-gbp-active
  → Only clients past 7-day GBP cooldown
  ↓
For each client:
  → GBP API GET /accounts/{id}/locations/{id}/reviews
  → Filter new (not in reviewResponses table)
  → For each new:
    → Claude prompt (see 10-ai-response-system.md)
    → POST Convex /reviews/response-drafted
    → Branch on rating:
      ├─ 4-5 stars: 
      │   Wait 10 min
      │   POST GBP API /reply
      │   POST Convex /reviews/response-posted
      │   Slack: "✅ Auto-posted for {client}"
      └─ 1-3 stars:
          Post to Slack #review-engine-approvals with buttons [Approve] [Edit] [Skip]
          Wait for callback (max 60 min)
          If no callback: auto-post as fallback
```

---

## WF-REV-05: Weekly Competitor Report

**Trigger**: Monday 9AM ET

```
Schedule
  ↓
GET Convex /reviews/clients-due-for-report
  ↓
For each client:
  → GBP API: get client review count + avg rating
  → SerpAPI: search "{niche} {city}" → get top 3 competitors' place IDs (from client.competitorPlaceIds)
  → GBP API for each competitor: review count + avg rating
  → Compare to last week's snapshot from Convex
  → Build report data
  → POST Convex /reviews/competitor-snapshot (store)
  → Render Markdown → HTML email
  → POST Postmark /email
    Subject: "Your Review Engine Report — {businessName} vs Competitors"
```

---

## WF-REV-06: Intake Activity Check-in

**Trigger**: Daily 10AM ET

```
Schedule
  ↓
GET Convex /reviews/inactive-clients?daysInactive=7
  ↓
For each:
  → Close SMS to client.ownerPhone:
    "Hey {ownerFirstName}, haven't heard from you in a week. 
    Everything OK with Review Engine? Reply YES to snooze this 
    alert, HELP if you need support."
  → Update lastAlertSentAt
```

**Inbound webhook** (WF-REV-INBOUND) handles "YES" → snooze 7 days.

---

## WF-REV-INBOUND: Reply Router

**Trigger**: Close CRM inbound SMS webhook (all senders — customer replies to any client, plus owner alerts)

```
Webhook
  ↓
Route by sender/recipient:
  
  IF from customer to client's sender phone:
    ↓
    Regex STOP/UNSUBSCRIBE → POST Convex /opt-out → END
    ↓
    Claude classify sentiment:
      System: "Classify SMS reply as positive/neutral/negative. Reply with one word only."
      User: "{{ text }}"
    ↓
    POST Convex /reviews/checkin-reply { customerId, text, sentiment }
    ↓
    IF sentiment=negative:
      → Text owner phone: "🚨 {firstName} just replied to your check-in: '{text}' — give them a call. Review request suppressed."
      → Slack alert
  
  IF from owner to intake number (parsed as customer):
    → Delegate to WF-REV-INTAKE
  
  IF from owner replying "YES" to inactivity alert:
    → POST Convex /reviews/intake-snoozed { clientId, snoozeDays: 7 }
    → Reply: "Snoozed for 7 days. Text me when you have customers."
```

---

## WF-REV-AUDIT: Pre-Demo Audit Generator

**Trigger**: Close CRM lead tagged `review-engine-icp-roofing` moving to `Enriched` status.

```
Webhook / Cron scan
  ↓
GET SerpAPI: their business by phone/name → GBP data
  ↓
GET SerpAPI: "roofers {city}" → top 3 competitors GBP data
  ↓
Claude: build 1-pager Markdown with:
  → Business review count vs competitors
  → Rating comparison
  → "Reviews/month" velocity trend
  → 1-sentence recommendation
  ↓
Render to PDF (using pdfmonkey or Puppeteer via HTTP)
  ↓
Store URL in Close CRM lead custom field cf_reviewSalesAuditUrl
  ↓
Slack notify: "Audit ready for {businessName}"
```

Used in Day 6 outreach cadence + attached to demo booking confirmations.

---

## Testing Protocol

1. Deploy Convex tables + endpoints
2. Insert self as test `reviewClient` with dedicated intake number
3. Text intake number: "Sarah Test +15555551234" → verify Convex row created
4. Manually trigger WF-REV-01 → verify SMS arrives on test phone
5. Reply "It's still broken" → verify sentiment=negative → verify owner alert + Msg 2 suppressed
6. Reset test customer, verify positive reply flow → Msg 2 arrives with link
7. Click link → verify Convex click logged + redirect
8. Wait 3 days (or fake timestamp) → verify Msg 3
9. Post fake Google review → verify WF-REV-04 → Slack approval for 1-star, auto-post for 5-star
10. Run WF-REV-05 → verify weekly report email arrives
11. Skip intake for 7 days → verify WF-REV-06 alert fires
