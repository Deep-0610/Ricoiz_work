# Phase 2 — Automation Build (After 3-4 Clients)

**Trigger**: Only start Phase 2 AFTER meeting Phase 1 success criteria:
- 3-4 paying clients live for 30+ days
- Zero cancellations
- At least 1 Founding 5 testimonial received
- Manual delivery time exceeding 3 hrs/day
- Total MRR: $1,000+

**Goal**: Automate everything. Free up Owner from manual daily delivery. Scale to 20-50 clients.

**Timeline**: 2-3 weeks.

**Investment**: ~$300 additional (SerpAPI + Postmark + PDFMonkey signup fees).

---

## What We BUILD in Phase 2

### 1. AI Auto-Response Automation (Days 1-4)

**Build**: WF-REV-04 (AI Auto-Response) — full pipeline
- Google `reviews@<domain>` account provisioned
- Each client adds our account as GBP Manager during onboarding
- 7-day cooldown tracking (WF-REV-GBP-COOLDOWN-CHECK)
- Poll GBP API every 15 min per client
- Claude drafts response
- 4-5 star → 10-min delay → auto-post
- 1-3 star → Slack approval → 60-min SLA fallback
- Content filter
- Dedup by `gbpReviewId`
- Token refresh logic
- PolicyViolation handling

**Effort**: 3-4 days

**Kills**: 2 hrs/day of manual paste work.

### 2. Stripe Full Integration (Day 5)

**Build**: WF-REV-STRIPE-WEBHOOK + full landing page checkout flow
- Replace Stripe Payment Link with full Stripe Checkout API
- Auto-provision Convex client row on `checkout.session.completed`
- Handle subscription updated / deleted / payment failed
- Full landing page (`landing/`) with onboarding flow

**Effort**: 1-2 days

**Kills**: 30-45 min manual admin per new client onboarding.

### 3. Weekly Competitor Report Automation (Days 6-7)

**Build**: WF-REV-05
- SerpAPI account ($75/mo)
- Postmark email server ($15/mo)
- Snapshot comparison to last week
- HTML email template
- Weekly Monday 9AM cron

**Effort**: 2 days

**Kills**: 1 hr/week of manual competitor report emails.

### 4. Sales Cadence Automation (Days 8-10)

**Build**: WF-REV-SALES-01/02/03 + WF-REV-AUDIT (pre-demo audit)
- Day 1 hook + email
- Day 3/6/10 followups with sticky sender + reply detection
- Sales reply handler with STOP → global opt-out sync
- Pre-demo audit generator (SerpAPI + Claude + PDFMonkey)
- Sender rotation across 3 phones
- Landline detection

**Effort**: 2-3 days

**Kills**: 1-2 hrs/day of manual outbound.

### 5. Founding 5 + Guarantee + Warmup + CSV Parser (Days 11-13)

**Build**: 4 remaining workflows
- **WF-REV-GUARANTEE-MILESTONE**: Auto-detect 10-review milestone → SMS referral ask + Slack #wins
- **WF-REV-FOUNDING-CHECK**: Weekly check Founding 5 approaching deadline → alert + back-bill $497 if lapsed
- **WF-REV-WARMUP**: Auto-enforce Week 1: 50/day, Week 2: 200/day, Week 3: 500/day for new sender phones
- **WF-REV-REACTIVATION-CSV-PARSER**: Auto-parse CSV upload → normalize phones → bulk insert

**Effort**: 2 days

**Kills**: Google Sheet manual tracking of Founding 5 + guarantee + reactivation batches.

### 6. Referral Automation (Day 14)

**Build**: Full referral flow
- Landing page `/refer/[code]` pages activate
- Stripe promo code auto-generation on referral tracking
- Auto-credit referrer's next invoice on referred conversion

**Effort**: 1 day

**Kills**: Manual Stripe promo code creation.

### 7. Testing + Deployment (Days 15-16)

