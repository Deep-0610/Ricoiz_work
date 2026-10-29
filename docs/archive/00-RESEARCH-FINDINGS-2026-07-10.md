# 00. Research Findings & Corrections — 2026-07-10

**Verified via 5 parallel research agents on 2026-07-10.** This doc lists everything WRONG in the initial planning and the correct info. All other docs have been updated accordingly, but this preserves the original findings + sources.

---

## 🔥 CRITICAL FINDINGS (Launch Blockers)

### 1. EBR (Established Business Relationship) is NOT a valid consent basis for SMS marketing

**WHAT I ORIGINALLY WROTE**: Multiple docs referenced EBR as legal defense for texting a client's past customers.

**REALITY**:
- EBR is a **DO-NOT-CALL exemption for LIVE telemarketing calls only**
- Does NOT authorize marketing SMS, prerecorded calls, or autodialed calls under TCPA §227(b)
- EBR window is 18 months from transaction / 3 months from inquiry
- **Marketing SMS to wireless numbers ALWAYS requires Prior Express Written Consent (PEWC)** regardless of EBR

**FIX**:
- Remove EBR references from compliance, onboarding, sales docs
- Rely on: PEWC captured at time of transaction OR frame review requests as transactional/relationship (tied to specific completed transaction), non-promotional
- Client attestation must warrant express written consent, not "established relationship"

### 2. Google Business Profile API has TWO GATES, not one — 6-12 weeks total

**WHAT I ORIGINALLY WROTE**: "OAuth verification takes 2-4 weeks"

**REALITY**:
- **Gate 1: Basic API Access allowlist form** (separate) — 7-10 biz days official, 4 days to 6+ weeks real world
- **Gate 2: OAuth sensitive-scope verification** — 2-6 weeks real world
- **Total**: 6-12 weeks parallel path
- New Cloud projects start with **0 QPM** — every call returns 429 without allowlist approval
- Prereqs: verified GBP 60+ days old, owner (not manager) account, business website with matching domain email, privacy policy on same root domain, unlisted YouTube demo showing OAuth flow

**FIX**:
- Restructure launch to **phased approach**:
  - Phase 1 (Week 1): Chrome extension + manual-paste MVP — charge $297/mo Day 1, no Google verification needed
  - Phase 2 (parallel Weeks 1-12): Submit both gates simultaneously
  - Phase 3 (Week 8-12+): Cutover to API + Pub/Sub push notifications
- Use Zapier as backup middleware if allowlist rejected

### 3. Claude Opus 4.7 is NOT the current model — use Haiku 4.5 for reviews

**WHAT I ORIGINALLY WROTE**: `claude-opus-4-7` at $15/$75 per MTok

**REALITY**:
- Latest models: **Opus 4.8**, **Sonnet 5**, **Haiku 4.5**, **Fable 5** (Mythos)
- Opus 4.7 pricing was WRONG — actual is **$5 input / $25 output** per MTok (I quoted old Opus 4.1 pricing)
- **Recommended for review response task**: `claude-haiku-4-5-20251001` at **$1 in / $5 out per MTok** (5× cheaper, plenty smart for structured 500-800 token tasks)
- New tokenizer adds ~30% more tokens — factor this in
- OpenRouter has 0% markup on tokens but **5.5% credit-card fee** on top-ups — **go direct to Anthropic API**

**FIX**:
- Update model ID everywhere from `claude-opus-4-7` to `claude-haiku-4-5-20251001`
- Update cost per response from $0.017 to ~$0.002
- Remove OpenRouter, use Anthropic API directly

### 4. Close CRM Growth Plan ($99/mo) REQUIRED — missed entirely

**WHAT I ORIGINALLY WROTE**: Close CRM SMS at $0.02/segment

**REALITY**:
- **Growth plan ($99/mo annual, $109/mo monthly) or Scale ($139/mo)** is REQUIRED for "SMS in automated workflows"
- Solo ($9) and Essentials ($35) tiers only support manual SMS
- Actual SMS cost is **~$0.012/segment** (Twilio pass-through + surcharge), NOT $0.02
- Number cost: **$1.15/mo** (not $1.00)
- Rate limits are lower than assumed — plan for ~10 req/sec sustained, not 200

**FIX**:
- Add $99/mo Close Growth plan to fixed costs
- Recalculate margin: was 95% → actually **87.5% at 10 clients**
- OR go with **Twilio direct** through n8n and skip Close SMS (saves $99/mo but loses Close inbox)

### 5. A2P 10DLC pricing / throughput was mostly wrong

**WHAT I ORIGINALLY WROTE**:
- Brand: ~$50 one-time + $10-50/mo
- Campaign approval: 5-10 biz days
- T-Mobile: 4,500 msg/day per campaign
- Verizon: 20 msg/sec
- AT&T: 4,500 msg/day

