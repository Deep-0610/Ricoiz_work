# 06. Close CRM Setup

**Account**: Existing (same as WF-NW-02/03)
**Cred**: `zX24LQcydXoiwuvk` (reuse)
**API**: `https://api.close.com/api/v1`

## Two Pipelines

### 1. Review Engine — Sales
Outbound to roofing companies (our prospects).

Statuses: New → Enriched (audit generated) → Contacted → Followup → Replied → Demo Booked → Won → Lost

### 2. Review Engine — Delivery
Client's customers (SMS drip targets).

Statuses: Pending → Checkin Sent → **Negative Reply (Suppressed)** → Review Requested → Nudge Sent → Reviewed → Opted Out

## Custom Fields

### Sales Pipeline
| Field | Type |
|---|---|
| `cf_reviewSalesCurrentReviewCount` | Number |
| `cf_reviewSalesGooglePlaceId` | Text |
| `cf_reviewSalesCity` | Text |
| `cf_reviewSalesAuditUrl` | Text (link to PDF) |
| `cf_reviewSalesStage` | Number (0-4) |
| `cf_reviewSalesLastTouch` | Date |

### Delivery Pipeline
| Field | Type |
|---|---|
| `cf_reviewClientId` | Text (Convex ID) |
| `cf_reviewCustomerId` | Text (Convex ID) |
| `cf_reviewStage` | Number (0-3) |
| `cf_reviewNegativeReply` | Checkbox |
| `cf_reviewSourceType` | Text (`reactivation`/`ongoing`/`manual`) |

## Sender Phones

**Two number types per client**:

1. **Sender phone** — outbound review request SMS to customers ($1.15/mo)
2. **Intake phone** — owner texts customer info here ($1.15/mo)

Total per client: 2 numbers × $1.15 = $2.30/mo per client.

## A2P 10DLC Registration — ISV Framing

**Critical**: Frame the campaign use case as ISV, not marketing.

- Brand: Legal entity (new Review Engine LLC)
- Campaign type: **Standard - Mixed**
- Use case description: **"Review request platform sending on behalf of local business customers. Each end-business is a client of the platform. Messages are sent to consumers who transacted with the end-business. Consent captured by end-business via signed service agreement or checkbox at time of transaction."**
- Sample messages: Adam's 3 templates
- Opt-in method: "End-business collects consent from consumer at time of service transaction"
- Opt-out: "STOP handled at platform level, honored globally"

**Aegis Enhanced Vetting** ($95 one-time): unlocks 200K/day T-Mobile cap. Worth it.

## SMS API Reference

```
POST https://api.close.com/api/v1/activity/sms/
Auth: httpBasicAuth (zX24LQcydXoiwuvk)
Body:
{
  "lead_id": "...",
  "contact_id": "...",
  "direction": "outbound",
  "status": "outbox",
  "local_phone": "+14406434827",   // sender
  "remote_phone": "+14155551234",   // customer
  "text": "..."
}
```

## Inbound Webhook

**Purpose**: Route replies (customer STOP, customer check-in reply, owner intake text, owner snooze reply).

Setup:
- Close CRM → Settings → Webhooks → New
- Event: `activity.created`
- Filter: `type=sms AND direction=inbound`
- URL: `https://n8n.YOUR_N8N_HOST/webhook/wf-rev-inbound`

n8n WF-REV-INBOUND routes by number/context.

## Setup Checklist

- [ ] Create 2 pipelines with statuses
- [ ] Create 6 custom fields for Sales pipeline
- [ ] Create 5 custom fields for Delivery pipeline
- [ ] Get all `cf_*` IDs, update workflow JSONs
- [ ] Purchase 3 sales sender phones ($3.45/mo)
- [ ] Register A2P 10DLC Brand + Enhanced Vetting ($46 + $95)
- [ ] Register Campaign as ISV Standard-Mixed ($15 + $10/mo)
- [ ] Setup inbound webhook → n8n
- [ ] Per client onboarding: purchase 2 dedicated numbers (sender + intake)
