# 00. Strategic Decision — Go / Modify / No-Go (2026-07-10)

**Based on Round 2 Deep Research** — [00-RESEARCH-ROUND-2-DEEP-DIVE.md](00-RESEARCH-ROUND-2-DEEP-DIVE.md)

**Recommendation**: **GO — with 8 material modifications**

---

## The 3-Sentence Summary

The $297/mo pure-play Google Reviews SaaS is a viable business but a **melting ice cube** (Google is shipping native AI review-reply feature). We should still build it because (a) we have 12-24 months before Google eats the low end, (b) documented Podium/Birdeye complaints hand us the "anti-lock-in" wedge, and (c) our existing infrastructure makes CAPEX ~zero. **But we must modify the plan**: reprice to $497/mo, target Med Spas + Roofers (not just Roofers), ship Chrome extension Phase 1 to skip Google's 6-12 week gate, and position aggressively against Podium's cancellation traps.

---

## The 8 Required Modifications

### Modification 1: Reprice $297 → $497 for target verticals

**Why**: SMB auto-approval threshold is $500/mo (ApproveThis 2026). Adam Erhart's own advice puts high-ticket niches at $297-$497. Kernl case study proves grandfathered price raises don't drop signups. ProfitWell: only 2% of SaaS <$25/mo hit NRR>100%, ~50% of >$500/mo do.

**Structure**:
- $197/mo — Solo auto shops, small restaurants (skip if possible)
- $297/mo — General local SMB, cosmetic dentists (soft floor)
- **$497/mo — Roofers, HVAC, Med Spas (RECOMMENDED default)**
- $997/mo — Multi-location (3-5 locations)
- Custom — Enterprise/franchise (10+ locations)

**Setup fee**: $497 one-time, waived if annual commit.

**Annual discount**: 17% ("2 months free"), Slack-standard.

**Guarantee**: "50 new reviews from your existing customer list in 30 days or your money back." Reactivation only. Setup non-refundable. Requires client attestation of PEWC on list.

---

### Modification 2: Delivery model — Chrome Extension Phase 1, GBP API Phase 3

**Why**: GBP Basic API Access + OAuth verification take 6-12 weeks (verified from 20+ developer accounts). We can't wait. Chrome extension is a proven $9-49/mo business model with 200K+ user extensions on Chrome Web Store.

**Phase 1 (Week 1-2)**: Chrome extension + manual paste fallback
- Sidebar/floating tray + Copy button (NOT auto-fill — Grammarly gave up on Google surfaces)
- Read reviews via Outscraper ($3/1K) or extension DOM scrape in owner's session
- Charge $497/mo Day 1, no Google verification needed

**Phase 2 (Parallel Weeks 1-12)**: Submit both Google gates
- Basic API Access form (framed as "internal management" NOT multi-tenant SaaS to raise approval odds)
- OAuth `business.manage` verification
- Brand verification
- Have Zapier middleware as backup if allowlist denied

**Phase 3 (Week 8-12+)**: Cutover to GBP API + Pub/Sub push
- Native review polling + response posting
- Keep Chrome extension as fallback for non-Chrome users

**Revenue starts Week 3 regardless of Google approval timeline.**

---

### Modification 3: SMS delivery — Twilio direct via n8n (skip Close CRM)

**Why**: Close CRM Growth plan is $99/mo and SMS costs $0.02/segment (Close rounds up). Twilio direct via n8n costs $0.0125/segment all-in with no monthly software cost. At 100 clients that's $175/mo saved.

**Trade-off**: We lose Close's unified inbox — but we can build our own reply dashboard in the client-facing app in Phase 2.

**A2P 10DLC pattern per client**:
- Standard Brand registration: $4.50 one-time
- Aegis Enhanced Vetting: $95 one-time (**critical — unlocks 200K/day T-Mobile cap vs 2K default**)
- Campaign registration: $10-15/mo + $15 one-time vetting
- 1 dedicated Twilio DID per client: $1.15/mo

**Total per-client fixed cost**: ~$12/mo + $110 one-time (recovered in setup fee).

---

### Modification 4: Compliance hardening — per-state quiet hours, RND, PEWC only

**Why**: 100+ near-identical TCPA class actions filed by a Florida law firm since Nov 2024 alleging marketing SMS outside 8am-9pm local violates TCPA. Number reassignment = 25%/year of numbers. FTC Fake Review Rule = $53,088/violation. State mini-TCPAs (FL, WA, TX, OK, MD, CT) have stricter quiet hours and higher damages.