- End-to-end integration test of all new workflows
- Verify existing 6 Phase 1 workflows still work
- Deploy landing page updates to Vercel
- Update Convex with all Phase 2 endpoints (already coded)

**Effort**: 2 days

---

## Phase 2 Cost Structure

### Additional Fixed Monthly (Phase 2)
- SerpAPI Basic: $75
- Postmark: $15
- PDFMonkey (Pay-as-you-go): $10 estimated
- Additional Slack tier: $0 (still free)
- **Total additional fixed**: $100/mo

### Additional Variable (per client)
- SerpAPI amortized: $1/mo
- Postmark emails: $0.05/mo
- PDFMonkey (sales audits, not per client)
- **Additional variable per client**: ~$1/mo

### Full Phase 2 Cost at 20 Clients
- Fixed: $11 + $100 = $111/mo
- Variable: $17 × 20 = $340/mo
- **Total**: **$451/mo**
- **Revenue**: $297 × 20 = $5,940 MRR
- **Contribution profit**: **$5,489/mo** (92% margin)

---

## Phase 2 Success Criteria

Phase 2 automation is a success when:

- [ ] Owner's manual delivery time drops to <1 hr/day
- [ ] Zero manual paste of AI responses (100% via API)
- [ ] Zero manual weekly report emails (100% automated)
- [ ] Zero manual client provisioning (100% via Stripe webhook)
- [ ] Zero manual sales outreach (100% via WF-REV-SALES-*)
- [ ] Founding 5 back-billing 100% automated
- [ ] Referral credits 100% automated
- [ ] All 18 workflows (12 Phase 1 + 6 new) live and healthy
- [ ] Ability to onboard client in <1 hour of Owner time

---

## Phase 2 Timeline

### Week 1 (Days 1-7)
- Days 1-4: WF-REV-04 (AI response) + GBP OAuth verification setup
- Day 5: WF-REV-STRIPE-WEBHOOK + full landing page
- Days 6-7: WF-REV-05 (Weekly competitor report) + SerpAPI/Postmark setup

### Week 2 (Days 8-14)
- Days 8-10: WF-REV-SALES-01/02/03 + WF-REV-AUDIT (pre-demo)
- Days 11-13: WF-REV-GUARANTEE-MILESTONE + WF-REV-FOUNDING-CHECK + WF-REV-WARMUP + WF-REV-REACTIVATION-CSV-PARSER
- Day 14: Referral automation

### Week 3 (Days 15-16)
- End-to-end test + fixes
- Deploy + activate all Phase 2 workflows

**Result**: Full automation live by Day 16. Owner can now scale to 20-50 clients without more manual work.

---

## Phase 2 Scaling Model

After Phase 2 automation is live, growth scales without linear labor increase:

| Clients | Manual Hours/Day | Fixed Costs | Contribution Profit |
|---|---|---|---|
| 4 (Phase 1 end) | 2-3 hrs | $11 | ~$1,100 |
| 10 | 1 hr | $111 | ~$2,750 |
| 20 | 1 hr | $111 | ~$5,500 |
| 44 (target Month 12) | 1-2 hrs | $111 | ~$12,900 |

**Key insight**: Manual hours plateau at ~1 hour/day even as clients scale, because automation handles delivery.

---

## What to WATCH For During Phase 2

**Signs the automation is working**:
- Workflow execution success rate >99%
- Zero manual interventions per week
- Client dashboard usage (if built)
- Cancellation rate <5%/month

**Signs of trouble** (roll back specific workflow):
- Workflow errors requiring daily Slack review
- Clients complaining about AI response quality
- SLA breaches (60-min approval failing)
- Deliverability drops
- Opt-out rate >2% per campaign

---

## Bottom Line

**Phase 2 is only executed after Phase 1 proves the product works.**

No wasted engineering on a product that might not have market fit. Automate only what has been validated with real paying clients.

Right approach. Adam Erhart would approve.
