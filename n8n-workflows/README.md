# n8n Workflows — Review Engine

**All 12 workflows created**: 2026-07-10
**Status**: All INACTIVE (skeletons — not running yet)
**n8n instance**: `YOUR_N8N_HOST`
**Timezone**: `America/New_York`
**Convex deployment**: `YOUR_CONVEX_DEPLOYMENT.convex.site`
**Close CRM cred**: `zX24LQcydXoiwuvk` (Close API - website-lead)

---

## Workflow Registry (12 total)

### 🚚 Delivery Workflows (9)

| ID | Workflow Name | n8n ID | Purpose | Trigger |
|---|---|---|---|---|
| 1 | **WF-REV-INTAKE** | `GeQ77pMpqmStS2vm` | Parses owner's intake text ("Sarah Johnson +14155551234") → creates customer in Convex → starts drip | Webhook (Close CRM inbound on intake number) |
| 2 | **WF-REV-01** | `DUVa1wiGyyVDSOEy` | Sends Message 1 (check-in "everything look good?") 2hr after job completion, within recipient's quiet hours | Cron `*/20 8-20 * * *` ET |
| 3 | **WF-REV-02** | `tPGFuGBU4ZQ6LRUP` | Sends Message 2 (review request + link) 2hr after Msg 1, OR Message 3 (nudge) 72hr after Msg 2 if link not clicked. **Suppressed if service recovery triggered.** | Cron `0 9-20 * * *` ET |
| 4 | **WF-REV-03** | `rHMxwvSUYdqq1grD` | Reactivation trickler — inserts 2-3 past customers into main drip queue every 12 min, ≤50/day/client cap | Cron `*/12 9-19 * * 1-5` ET |
| 5 | **WF-REV-04** | `yNrNjvLuHshziZrt` | Polls GBP API for new Google reviews, Claude drafts response, **4-5 stars auto-post / 1-3 stars Slack approval** (60-min SLA) | Cron `*/15 * * * *` |
| 6 | **WF-REV-05** | `RsP84OorydRf1aHD` | Weekly competitor report to each client — "you vs your top 3 local rivals" (retention weapon) | Cron `0 9 * * 1` ET (Mondays 9AM) |
| 7 | **WF-REV-06** | `pECNIbyOGCRfOQgj` | Owner intake activity check-in — if no intake in 7 days, text owner "Everything OK?" (earliest churn signal) | Cron `0 10 * * *` ET (daily 10AM) |
| 8 | **WF-REV-INBOUND** | `HlT2QFEN7SCRRMPx` | Routes ALL Close CRM inbound SMS: STOP → global opt-out; YES → snooze; positive → advance drip; **negative → service recovery** (alert owner, suppress Msg 2 & 3) | Webhook (Close CRM inbound, all senders) |
| 9 | **WF-REV-AUDIT** | `QxUh1lOdz0J7iVA7` | Auto-generates pre-demo audit PDF for each sales lead: their GBP data vs top 3 competitors from SerpAPI + Claude summary | Webhook (Close CRM lead → Enriched status) |

### 💼 Sales Workflows (3)

| ID | Workflow Name | n8n ID | Purpose | Trigger |
|---|---|---|---|---|
| 10 | **WF-REV-SALES-01** | `gu8zhYus2oCpndfC` | Sends Day 1 hook SMS to fresh roofing leads tagged `review-engine-icp-roofing`. Updates Close stage to 1. | Cron `0 10 * * *` ET (daily 10AM) |
| 11 | **WF-REV-SALES-02** | `3V262nDC4JOVr2QB` | Sends Day 3/6/10 followup messages based on lead stage + last touch. Day 6 attaches audit URL. Day 10 = breakup. | Cron `0 11 * * *` ET (daily 11AM) |
| 12 | **WF-REV-SALES-03** | `iMvWD4MunnR6HEpv` | Routes inbound replies to sales leads: **positive → Slack book-demo alert**; stop → do not contact; pricing → send FAQ; else → Slack manual | Webhook (Close CRM inbound on sales pipeline) |

---

## Full Flow (How These Connect)

