# Review Engine — Launch Checklist

**Status**: ✅ **Backend & workflows READY** — pending config only.

**What Claude built** (2026-07-10):
- ✅ Convex deployed to `YOUR_CONVEX_DEPLOYMENT` (schema + 30 endpoints + 23 indexes live)
- ✅ Auth token generated + set in Convex env
- ✅ n8n auth credential created (`YOUR_CONVEX_CRED` — "Convex (review-engine)")
- ✅ 17 HTTP nodes across 8 workflows now authenticated to Convex
- ✅ 3 CRITICAL workflow fixes shipped (WF-REV-02 sticky sender, WF-REV-INTAKE parse/opt-out, WF-REV-INBOUND HELP/opt-out ack)
- ✅ All 3 fixed workflows pass n8n validation

**What YOU (Owner) must do to launch** — everything below is manual config work.

---

## 🎯 Phase 1 Launch Target

**4 paying clients** at $297/mo = **$1,188 MRR**. Manual delivery. Prove product-market fit before Phase 2 automation.

Timeline: **30-45 days**.

---

## 🔐 Live Credentials (Save These)

| Item | Value |
|---|---|
| Convex deploy key | `dev:YOUR_CONVEX_DEPLOYMENT\|YOUR_CONVEX_DEPLOY_KEY` |
| Convex API host | `https://YOUR_CONVEX_DEPLOYMENT` |
| Convex dashboard | `https://dashboard.convex.dev/d/YOUR_CONVEX_DEPLOYMENT` |
| Convex Bearer token (n8n) | `YOUR_BEARER_TOKEN` |
| n8n auth cred ID | `YOUR_CONVEX_CRED` (name: "Convex (review-engine)") |
| Close CRM cred | `zX24LQcydXoiwuvk` (already attached to SMS nodes) |

---

## 📋 Launch Steps (Do These In Order)

### Step 1 — Legal & Brand (Day 1, 2 hrs)

- [ ] File LLC ($300, Delaware or your state) — pick **brand name first**
- [ ] Register domain ($12/yr) — recommend `.co` (`reviewlift.co`, `reviewbolt.co`, etc.)
- [ ] Buy business phone number ($10/mo Close CRM) — for owner alerts + sales

**Options considered but rejected**: skip DBA (too limited), skip S-corp (too early).

### Step 2 — Compliance (Days 1-14, 30 min setup then wait)

**A2P 10DLC** — required for SMS to work at scale.

- [ ] TCR Brand registration: **$46 one-time** (Close CRM UI)
- [ ] **Aegis Enhanced Vetting**: **$95 one-time** (unlocks 6K MPS throughput)
- [ ] Campaign registration: **$15 one-time + $10/mo** — use ISV framing:
  - Use case: `Mixed`
  - Message flow: "Customer opts in via texting business owner. Owner adds customer via SaaS platform. Customer receives review request SMS."
  - Sample messages: use the 3 templates from `docs/07-sms-templates.md`
- [ ] Wait 5-14 days for TCR approval

**Do NOT skip this.** Non-registered SMS gets filtered/blocked by carriers.

### Step 3 — Google Form Setup (Day 2, 20 min)

- [ ] Create Google Form for onboarding (fields: business name, owner name, phone, industry, GBP link, timezone) — this replaces the landing page for Phase 1

**Slack removed from Phase 1** — all owner notifications happen via SMS instead (confirmation on intake, service recovery alerts on negative reply).

### Step 4 — Payment (Day 2, 30 min)

- [ ] Create Stripe account (personal is fine to start)
- [ ] Create **Payment Link 1**: $297/mo recurring subscription
- [ ] Create **Payment Link 2**: $497 one-time setup fee
- [ ] Add note in each: "Founding 5: setup fee waived — use promo code FOUNDING5"
- [ ] Create promo code: `FOUNDING5` = 100% off setup fee

### Step 5 — n8n Environment (Day 3, 10 min)

Set these in n8n instance environment (Settings → Variables):