**Required in every workflow**:
1. **Per-state quiet hours override table** — FL/CT/MD/OK/WA cap at 8 PM (not 9 PM), TX weekday 9-9 / Sunday noon-9
2. **RND (Reassigned Numbers Database) check** for consent >30 days old, re-scrub every 45 days
3. **12-month reactivation ceiling** — refuse to text customers whose last transaction was >12 months ago
4. **Global opt-out table** — designed for FCC's Jan 2027 "revoke-all" rule (STOP applies across all our senders)
5. **"Any reasonable method" opt-out honor** — regex catches "please stop," "unsubscribe me," "revoke my consent"
6. **PEWC attestation at CSV upload** — client warrants Prior Express Written Consent (not EBR)
7. **Sender identification in every SMS** — CTIA October 2025 requires TCR-registered brand name in message
8. **NO public URL shorteners** — use per-tenant branded subdomain or platform-managed `rvw.yourbrand.io`
9. **No emojis or curly quotes** — enable Twilio Smart Encoding to prevent UCS-2 cost explosions
10. **Warmup ramp** — Week 1: 50-100/day, Week 2: 200-500/day, Week 3: 1K+/day for new client numbers

---

### Modification 5: Vertical strategy — Roofers first, Med Spas + Cosmetic Dental Month 3

**Why**: Roofers have lowest CAC (existing outreach patterns, direct-mail proven), but Med Spas + Cosmetic Dental have highest LTV ($1,600-3,200/yr and $10-20K per patient respectively). Original recommendation was Roofers-only; verified data says diversify by Month 3.

**Launch sequence**:
- **Month 1**: Roofers only. Target 100 leads → 2-3 clients at $497/mo founding tier.
- **Month 2**: HVAC as parallel vertical. Same outreach pattern.
- **Month 3**: Med Spas + Cosmetic Dental. Different pitch (LTV framing).
- **Month 6**: Multi-location upsell tier ($997/mo).

**Skip permanently**:
- Restaurants (thin margins, high churn, wrong LTV)
- Storm-chase roofers (transactional, no repeat)
- Corporate/franchise (RFP hell, 3-6 month sales cycles)
- Multi-location dental DSOs (HIPAA + IT security review)

**Excluding states for launch** (optional):
- **Consider excluding FL** — top TCPA plaintiff jurisdiction, quiet hours class action wave targets FL specifically. If we include, MUST enforce 8 PM cutoff per state override table.

---

### Modification 6: Anti-Podium positioning — every marketing asset

**Why**: Podium has 100+ BBB complaints (D- rating), Trustpilot 1.5/5, and Birdeye has 109 complaints (top of category). Cancellation traps are their most-hated feature. These are documented, verifiable, and specific.

**Every landing page bullet must directly counter a Podium/Birdeye complaint**:

| Podium/Birdeye complaint | Our promise |
|---|---|
| 12-mo contract + 30-day cancel window | Month-to-month, cancel with one click |
| Advertised $399, real $500-800 | Flat $497. Published price. No add-ons. |
| 8% Innovation Fee annual price hike | Price lock in writing. $497 in Year 1 = $497 in Year 3. |
| "Cannot export your data" | One-click CSV export of all data, anytime |
| Offshore support 7-14 day response | US-based support, published phone number, 24-hr response SLA |
| Auto-renewed after 4 cancellation notices | Written cancellation confirmation within 1 hour |
| $99/mo AI reply as add-on | AI reply included in base price |
| Aggressive retention calls to cancel | Cancel by email in 1 line, no retention call |

**Pitch anchor line**: **"The only Google Reviews service that isn't Podium."**

---

### Modification 7: Realistic funnel + retention modeling

**Why**: Prior projection was overly optimistic. Verified 2026 benchmarks require lower expectations.

**Realistic funnel** (per 100 leads):
- 15 replies (13-15% cumulative)
- 4-5 demos booked (30% of replies)
- 2-3 demos attended (60% show rate)
- 1 client closed (30-35% close rate)
- **1% overall lead → client** (not 2.4%)

**CAC**: $400-600 for existing Close DB leads. $600-1,000 for fresh Apollo scrapes.

**Retention target**: **6% monthly churn Month 1-6, 4% Month 7+** (was too aggressive at <5% from start).

**LTV**: 12-month baseline = $497 × 12 + $497 setup = **$6,461** at $497 pricing.

**LTV/CAC target**: 3-5× (was unrealistic 10×).

**Realistic 12-month projection** (at $497/mo pricing):
| Month | New | Total (after churn) | MRR | Cumulative Revenue |
|---|---|---|---|---|
| 1 | 2 | 2 | $994 | $994 |
| 3 | 5 | 8 | $3,976 | $7,952 |
| 6 | 7 | 22 (-3 churn) | $10,934 | $47,000 |
| 9 | 9 | 40 (-3 churn) | $19,880 | $135,000 |
| 12 | 11 | 60 (-3 churn) | $29,820 | $260,000+ |

**Year 1 total revenue** (recurring + setup): **~$285K**
**Year 1 profit** (after $500 CAC × 60 + variable costs + fixed): **~$220K**

---

### Modification 8: Ship the "bundle roadmap" from Day 1

**Why**: Vendasta's 100K-SMB study: single-product SMBs retain at 30% over 2 years; 4-product SMBs retain at 80%. Podium's success = they bundled reviews + messaging + payments + AI voice. Reviews-only is a graveyard tier — every incumbent survives by bundling.