### Delivery Flow
```
Owner texts intake # → WF-REV-INTAKE parses → Convex customer created
    ↓ 2hr later
WF-REV-01 sends Msg 1 (check-in)
    ↓ customer replies
WF-REV-INBOUND routes:
   ├─ Negative sentiment → alert owner + set checkinNegative=true
   └─ Positive/no reply → 2hr wait
    ↓
WF-REV-02 sends Msg 2 (unless suppressed) with go.<domain>/r/<id>
    ↓ if no click for 3 days
WF-REV-02 sends Msg 3 (nudge)
    ↓ customer leaves Google review
WF-REV-04 polls GBP → Claude draft:
   ├─ 4-5 stars → auto-post
   └─ 1-3 stars → Slack approval → post

Meanwhile:
- WF-REV-03 trickles past customer CSV into drip queue
- WF-REV-05 sends weekly competitor report every Monday 9AM
- WF-REV-06 checks owner intake activity daily 10AM
```

### Sales Flow
```
Close CRM lead tagged review-engine-icp-roofing → Enriched status
    ↓
WF-REV-AUDIT generates pre-demo PDF (SerpAPI + Claude + PDFMonkey)
    ↓
WF-REV-SALES-01 sends Day 1 hook (10AM daily)
    ↓ Day 3, 6, 10
WF-REV-SALES-02 sends followups (11AM daily, gate by touch + days elapsed)
    ↓ prospect replies
WF-REV-SALES-03 routes:
   ├─ Positive → Slack #review-engine-wins with Calendly link
   ├─ Stop → mark do not contact
   ├─ Pricing → Slack #review-engine-ops for manual reply
   └─ Else → Slack #review-engine-ops for manual reply
```

---

## Environment Variables Required

Set these in n8n instance environment before activation:

```bash
# Convex (webhook auth)
CONVEX_AUTH_TOKEN=vlt_XXXXXXXXXX

# Claude via OpenRouter
OPENROUTER_API_KEY=sk-or-v1-XXXXXXXXXX

# SerpAPI
SERPAPI_KEY=XXXXXXXXXX

# Postmark (weekly reports)
POSTMARK_TOKEN=XXXXXXXXXX

# PDFMonkey (audit generation)
PDFMONKEY_TOKEN=XXXXXXXXXX

# Sales sender phones (rotate 3)
REVIEW_SALES_SENDER_1=+1XXXXXXXXXX
REVIEW_SALES_SENDER_2=+1XXXXXXXXXX
REVIEW_SALES_SENDER_3=+1XXXXXXXXXX
```

---

## Convex Endpoints Referenced

All at `https://YOUR_CONVEX_DEPLOYMENT/reviews/*`:

- `POST /customer-add-via-text` (WF-REV-INTAKE)
- `GET /client-by-intake-phone` (WF-REV-INTAKE)
- `GET /pending-checkin` (WF-REV-01)
- `GET /sms-batch` (WF-REV-02)
- `POST /mark-sent` (WF-REV-01, WF-REV-02)
- `GET /active-reactivations` (WF-REV-03)
- `POST /reactivation-tick` (WF-REV-03)
- `GET /clients-with-gbp-active` (WF-REV-04)
- `POST /response-drafted` (WF-REV-04)
- `POST /response-posted` (WF-REV-04)
- `GET /active-clients` (WF-REV-05)
- `POST /competitor-snapshot` (WF-REV-05)
- `GET /inactive-clients?daysInactive=7` (WF-REV-06)
- `POST /intake-alert-sent` (WF-REV-06)
- `POST /opt-out` (WF-REV-INBOUND)
- `POST /intake-snoozed` (WF-REV-INBOUND)
- `POST /checkin-reply` (WF-REV-INBOUND)

---

## Slack Webhooks Referenced

Replace `PLACEHOLDER` in the workflows with real webhook URLs:

- `#review-engine-ops` — WF-REV-INTAKE, WF-REV-AUDIT, WF-REV-SALES-03 (fallback)
- `#review-engine-approvals` — WF-REV-04 (1-3 star review approvals)
- `#review-engine-wins` — WF-REV-SALES-03 (positive replies / demo bookings)
- `#review-engine-alerts` — WF-REV-INBOUND (service recovery)

