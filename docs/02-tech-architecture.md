# 02. Tech Architecture

**Reuse everything. Zero new vendor contracts.**

## Stack

| Layer | Tool | Notes |
|---|---|---|
| SMS + inbound parsing | **Close CRM** | Existing. Cred `zX24LQcydXoiwuvk`. Mirror WF-NW-02/03 pattern |
| State | **Convex `YOUR_CONVEX_DEPLOYMENT`** | Existing deployment. New tables added |
| Click tracking | **Convex HTTP endpoint** | `go.<domain>/r/<id>` own-domain redirect |
| Automation | **n8n** | Existing instance `YOUR_N8N_HOST` |
| AI | **Claude via OpenRouter** | Existing. Haiku 4.5 for responses |
| Google reviews API | **GBP API via Manager access** | Client adds `reviews@<domain>` as Manager. **7-day cooldown before API activation** |
| Competitor data | **SerpAPI Basic** | $75/mo. Powers weekly competitor report |
| Landing + billing | Vercel + Stripe | Existing |
| A2P 10DLC | **ISV framing** — "review request platform sending on behalf of local business customers" | ~$150 one-time |

## Full System Flow

```
Owner texts "John Smith 330-555-0142" to dedicated intake line
    ↓
Close CRM inbound webhook → n8n WF-REV-INTAKE
    ↓
Parse name + phone → POST Convex /reviews/customer-add-via-text
    ↓
Convex creates reviewCustomer with jobCompletedAt = now
    ↓ (2 hours pass, within recipient's quiet hours)
n8n WF-REV-01 sends Message 1 (check-in) via Close CRM
    ↓
Customer replies:
  ├─ Negative sentiment → n8n WF-REV-INBOUND routes to owner phone
  │  → Convex marks checkinNegative=true → suppresses Msg 2 & 3
  ├─ Positive/no reply → 2hr wait
  ↓
n8n WF-REV-02 sends Message 2 with tracked review link
    ↓
Link URL: https://go.<domain>/r/<customerId>
    ↓
Customer clicks → Convex logs click → 302 redirect to Google review URL
    ↓
No click after 3 days → WF-REV-02 sends Message 3 (nudge)
    ↓
Customer leaves Google review
    ↓
n8n WF-REV-04 polls GBP API every 15 min (per active client)
    ↓
Claude drafts response in owner's voice
    ↓
Rating branch:
  ├─ 4-5 stars → Auto-post via GBP API
  └─ 1-3 stars → Slack approval (60-min SLA, auto-post fallback)
    ↓
Weekly cron (Monday 9AM):
  → WF-REV-05 pulls SerpAPI competitor data
  → Generates weekly report per client
  → Emails via Postmark
    ↓
Daily cron (10AM):
  → WF-REV-06 checks intake activity per client
  → If no intake in 7 days → SMS owner: "Everything OK?"
```

## Reactivation Flow

```
Client uploads past customer CSV during onboarding
    ↓
Manual admin: upload to Convex reviewCustomers with source='reactivation'
    ↓
n8n WF-REV-03 (every 12 min, business hours, Mon-Fri):
  → Insert 2-3 customers into main drip queue
  → ≤50/day cap per client
  → Feeds into WF-REV-01 → 02 flow above
```

## Compliance Baked In

- **Quiet hours**: n8n gate checks recipient local time (8AM-9PM) before every send
  - Default: client's timezone (from onboarding)
  - Override: NPA area code lookup for per-customer TZ
- **STOP handling**: Close CRM auto-suppress + Convex global opt-out table (across all clients)
- **No gating**: same review link to everyone
- **Per-intake attestation**: ToS clause covers ongoing owner-texts-us intake

## Naming

- All workflows: `WF-REV-*` prefix
- Tag in n8n: `review-engine`
- Slack channels: `#review-engine-ops`, `#review-engine-approvals`, `#review-engine-alerts`

## GBP Manager Access — Critical Detail

**Google enforces a 7-day cooldown** after a new Manager accepts the invite before that Manager can post review responses.

Onboarding day → Client accepts our Manager invite → Day 8 → Full API access.

Days 1-7: reactivation SMS drip runs immediately. AI response system polls but only stores reviews. Auto-posting activates Day 8.