**Roadmap** (communicated to clients at signup):
- **Month 1-2**: Reviews SMS + AI Response
- **Month 3-4**: Missed-call text-back
- **Month 5-6**: AI voice receptionist (Podium Jerry-style at $99-149/mo add-on)
- **Month 6+**: Web chat, sentiment routing, Google Ads reporting

**Why this matters strategically**:
- Vendasta 30% → 80% retention delta is the strongest single data point in the research
- AI voice is where Podium ($99-399/mo Jerry) and Weave (acquired TrueLark Q1 2025) are winning
- Bundle upsell path takes us from $497 MRR/client to $800-1,200 MRR/client
- Prevents Google's native AI reply from killing us — we're a bundle, not a feature

---

## Milestone-Based Kill Criteria

**Set explicit failure signals before launching**:

| Milestone | If missed by | Action |
|---|---|---|
| First outbound SMS sent | Day 15 | Continue |
| First demo booked | Day 25 | Continue |
| First client closed | Day 45 | Reassess pitch |
| 3 clients closed | Day 90 | Continue if progress |
| 5 clients closed at $497 | Day 120 | Continue |
| **Fewer than 5 clients by Day 180** | Day 180 | **Kill or pivot to done-for-you service model** |
| Google announces native GA rollout of AI reply | Any date | **Accelerate vertical bundling — become AI voice-first** |
| First TCPA lawsuit or FTC warning letter | Any date | **Immediate pause + attorney review** |
| Client churn >10%/month for 3 consecutive months | Any date | **Emergency retention program** |

---

## What Success Looks Like at Month 12

**Base case**: 60 paying clients @ $497/mo = **$29,820 MRR / $358K ARR run rate**
- Positioned as "the anti-Podium" in 3 verticals (Roofers, HVAC, Med Spas)
- Chrome extension delivered, GBP API cutover complete
- Bundle roadmap Phase 2 shipped (AI voice add-on live)
- 1 case study per vertical published

**Stretch case**: 100 clients @ $597 avg = **$59,700 MRR / $716K ARR**
- Multi-vertical expansion (added Cosmetic Dental)
- Enterprise tier live for multi-location
- Considering fractional hire (VA at $1,500/mo for onboarding admin)

**Failure case (Month 12 <10 clients)**: Kill the SaaS play, pivot to:
- Done-for-you service (higher-touch, higher-margin, harder to commoditize)
- Or white-label to agencies (reseller model, lower CAC per revenue)
- Or exit the space entirely — the research warrants it

---

## Insurance / Legal Requirements Before Launch

**Non-negotiable**:
1. **E&O insurance with TCPA coverage** at $5K MRR (~$150-300/mo for $1M coverage from Munich Re Specialty, DOXA, or CRC Group)
2. **Legal entity** — new LLC (Delaware or home state) for asset isolation from other businesses
3. **Terms of Service** — with explicit PEWC-not-EBR language + client indemnity for list quality
4. **Privacy Policy** — explicit SMS opt-in data non-sharing clause (A2P registration requirement)
5. **A2P 10DLC Standard Brand + Enhanced Vetting** — $95 upfront, unlocks throughput

---

## Open Decisions Still Blocking Build

Now that we've completed Round 2 research, **these decisions must be locked in before Week 1**:

1. **Brand name + domain** — Recommend `ReviewLift` or `ReviewEngine` (both .co available). Locked?
2. **Legal entity** — New LLC recommended. Delaware or [home state]?
3. **Pricing** — Confirmed $497 for target verticals? Founding rate 3-month at $297?
4. **First vertical** — Roofers confirmed as Month 1?
5. **Chrome extension approach** — Sidebar/tray (not auto-fill) confirmed?
6. **Twilio direct vs Close CRM SMS** — Confirmed Twilio direct?
7. **Include or exclude Florida** for Month 1 launch (TCPA quiet hours risk)?
8. **Bundle roadmap communication** — Announce full roadmap on landing page, or hide until closed?
9. **Founding client discount structure** — First 5 at $297 for 3 months? Or first 25 at $397 grandfathered forever?
10. **Guarantee wording** — "50 reviews in 30 days" or something else measurable?

---

## Final Recommendation

**GO** with the 8 modifications above.

**Rationale**:
- Existing infrastructure (n8n, Convex, Twilio, expertise) makes this a very cheap experiment
- Real anti-Podium wedge exists and is documented
- 12-24 month window before Google eats the space is enough to build meaningful revenue
- Path to bundled higher-LTV product exists (AI voice add-on)
- Kill criteria are explicit and reasonable
- Legal + compliance shields are budgetable

**BUT the strategic frame changes from "$297/mo Google Reviews SaaS" to "vertical-specialized reputation-plus-AI-communications SaaS with a Reviews starter tier at $497/mo."**

That's a materially different business. Every design decision from Week 1 must ladder to that reality, not to Adam's YouTube pitch.

---

## Next Action

Bolo koto ta decision lock koro. Lock hoye gele Week 1 build shuru — brand + domain + A2P + Chrome extension freelancer hire + Twilio Standard Brand + Aegis Enhanced Vetting = **~$500 one-time cost, 5 business days elapsed**.

Ready to lock?