**REALITY**:
- Brand registration: **ONE-TIME** only ($4 Sole Prop / $44 Standard / $40 optional Aegis secondary vetting). **No recurring brand fee.**
- Campaign fee: $10/mo Standard, but ADD $15 one-time campaign vetting
- Brand approval: **1-5 biz days** (24-72h best case)
- Campaign approval: **10-15 biz days in 2026** due to backlog
- T-Mobile: **Trust-Score-based daily caps** — Low tier 2K/day, top 200K/day. No 4,500 tier exists
- Verizon: **Trust-Score-based MPS**, not fixed
- AT&T: **Trust-Score-based MPS**, not daily caps
- No dedicated "Reputation Management" use case — closest is **Marketing** or **Low Volume Mixed** ($1.50/mo)

**FIX**:
- Update A2P section with correct pricing model
- Get Aegis Trust Score to unlock higher throughput tiers
- Toll-free numbers still viable but more restrictive since Jan 2026

---

## ⚠️ HIGH-IMPACT FINDINGS (Big Corrections)

### 6. "20-30 reviews, should have 200+" is misleading

**REALITY**:
- Average small local biz has **~58 reviews** (median from Central TX study)
- Top-3 Map Pack businesses average **47 reviews**
- **Diminishing returns after 50-75 reviews** in most markets
- **Review VELOCITY (3-5/month) matters more than absolute count** in 2026 algorithm
- Businesses with 3-5 new reviews/mo rank 40-60% higher than stagnant competitors with more total reviews

**FIX**:
- Change pitch from "20-30 should have 200+" to "Your competitors average 50-60. Top-3 have 150+. But it's the FRESHNESS that ranks now."
- Frame the product around velocity + response rate, not raw count
- Update Adam's math: 40-75 reviews from 500-customer reactivation is still fine, just don't call it "invisible to competitive"

### 7. Competitor pricing needed updates

**REALITY (2026)**:
| Competitor | Actual Price | Year 1 Cost |
|---|---|---|
| Birdeye | $299 Starter / $349 Growth / $449 Dominate | **$4K-$6K/yr** with fees |
| Podium | $399 Core / $599 Pro / $999+ | AI review responses = $99/mo ADD-ON |
| NiceJob | $75-$290 | Flat, no contracts |
| Grade.us | $110-$2,500 | Agency-focused |
| GoHighLevel | **$97 Starter / $297 Unlimited / $497 Pro** | Starter INCLUDES reputation |
| Broadly | $399-$999 + AI $149/mo | Pivoted to "AI Workforce" |

**Missed competitors**: ReviewFlowz, BrightLocal, RightResponse AI, ReviewSense.ai, Merchynt, QuickFeedback.ai

**Key insight**: **GHL Starter at $97/mo includes reputation** — undercuts our positioning against GHL affiliates. AI response is now TABLE STAKES, not differentiator.

### 8. FTC Consumer Review Rule (Oct 2024) — completely missed

**REALITY**:
- FTC Fake Review Rule effective Aug 2024
- Civil penalties up to **$51,744 per violation** (as of 2025)
- Warning letters sent to 10 companies Dec 2025
- Covers: incentivized reviews, undisclosed insider reviews, review suppression
- Applies to US AND our CLIENTS (both liable)
- **This is a MASSIVE positioning wedge**: "FTC-safe review requests"

**FIX**:
- Add to compliance doc as separate section
- Add as positioning wedge in product overview
- Update ToS to include indemnification for client actions triggering FTC

### 9. TCPA landscape shifted dramatically in 2025-2026