```bash
# Already using the credential — no env var needed
# But add these for OpenRouter (WF-REV-INBOUND sentiment):
OPENROUTER_API_KEY=sk-or-v1-XXXXXXXXXX
```

Get key from https://openrouter.ai (~$5 will last months at Haiku pricing).

### Step 6 — Sanity Test Convex (Day 3, 10 min)

Verify everything works end-to-end:

```bash
TOKEN="YOUR_BEARER_TOKEN"

# Test 1: unauthorized → 401
curl -w "\n%{http_code}\n" "https://YOUR_CONVEX_DEPLOYMENT/reviews/pending-checkin?clientId=x"
# expect: HTTP 401

# Test 2: authorized empty → 200
curl -H "Authorization: Bearer $TOKEN" \
     "https://YOUR_CONVEX_DEPLOYMENT/reviews/pending-checkin?clientId=x"
# expect: {"count":0,"customers":[]}

# Test 3: create test client
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"businessName":"Test Roofing","ownerFirstName":"Bob","ownerPhone":"+15550001111","industry":"roofing","googlePlaceId":"test","reviewLink":"https://g.page/test","timezone":"America/New_York","intakePhone":"+15550009999","stripeCustomerId":"cus_test"}' \
     "https://YOUR_CONVEX_DEPLOYMENT/reviews/client-create"
```

If all three pass — you're wired up.

### Step 7 — Set Up Test Client In Close CRM (Day 3, 20 min)

- [ ] Create test lead in Close CRM: "Review Engine — Test Client"
- [ ] Buy a Close CRM phone number → this is the **intake number** (owner will text customer names to this)
- [ ] Buy another Close CRM number → this is the **outbound sender** (drip messages come from this)
- [ ] Configure Close CRM webhook → `https://<n8n>/webhook/wf-rev-intake` (WF-REV-INTAKE) for intake number
- [ ] Configure Close CRM webhook → `https://<n8n>/webhook/wf-rev-inbound` (WF-REV-INBOUND) for outbound number

### Step 8 — Activate Workflows (Day 3, 5 min)

Activate in this order (dependency-safe):

1. [ ] **WF-REV-INBOUND** (`HlT2QFEN7SCRRMPx`) — must be live BEFORE any outbound
2. [ ] **WF-REV-INTAKE** (`GeQ77pMpqmStS2vm`) — parses owner texts
3. [ ] **WF-REV-01** (`DUVa1wiGyyVDSOEy`) — Msg 1
4. [ ] **WF-REV-02** (`tPGFuGBU4ZQ6LRUP`) — Msg 2 + Msg 3
5. [ ] **WF-REV-06** (`pECNIbyOGCRfOQgj`) — intake activity check-in
6. [ ] **WF-REV-03** (`rHMxwvSUYdqq1grD`) — reactivation trickler (activate ONLY after CSV uploaded)

**Do NOT activate in Phase 1**: WF-REV-04 (AI response — do manual), WF-REV-05 (weekly report — do manual Gmail), all 3 sales workflows (do manual Close CRM).

### Step 9 — End-to-End Test With Yourself (Day 3-4, 30 min)

1. [ ] Text your intake number: `TestName +1YOUR_CELL`
2. [ ] Expect: SMS back "Got it — TestName added. Check-in text goes out in 2 hours."
3. [ ] Wait 2 hrs → expect Msg 1 arrives on your cell
4. [ ] Reply "yes" → expect Msg 2 (review request) 2 hrs later
5. [ ] Don't click → wait 72 hrs → expect Msg 3 (nudge)
6. [ ] Reply "STOP" from cell → expect opt-out confirmation SMS
7. [ ] Text intake with garbage: `asdfasdf` → expect "Couldn't read that" SMS back

**If all 7 work → workflow layer is production-ready.**

### Step 10 — Get First Client (Days 4-14)