---

## Pre-Activation Checklist

Before activating any workflow, complete these:

### Infrastructure
- [ ] Convex `YOUR_CONVEX_DEPLOYMENT` — deploy schema + all 17 HTTP endpoints
- [ ] Own-domain redirect: `go.<domain>` → Convex click tracker
- [ ] Close CRM — create 2 pipelines + 11 custom fields, get `cf_*` IDs
- [ ] Close CRM — purchase 3 sales sender phones + register to A2P campaign
- [ ] A2P 10DLC Brand + Aegis Enhanced Vetting approved
- [ ] A2P Campaign approved (ISV framing)
- [ ] SerpAPI Basic account active ($75/mo)
- [ ] PDFMonkey account + audit template created
- [ ] Postmark server + sender domain verified
- [ ] Slack webhooks created for 4 channels
- [ ] Google `reviews@<domain>` account provisioned

### Credentials to Add in n8n
- [ ] Environment variables above set
- [ ] `Close API (website-lead)` credential verified (`zX24LQcydXoiwuvk`)

### Placeholder Cleanup (in each workflow)
- [ ] Replace all Slack webhook `PLACEHOLDER` URLs
- [ ] Replace `TEMPLATE_ID_PLACEHOLDER` in WF-REV-AUDIT with PDFMonkey template ID
- [ ] Verify Convex URL matches your deployment
- [ ] Test webhook URLs for all 4 webhook-triggered workflows

### Testing Sequence (before going live per client)
1. Deploy Convex schema + endpoints
2. Insert test client + test customer (self)
3. Manually trigger WF-REV-01 → verify SMS arrives
4. Reply negative → verify WF-REV-INBOUND alert + Msg 2 suppression
5. Reply positive → verify Msg 2 arrives
6. Click link → verify Convex click log
7. Wait / fake timestamp → verify Msg 3 arrives if no click
8. Post fake Google review → verify WF-REV-04 auto-post (5-star) or Slack approval (1-star)
9. Trigger WF-REV-06 → verify inactivity alert to test owner phone
10. Trigger WF-REV-05 → verify weekly report email

---

## Activation Order (When Ready)

Activate in this sequence to avoid dependencies breaking:

1. **First** (support infrastructure):
   - WF-REV-INBOUND (must be live before any outbound SMS)
   - WF-REV-INTAKE (parse owner texts)

2. **Second** (delivery core):
   - WF-REV-01 (Msg 1)
   - WF-REV-02 (Msg 2 + 3)
   - WF-REV-03 (Reactivation trickler)

3. **Third** (AI + reporting):
   - WF-REV-04 (AI auto-response)
   - WF-REV-05 (Weekly competitor report)
   - WF-REV-06 (Intake inactivity check-in)

4. **Fourth** (sales — only after first paying client, when sales-facing workflows won't run on empty pipeline):
   - WF-REV-AUDIT (pre-demo audit)
   - WF-REV-SALES-01 (Day 1)
   - WF-REV-SALES-02 (followups)
   - WF-REV-SALES-03 (reply handler)

---

## Reference Workflows (Existing Pattern Mirrored)

These 12 workflows are structural mirrors of:
- **WF-NW-02** (`q1bEDwQodQmLmY6n`) — Daily 500 → Close + First SMS
- **WF-NW-03** (`nRKqnzXPVwdiAB4s`) — Followup SMS Only touches 2-4

Same conventions: Close CRM SMS activity endpoint, Convex state, `scheduleTrigger` cron, SplitInBatches(10) with Wait 1.5s rate-limit loop.

---

## Notes

- **All workflows created INACTIVE** — flip active flag manually per activation checklist
- **`saveDataSuccessExecution: "none"`** on all — successful runs hidden from execution log (per project convention, see memory `n8n-schedule-trigger-executions-hidden.md`). Verify by side effects.
- Skeletons include placeholder URLs (Slack, Postmark, PDFMonkey template ID) that must be replaced before activation
- Timezone `America/New_York` on all schedule triggers; individual recipient timezone determined in workflow logic (NPA area code lookup + client TZ default)