**REALITY**:
- **SCOTUS McLaughlin v. McKesson (June 2025)** — district courts NOT bound by FCC TCPA interpretations. Destabilized FCC-based defenses
- **TCPA filings +95% YoY through mid-2025** — massive class action wave
- 1,052 class actions through mid-2025
- **5th Circuit rejected PEWC rule framework** (early 2026) — regulatory uncertainty
- **11th Circuit vacated FCC 1:1 consent rule** (Jan 2025) — single PEWC can cover multiple sellers
- **FCC "revoke-all" rule** (opt-out applies across sender's programs) — **effective Jan 31, 2027** (pushed from earlier)
- **State mini-TCPAs**: FL/CT/MD/OK/WA cap quiet hours at 8 PM (not 9 PM). TX distinguishes weekday vs Sunday
- **Number reassignment: 25%/year** — texting reassigned number = liability even with prior valid consent

**FIX**:
- Add all above to compliance doc
- Add per-state quiet hours to workflow logic
- Add number reassignment check for reactivation lists >12 months old
- Reduce reactivation window from any age to <12 months only

### 10. Google Business Profile 2026 policy tightened significantly

**REALITY**:
- **April 2026 policy update**: Google now WIPES ALL REVIEWS at a location (not just gated ones) when SaaS-facilitated gating detected
- 292M+ reviews removed in 2025 (~22% of submissions)
- Deletion rates up ~600% Jan-Jul 2025
- Gemini-powered detection + user reports + manual review
- Documented penalty examples: 140+ reviews wiped for 20%-discount offers
- **Vendor liability**: if a client uses your product to gate/incentivize, YOU can trigger their profile wipe

**FIX**:
- Add stricter monitoring for gating patterns in workflows
- Add client-side education during onboarding about consequences
- Add ToS provisions for vendor liability

---

## 📊 REALISTIC BENCHMARKS (Was Optimistic → Now Corrected)

### Sales Funnel
| Metric | Original Target | Corrected Realistic |
|---|---|---|
| Day 1 SMS reply | 8%+ | **5-7% baseline, 8% stretch** |
| Cumulative reply (4 touches) | 20%+ | **12-15% baseline, 18% stretch** |
| Reply → Demo booked | 30%+ | 30% ✓ (keep) |
| Demo show rate | 60%+ | 60% ✓ (keep) |
| Demo → Close | 40%+ | **30-35% baseline, 40% stretch** |
| Overall funnel conversion | 2.4% | **1.5% baseline, 2.4% stretch** |

At 1,000 leads: 8 clients (not 14) = $6,352 first month + $2,376 MRR

### Retention / LTV
| Metric | Original | Corrected |
|---|---|---|
| Monthly churn | <5% | **5-8% months 1-6, <5% at maturity** |
| Avg tenure | 12-24 months | **12 months baseline, 18-24 at maturity** |
| LTV Year 1 | $4,061 | ✓ (keep — reasonable at 12mo) |

### CAC / Efficiency
| Metric | Original | Corrected |
|---|---|---|
| CAC (existing Close leads) | <$200 | **<$200** ✓ (keep) |
| CAC (fresh Apollo leads) | Not specified | **<$400** |
| LTV/CAC | 10× | **4-5× (target), <3× alert** |

### Review Delivery
| Metric | Original | Corrected |
|---|---|---|
| SMS delivery rate | 98% | ✓ |
| Check-in reply | 30%+ | ✓ (keep) |
| Review link CTR | 15%+ | **20-25% baseline** (was underestimating) |
| Review conversion | 8-15% | **8-15% fresh, 5-10% reactivation 6-12mo, 3-7% 2+yr** |
| **Nudge accounts for what %** | Not quantified | **30-50% of total captured reviews** — CRITICAL insight |

### SMS Opt-Outs (NEW)
- Opt-out rate target: <1.5%
- Alert: >2% (carrier suspension risk kicks in ~2%)
- 6-12mo reactivation: 2-3% typical
- 2+ year reactivation: 4-7% (RECOMMEND NOT DOING)

---

## 💰 CORRECTED COST MODEL

### Fixed Costs (per month)
| Item | Original | Corrected |
|---|---|---|
| Domain | $1 | $1 |
| Vercel Pro | $20 | $20 (or Hobby free pre-revenue) |
| Convex Pro | $25 | $25 (per dev seat) |
| n8n Cloud Starter | $20 | $22 (€20 now) |
| A2P 10DLC brand | $10/mo | **$0/mo** (one-time only) |
| A2P 10DLC campaign | $10/mo | $10/mo ✓ |
| Notion Team | $10 | $10 |
| Postmark | $15 | $15 (or Resend $20 for 5× more email) |
| **Close CRM Growth plan** | ❌ MISSED | **$99/mo REQUIRED** |
| **Fixed total** | **$111/mo** | **$202/mo** |

### Variable Costs (per client, per month)
| Item | Original | Corrected |
|---|---|---|
| SMS number | $1.00 | $1.15 |
| SMS sends (250 seg) | $3-6 | $3.00 |
| Convex compute | $0.50 | $0.50 |
| Postmark emails | $0.20 | $0.20 |
| Claude via OpenRouter | $0.34 | **$0.05** (Haiku direct) or $0.26 (Opus 4.8) |
| Stripe fees | $9.00 | **$10.99** (2.9% + $0.30 + 0.7% Billing) |
| **Variable per client** | **~$14** | **~$16** |

### Recalculated Margin
| Clients | Revenue | Fixed | Variable | Profit | Margin |
|---|---|---|---|---|---|
| 1 | $297 | $202 | $16 | $79 | 27% |
| 5 | $1,485 | $202 | $80 | $1,203 | 81% |
| **10** | **$2,970** | **$202** | **$160** | **$2,608** | **87.8%** |
| 20 | $5,940 | $202 | $320 | $5,418 | 91.2% |
| 100 | $29,700 | $202 | $1,600 | $27,898 | 93.9% |

**Original 95% margin claim → corrected to 88-94% depending on scale.** Still excellent, just more defensible.

### Cost-Optimization Option
Skip Close Growth plan, use Twilio direct via n8n:
- Fixed drops back to ~$103/mo
- At 10 clients: 90.8% margin
- Trade-off: Lose Close's unified SMS inbox

---

## 🎯 NEW RECOMMENDATIONS

### Positioning Wedges (Verified 2026)
1. **"FTC-safe reviews"** — $51,744/violation risk, no incumbent leads with this
2. **"Response speed rank boost"** — 5-10% Map Pack lift documented, "auto-respond within 60 min in your voice"
3. **"Review velocity, not volume"** — 3-5/mo new outranks static competitors with more
4. **Vertical specialization** — roofer-only, HVAC-only carries premium
5. **Anti-gating compliance** — competitors doing gating trigger client wipes

### Product Architecture Changes
1. **Phased launch**: Chrome extension + manual paste Day 1, cutover to GBP API Phase 3
2. **Model choice**: Haiku 4.5 (not Opus)
3. **AI provider**: Anthropic direct (not OpenRouter)
4. **SMS transport**: Close CRM Growth plan required OR Twilio direct
5. **State-aware quiet hours**: Add per-state override table
6. **Reactivation age limit**: 12 months max (not 2+ years)
7. **Consent basis**: PEWC only (never EBR)
8. **Pub/Sub push** (not polling) for GBP review notifications

### Timeline Impact
- Original: 30-day launch
- **Corrected**: 10-day launch of MVP (manual-paste + Chrome ext), 90-day cutover to API-based
- Revenue starts Day 15 either way

### Market Reality
- Global reputation SaaS market: $16.73B (2025) → $19.56B (2026), **16.9% CAGR**
- Only 35% of US SMBs have GBP — huge untapped market
- 41% of consumers "always" read reviews (up from 29%)
- 88% more likely to choose responding businesses
- **Market is NOT saturated at local level** — vertical + specialization wins

---

## 📚 SOURCE URLS (Top Verified)

### Compliance
- FCC Revoke-All Rule: https://www.consumerfinancialserviceslawmonitor.com/2026/01/fcc-further-extends-effective-date-for-tcpa-revoke-all-rule/
- SCOTUS McLaughlin decision: https://www.manatt.com/insights/newsletters/client-alert/mclaughlin-v-mckesson-what-the-supreme-court-s-decision-means-for-tcpa-litigation-compliance
- EBR limitations: https://www.dnc.com/blog/understanding-the-established-business-relationship-exemption-ebr
- FTC Fake Review Rule: (FTC.gov, effective Aug 2024)
- A2P 10DLC pricing: https://www.telgorithm.com/news/how-long-does-10dlc-registration-take-in-2026

### Google Business Profile
- API access form: https://support.google.com/business/workflow/16726127
- API endpoint reference: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/updateReply
- Latest updates: https://developers.google.com/my-business/content/latest-updates
- Pub/Sub setup: https://developers.google.com/my-business/content/notification-setup
- Review policy: https://support.google.com/contributionpolicy/answer/7400114
- 6-12wk reality check: https://xovionlabs.com/blog/google-business-profile-api-hidden-gate/

### Competitor Pricing
- Birdeye 2026: https://www.replifast.com/blog/birdeye-pricing-2026
- Podium 2026: https://www.replifast.com/blog/podium-pricing-2026
- GHL 2026: https://www.ghlexperts.com/gohighlevel-plans-pricing
- NiceJob: https://get.nicejob.com/pricing

### Tech Stack
- Claude Models 2026: https://platform.claude.com/docs/en/about-claude/models/overview
- Claude Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Close CRM Pricing: https://close.com/pricing
- Close SMS Usage: https://help.close.com/docs/calling-and-sms-usage
- OpenRouter Analysis: https://ofox.ai/blog/openrouter-pricing-hidden-markup-breakdown-2026/
- Stripe: https://stripe.com/pricing

### Benchmarks
- BrightLocal 2026 Survey: https://www.brightlocal.com/research/local-consumer-review-survey/
- Local SEO 2026 Whitespark: https://w3marketinghub.com/seo/local-seo-ranking/
- SaaS Churn 2026: https://userjot.com/blog/saas-churn-rate-benchmarks
- B2B SMS reply: https://belkins.io/blog/cold-email-response-rates
- Review Velocity: https://sproutsagesolutions.com/review-velocity-vs-review-count/

---

## ✅ APPLICATION STATUS

All docs updated with these corrections on **2026-07-10** (same day as research). See individual files in `/docs/` for updated versions.

Next: Lock decisions in [16-open-decisions.md](16-open-decisions.md), then execute [13-launch-timeline.md](13-launch-timeline.md).