- [ ] Filter Close CRM leads → tag 100 roofers with `review-engine-icp-roofing`
- [ ] Manual outbound via Close CRM UI (NOT Instantly per project rule) using SALES-01 templates from `docs/07-sms-templates.md`
- [ ] Book demos → conduct via Zoom / Google Meet
- [ ] Close on Founding 5 offer ($0 setup / $297/mo / 60-day testimonial contingency)
- [ ] Send Stripe Payment Link + Google Form onboarding link
- [ ] Once paid + form filled → provision:
  - [ ] Buy 2 Close CRM numbers (intake + outbound sender) for client
  - [ ] `curl POST /reviews/client-create` with their data
  - [ ] Text owner: "You're set. Text me a name+phone anytime after a job."

---

## 🚨 Known Limitations (Phase 1)

These are intentionally NOT built. Do them manually until Phase 2.

| Not built | Manual workaround |
|---|---|
| AI review response (WF-REV-04) | Get Gmail alert on new Google review → paste in Claude → post to GBP |
| Weekly competitor report (WF-REV-05) | Every Monday 9AM: manually compare client's GBP vs top 3 rivals → Gmail |
| Pre-demo audit PDF (WF-REV-AUDIT) | Google their business + top 3 rivals live during the demo |
| Sales cadence (WF-REV-SALES-01/02/03) | Close CRM UI — manual send + inbox monitor |
| Stripe webhook (auto-provision) | Manual: on Stripe payment → run `client-create` curl |
| Reactivation CSV parser | Manual: transform CSV → `curl POST /reviews/reactivation-batch-create` |
| GBP OAuth | Ask each client for Google Business Profile manager access (7-day cooldown) |

---

## 💵 Phase 1 Total Cost (First 45 Days)

| Item | Cost |
|---|---|
| LLC filing | $300 (one-time) |
| Domain | $12 (one-time) |
| A2P Brand + Aegis + Campaign | $46 + $95 + $15 = $156 (one-time) |
| A2P monthly | $10/mo |
| Close CRM numbers (5 total: 1 sales + 2 per test client + 2 per real client) | $50/mo |
| Convex | $0 (dev tier free) |
| OpenRouter (Claude Haiku) | ~$5/mo at Phase 1 volume |
| Slack | $0 (free tier) |
| Stripe | 2.9% + 30¢ per transaction |
| **Total upfront** | **~$500** |
| **Monthly (at 4 clients)** | **~$75/mo** |

At $1,188 MRR - $75 costs = **~$1,113/mo profit** covering your time.

---

## 📈 Phase 2 Trigger

Move to Phase 2 ONLY when ALL true:
- [ ] 4 paying clients for 30+ days
- [ ] ≥2 Founding 5 testimonials collected (real Google reviews delivered)
- [ ] You are spending 2-3 hrs/day on manual delivery (proof automation ROI)
- [ ] Zero customer complaints (product works)

Then: unarchive `_disabled/stripe.ts.bak`, build 6 remaining workflows, deploy landing page. See `docs/PHASE-2-AUTOMATION.md`.

---

## 🆘 If Something Breaks

**Convex errors** → check dashboard: `https://dashboard.convex.dev/d/YOUR_CONVEX_DEPLOYMENT`

**n8n workflow fails** → n8n UI → Executions → click the failed run

**Compliance issue** (message filtering, STOP not working) → check `docs/11-compliance.md`

**SMS arriving from wrong number** → sticky sender bug — verify Close CRM SMS history endpoint returns data (WF-REV-02 depends on this)

**No opt-out working** → check `POST /reviews/opt-out` in Convex logs; verify STOP variants trigger via `detectOptOut()` in `optOuts.ts:75`

**A2P rejected** → most common reason is not using ISV framing. Revise campaign description to explicitly name yourself as the SaaS provider.

---

## 📞 Support Contacts

- Close CRM API docs: https://developer.close.com
- Convex support: `support@convex.dev`
- OpenRouter status: https://status.openrouter.ai
- n8n community: https://community.n8n.io

---

**BOTTOM LINE**: Backend + workflows are DONE. All that's left is legal/branding config (~$500 upfront), A2P registration (~$156 + $10/mo), and getting the first client on the phone. You could have your first client onboarded within 2-3 weeks.

Ship it. 🚀
