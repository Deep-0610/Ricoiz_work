# 15. Risk Mitigation

**v2 risks. Ordered by likelihood × impact.**

## 🔥 Critical Risks

### 1. Client uploads non-consenting list → TCPA claim ($500-1,500/msg)

**Damage**: $500-1,500 per message, potentially class-action = existential.

**Mitigations**:
- Structured consent attestation (method + date range + signed, not checkbox)
- Per-intake attestation in ToS covers ongoing owner texts
- ≤50/day reactivation trickle (limits blast radius)
- Recipient-local quiet hours enforcement
- 12-month lookback cap on reactivation
- ToS indemnification clause
- **E&O insurance at $5K MRR** (~$200/mo, sooner if any list >1K numbers)

### 2. A2P 10DLC Campaign rejected

**Damage**: Can't send outbound SMS to sell or deliver.

**Mitigations**:
- **ISV framing** in use case description from Day 1
- Detailed opt-in method documented
- Sample messages included in submission
- Fallback: toll-free numbers (limited throughput) during resubmission
- If rejected, resubmit within 24hr with revised framing

### 3. Google delists client GBP for review pattern

**Damage**: Client loses reviews, blames us, cancels + refund + reputation.

**Mitigations**:
- **Same link to everyone** (no gating — service recovery suppresses ask, not filter)
- Reactivation pace ≤50/day
- No incentive language in templates
- Monitor GBP suspension notifications
- Pause client workflows immediately if suspension detected
- Guide client through appeal process

### 4. Owner won't send intake texts → silent churn

**Damage**: Client "stops using it," cancels in Month 2-3.

**Mitigations**:
- **7-day inactivity SMS check-in** (WF-REV-06) — earliest possible churn signal
- Snooze mechanism prevents alert fatigue
- Owner notified when snooze count grows → outreach call
- Fallback delivery: weekly CSV email if owner won't text
- Long-term: build job management webhooks (Jobber, HouseCall Pro) so intake happens automatically

## ⚠️ High Risks

### 5. Founding 5 client churns before delivering testimonial

**Damage**: $497 setup fee waiver + no testimonial asset = $497 loss on that client.

**Mitigations**:
- Setup fee waiver contingent on testimonial delivered within 60 days of first review
- **Back-bill setup fee** if testimonial not received in time
- Signed release at onboarding makes this enforceable
- Follow up at Day 45 with reminder

### 6. Claude posts inappropriate AI response

**Damage**: Client embarrassment, brand damage, potential churn.

**Mitigations**:
- 1-3 star responses **always human-approved** (60-min SLA)
- 4-5 star auto-post with content filters (no URLs, no phone numbers, length cap)
- Fallback templates if Claude API fails or filter triggers
- Content filter routes to Slack approval regardless of rating
- Monitor rejection rates weekly

### 7. Lead supply depletion (Month 6-8)

**Damage**: Growth stalls at Month 6, MRR flatlines Month 8-12.

**Mitigations**:
- **Scraper pipeline must feed fresh roofing leads by Month 3** — standing operational dependency, not one-time
- Existing Close DB seeds Months 1-4
- Apollo API integration as backup ($3/qualified lead)
- Referral program activates Month 5 → supplements cold funnel
- If scraper delayed, expand to HVAC vertical earlier

### 8. Churn exceeds 8% model

**Damage**: Revenue projections miss. Cash runway shortens.

**Mitigations**:
- **Weekly competitor report** is the core retention weapon (reframes as ongoing need)
- Intake activity monitoring catches early signals
- Test optional annual plan ($247/mo billed annually) at Month 6 if churn >10%
- Never abandon no-contract positioning for monthly plans
- Kill criteria trigger reassessment if <5 clients by Day 180

### 9. GBP Manager cooldown creates onboarding friction

**Damage**: Client expects AI responses Day 1, gets them Day 8. Expectation mismatch → complaints.

**Mitigations**:
- **Set expectations in demo**: "AI review responses activate on Day 8 due to Google's standard verification period. Reactivation SMS drip starts immediately."
- Onboarding form step includes 7-day cooldown notice
- WF-REV-04 stores reviews received Days 1-7 and posts backlog Day 8
- Slack notify on new reviews during cooldown: "Review received, response held until cooldown clears on {date}"

## ⚠️ Medium Risks

### 10. Sender phone flagged as spam

**Mitigations**:
- Warmup ramp: Week 1: 50/day, Week 2: 200/day, Week 3: 500/day
- Aegis Enhanced Vetting for higher Trust Score
- Rotate to backup number if primary flagged

### 11. Client GBP Manager access revoked

**Mitigations**:
- Slack alert on GBP API 403 errors
- Email client with re-invite instructions
- Fallback: manual paste responses until re-authorized

### 12. Close CRM API outage

**Mitigations**:
- n8n retry with exponential backoff
- Slack alert on >1% error rate
- 99% uptime SLA to clients (matches Close CRM's SLA)

### 13. SerpAPI outage or price hike

**Mitigations**:
- Fallback to DataForSEO (~$50/mo)
- Weekly report can degrade gracefully to "your reviews this week" without competitor data for 1-2 weeks
- Long-term: build own scraper for GBP public data

## Low Risks (accept)

- **Competitor copycat** — focus on execution
- **Stripe payment failures** — Smart Retries handle it
- **Chargebacks** — preserve consent records, dispute with evidence
- **Google native AI review reply launches** — 12-24 mo window, add bundle features later (missed-call text-back, AI voice)

## Kill Criteria

If fewer than **5 clients by Day 180**, reassess. Options:
1. **Pivot to done-for-you service** (higher-touch, higher-margin, harder to commoditize)
2. **White-label to agencies** (reseller model)
3. **Exit** — accept research warrants it

Don't grind past 6 months of bad numbers.

## Insurance

- E&O with TCPA coverage at $5K MRR (~$200/mo, $1M limit)
- Providers: Munich Re Specialty, DOXA, CRC Group
- **Buy sooner if client list >1K numbers**

## Legal Entity

New LLC (Delaware or home state). $300 setup + $150/yr. Before Stripe onboarding.

## Compliance Kill Switch

If:
- >2% opt-out on single campaign → pause that client
- >5% aggregate opt-out → pause ALL workflows
- Any TCPA demand letter → immediate legal review, halt marketing to that state
