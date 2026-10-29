# Review Engine — Project Plan v2 (Phased Approach)

**Google Reviews SMS Service for Local Businesses**

Prepared by: Owner
Date: 2026-07-10
Status: **LOCKED — Phase 1 Build Ready**
Supersedes: PROJECT-PLAN.md (v1)

---

## ⚡ Phased Execution Strategy

**Phase 1 (Manual Launch — First 3-4 Clients)**:
- Build 6 core delivery workflows only
- Handle payment via Stripe Payment Link (no webhook automation)
- Manual onboarding via Google Form
- Manual AI review responses (paste from Claude)
- Manual weekly competitor reports (Gmail)
- Manual sales outreach via Close CRM UI
- Goal: Prove product-market fit with real paying clients

**Phase 2 (Full Automation — After 3-4 Clients)**:
- Build 6 additional workflows (Stripe webhook, AI response, weekly report, sales cadence, guarantee, founding-check)
- Full landing page with checkout API
- SerpAPI + Postmark + PDFMonkey + Google OAuth
- Scale from 4 → 20-50 clients on same time budget

**Full phase details**:
- [docs/PHASE-1-MANUAL-LAUNCH.md](docs/PHASE-1-MANUAL-LAUNCH.md)
- [docs/PHASE-2-AUTOMATION.md](docs/PHASE-2-AUTOMATION.md)

---

## Executive Summary

A recurring SaaS product that helps local service businesses generate Google reviews on autopilot. **$297/month per client + $497 setup.**

The system sends 3 SMS messages after each customer job, runs a reactivation campaign to their past customer list, catches unhappy customers *before* they hit Google, and uses AI to respond to every Google review. All delivered through our existing tech stack (Close CRM, n8n, Convex, Claude), requiring zero new vendor cost.

**Break-even at 1 client. Target 8 clients Month 3 = $2,376 MRR. Target 44 clients Month 12 = $13,068 MRR (~$157K ARR run rate) at a conservative 8% monthly churn.**

**v2 changes from v1:**
1. Job-ingestion flow defined ("text us the customer") — v1 never specified how jobs enter the system
2. Google Business Profile manager access required at onboarding — eliminates the Phase 1 manual-paste period and the scraping problem entirely
3. Service recovery added — negative check-in replies suppress the review ask and route to the owner
4. Weekly report reframed as competitor tracking — primary churn defense
5. Pre-demo audit artifact added to the sales funnel
6. First 10 clients: roofers only
7. 30-day review guarantee added
8. TCPA hardening: quiet-hours enforcement + structured consent attestation
9. Founding 5 program: setup fee waived for testimonial rights; price ladder to $397 for new clients later
10. Referral program: 1 month free per closed referral

---

## 1. Product Offer

### Pricing
- **$297/month** subscription (grandfathered for life)
- **$497 one-time setup fee**
- **No contract** — month-to-month, cancel anytime
- **Founding 5:** setup fee waived in exchange for video testimonial + case-study rights + before/after GBP screenshots. Waiver contingent on testimonial delivered within 60 days of first review — otherwise setup fee back-billed.
- **Price ladder:** once 20 case studies exist, new clients pay $397/month; existing clients grandfathered at $297

### The Guarantee
**"10 new Google reviews in your first 30 days or your next month is free."**

The reactivation campaign to a 300-500 person past-customer list reliably produces 15-30 reviews in the first two weeks. Worst case cost of a miss: one $297 credit. This kills the primary sales objection and feeds the testimonial pipeline.

### Deliverables (per client)
1. **Dead-simple job intake**: owner texts customer name + phone number to their dedicated line — that's the entire workflow on their end. No portal, no login, no training beyond one example text.
2. **3-message SMS drip campaign** after every customer job:
   - Message 1 (2hr after job): Check-in ("everything look good?")
   - Message 2 (2hr after Message 1): Google review request + link — **only sends if Message 1 got no negative reply**
   - Message 3 (3 days after Message 2, if review link not clicked): Gentle nudge
3. **Service recovery**: negative replies to Message 1 are routed to the owner's phone immediately and suppress Messages 2-3 for that customer. Unhappy customers get a callback instead of a review ask. (This is the Google-compliant alternative to review gating — same outcome, zero policy risk.)
4. **Reactivation campaign**: SMS drip to client's past customer list (uploaded via CSV during onboarding), trickled at ≤50/day
5. **AI review responses**: every incoming Google review responded to via the Google Business Profile API. 4-5 star reviews auto-post; 1-3 star responses are drafted by Claude and routed to Slack for human approval before posting (60-minute SLA, auto-post as fallback).
6. **Weekly competitor report** emailed to owner: *your review count and rating vs. your top 3 local competitors*, review velocity trend, response rate (always 100%)
7. **Intake activity monitoring**: if owner sends no customer info for 7 consecutive days, automated check-in SMS ("Everything OK? Reply YES to snooze, HELP for support")

### Target Customer
**First 10 clients: roofing companies only.** Highest average job value ($5K-$15K), best ROI math, tight referral networks (supply houses, trade Facebook groups), and identical delivery templates across clients.

Expansion verticals after client #10: HVAC, plumbers, dentists, med spas, chiropractors, auto shops.

---

## 2. The Problem We Solve

Most local businesses have 20-40 Google reviews when their top competitors have 200+. This is not a service quality problem — it's a "remembering to ask" problem.

- Business owner forgets to ask at end of job
- Staff forgets to ask
- Customer intends to leave a review but forgets

Result: business does great work, but Google doesn't see it. Search ranking suffers. Fewer leads.

Our system asks for them, three times, on autopilot — and catches the unhappy ones before they post.

### The Math (client-side)
Roofing company, average job value $5,000.
- Just 1 extra customer per month from improved Google presence = $5,000 revenue
- Our cost: $297/mo
- ROI: 16.8×

### The Retention Math (why clients stay)
Google weights review **recency**, not just count. A business that stops generating reviews slides in local rank within 60-90 days. The weekly competitor report makes this visible: the client sees their standing against 3 named local rivals every week. Cancelling means watching competitors pull ahead. This reframing — from "review count project" to "local rank maintenance" — is the primary churn defense.

---

## 3. Technology Stack

**All existing infrastructure — no new vendor contracts required.**

| Layer | Tool | Notes |
|---|---|---|
| SMS delivery + inbound parsing | Close CRM | Existing account, existing API credentials |
| State management | Convex (`YOUR_CONVEX_DEPLOYMENT`) | Existing deployment, new tables added |
| Click tracking | Convex HTTP endpoint | Own-domain redirect (`go.<domain>/r/<id>`) logs click, forwards to Google review link |
| Workflow automation | n8n | Existing instance |
| AI (review responses) | Claude via OpenRouter | Existing setup |
| Google reviews (read + reply) | Google Business Profile API | Client adds our Google account as GBP **manager** during onboarding — API access from Day 8 (7-day GBP manager acceptance cooldown), no scraping, no manual paste |
| Competitor tracking data | SerpAPI Basic or DataForSEO | ~$75-150/mo depending on scale — powers weekly competitor report |
| Landing page | Vercel + Next.js | Existing account |
| Billing | Stripe | Existing account |
| Legal / A2P 10DLC | New brand registration | ~$150 one-time; campaign use case worded as ISV: *"review request platform sending on behalf of local business customers"* |

### Architecture Overview

```
Owner texts "John Smith 330-555-0142" to their dedicated line
    ↓
n8n parses inbound → Convex stores customer + job timestamp
    ↓
n8n workflow sends Message 1 (check-in) — 2hr after intake, within quiet hours
    ↓
Negative reply? → route to owner's phone, suppress drip, STOP
Positive/no reply → Message 2 with tracked review link
    ↓
Link click logged via Convex redirect endpoint
No click after 3 days → Message 3 (nudge)
    ↓
Customer leaves Google review
    ↓
n8n polls GBP API (every 15 min) → Claude drafts response
    ↓
4-5 stars → auto-post | 1-3 stars → Slack approval (60-min SLA) → post
```

### Compliance Built Into the Workflows
- **Quiet hours enforced in n8n**: all outbound SMS sends only between 8:00 AM and 9:00 PM in the *recipient's* local time (TCPA requirement; client timezone captured at onboarding as default, area code lookup for per-customer override)
- **STOP/HELP handling**: automatic opt-out suppression across all campaigns
- **No review gating**: same review link goes to every customer regardless of sentiment; service recovery suppresses the *ask*, never filters *who can review*
- **No incentive language** in any template
- **Per-intake attestation**: ToS clause states that by texting a customer name/number to your dedicated line, you attest that you have PEWC consent for that individual

### Reference Implementation
The system mirrors two existing production workflows that have been running successfully for 6+ months:
- WF-NW-02 (Daily 500 → Close + First SMS)
- WF-NW-03 (Followup SMS Only, touches 2-4)

Both proven at scale with the Close CRM + Convex + n8n stack.

---

## 4. Business Model & Economics

### Unit Economics (per client)

| Item | Monthly |
|---|---|
| Revenue | $297.00 |
| Variable cost (SMS + AI + Stripe fees + competitor scrape) | ~$16.00 |
| **Contribution margin** | **$281 (95%)** |

### Setup Economics (per client)

| Item | One-time |
|---|---|
| Setup fee revenue | $497 (waived for Founding 5) |
| Admin time cost | ~$100 |
| **Setup profit** | **$397** |

### Fixed Costs (regardless of client count)

| Item | Monthly |
|---|---|
| Domain | $1 |
| Vercel (Hobby tier) | $0 |
| A2P 10DLC campaign fee | $10 |
| SerpAPI Basic | $75 |
| **Total fixed** | **$86/mo** |

Plus ~$150 one-time A2P Brand + Enhanced Vetting.

### Break-Even
**1 client.**

### 12-Month Projection (8% monthly churn — conservative)

v1 modeled 5% churn. A no-contract review service realistically churns higher once clients feel "fixed" — the competitor report fights this, but we model 8% so the plan survives being wrong.

| Month | New Clients | Total (net churn) | MRR |
|---|---|---|---|
| 1 | 2 | 2 | $594 |
| 3 | 4 | 8 | $2,376 |
| 6 | 6 | 20 | $5,940 |
| 9 | 8 | 31 | $9,207 |
| 12 | 10 | 44 | $13,068 |

**Year 1 total revenue** (subscription + setup fees, Founding 5 setup waived): **~$100K**
**Year 1 profit**: **~$80K**

If churn holds at 5% (v1 assumption), Month 12 lands at ~55 clients / $16.3K MRR — treat that as upside, not the plan.

### Referral Program
**1 month free per closed referral.** At 95% margin, a $297 referral cost dramatically outperforms the ~1%-conversion cold funnel. Roofers share supply houses and Facebook groups — after client #5, referrals should supplement outbound. Tracked via unique referral code in Convex `referrals` table + Stripe promo code.

---

## 5. Sales & Distribution

### Channel
**Close CRM outbound** using our existing lead database, filtered to **roofing companies** (ICP tag: `review-engine-icp-roofing`), 4-touch cadence:

- Day 1: SMS + email hook
- Day 3: SMS + email followup (competitor angle)
- Day 6: SMS + email — **personalized audit attached** (see below)
- Day 10: SMS + email breakup

### The Pre-Demo Audit (new in v2)
Auto-generated one-pager per prospect: their GBP screenshot, review count and rating vs. 3 named local competitors, and reviews-per-month velocity. Built by n8n + Claude from SerpAPI + public GBP data.

Used twice:
1. **Day 6 cadence touch** — "made this for you" beats any case study
2. **Sent with every demo booking confirmation** — prospects who've seen their own gap show up (lifts the 60% show-rate assumption)

### Realistic Funnel (per 100 leads outreached)

| Stage | Conversion | Count |
|---|---|---|
| Reply within 14 days | 13-15% | 15 |
| Demo booked | 30% of replies | 5 |
| Demo attended | 60%+ show rate (audit lifts this) | 3 |
| Client closed | 30-35% close rate | 1 |
| **Overall conversion** | **~1%** | **1 client** |

### Lead Supply Requirement
1% conversion means Month 12 pace (10 new clients/month) requires ~1,000 fresh leads/month. The existing Close database seeds Months 1-4; the scraper pipeline must be feeding new roofing/trade leads by Month 3 or growth stalls around Month 6-8. This is a standing operational dependency, not a one-time task.

### Demo Process
15-minute Zoom call:
1. Walk through their audit (they've already seen it — now twist the knife on the competitor gap)
2. Demonstrate the 3-message system + service recovery live
3. Present pricing + ROI math + the 30-day guarantee
4. Send Stripe checkout link at close

---

## 6. Delivery & Onboarding

### Client Onboarding (24-48 hours)

1. Client completes Stripe checkout
2. Automated welcome email → onboarding form (Google Form for MVP) collecting:
   - Business name, owner details, timezone
   - Google review URL
   - **GBP manager access**: step-by-step instructions to add our Google account (`reviews@<domain>`) as a manager on their Business Profile (2-minute task; standard agency practice). *Blocking requirement — review automation does not start without it. 7-day GBP acceptance cooldown means AI response goes live Day 8.*
   - Past customer CSV
   - **Structured TCPA consent attestation**: not a checkbox — client attests *how* consent was obtained (e.g., "customers provided numbers via signed service agreements"), the *date range* of the relationship, and signs. This documentation shifts liability meaningfully in a demand-letter scenario; a bare checkbox does not.
3. Admin task: create Convex client row, purchase Close CRM sender phone, upload CSV
4. Owner receives their dedicated intake number + one example intake text ("John Smith 330-555-0142") — onboarding training complete
5. Reactivation campaign starts within 12 minutes, trickled at ≤50/day
6. First reviews typically arrive within 3-7 days — guarantee clock starts

### AI Response Handling (Day 8, no phases)
GBP manager access at onboarding means API access active after the 7-day Google cooldown — v1's two-month manual-paste phase is deleted.

- n8n polls each client's reviews via GBP API every 15 min
- Claude drafts response in the business's voice
- **4-5 stars**: auto-posted
- **1-3 stars**: draft routed to Slack for human approval before posting (60-minute SLA; auto-posts as fallback if no override)

### Client Reporting (weekly email)
- **You vs. your top 3 competitors**: review count, average rating, gap trend
- New reviews this week + total since start
- Review velocity (reviews/month, trending)
- Response rate (always 100%)

The competitor framing is deliberate: it converts the report from a progress update (which invites "we're done, cancel") into a standings table (which invites "don't fall behind").

### Intake Monitoring
If an owner sends no customer info for 7 consecutive days, an automated SMS goes to their phone: *"Hey {ownerFirstName}, haven't heard from you in a week. Everything OK? Reply YES to snooze this alert, HELP for support."*

This is the earliest churn signal we have — a client not sending customers is 30 days from cancelling.

---

## 7. Launch Timeline (14 Days to First Client)

### Week 1 — Build
- **Day 1**: Register brand + domain, submit A2P 10DLC (ISV use-case wording), create Stripe products, file LLC, provision dedicated Google account for GBP manager access
- **Day 2**: Deploy Convex tables + HTTP endpoints **including click-tracking redirect + inbound intake parser**
- **Day 3**: Build inbound job-intake parser (text-the-customer flow) + check-in SMS workflow + **service-recovery routing**
- **Day 4**: Build review request + nudge workflow (click-gated) + **quiet-hours send windows (recipient-local)**
- **Day 5**: Build reactivation trickler + STOP handler + owner intake-inactivity check-in
- **Day 6**: Build GBP API polling + Claude response flow (auto-post / Slack approval split) + weekly competitor report generator (SerpAPI integration)
- **Day 7**: Close CRM pipeline setup, purchase sender phones, onboarding form (GBP manager step + consent attestation + Founding 5 testimonial contingency), landing page + Stripe checkout

### Week 2 — Sell
- **Day 8**: Filter existing Close leads to roofers, enrich top 100 with Google review counts
- **Day 9**: Build sales cadence workflows + pre-demo audit generator
- **Day 10**: Launch outbound (100 roofing leads receive Day 1 messages)
- **Day 11-14**: Book demos, close first 2 clients (Founding 5 terms)

### End of Week 2 Target
- **2 paying clients** = $594 MRR (setup fees waived under Founding 5 — traded for testimonial assets)

---

## 8. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Client uploads non-consenting list → TCPA claim ($500-1,500/msg) | Structured consent attestation (method + dates, signed) + ToS indemnification + ≤50/day trickle + quiet-hours enforcement + E&O insurance at $5K MRR (sooner if any client list >1K numbers) |
| A2P 10DLC campaign rejected | ISV use-case wording from Day 1 ("review request platform sending on behalf of local business customers"); resubmit within 24hr if needed |
| Google delists client GBP for review pattern | Same link to all customers (no gating — service recovery suppresses the ask, never filters reviewers), ≤50/day reactivation pace, no incentive language |
| Claude posts inappropriate response | 1-3 star responses human-approved (60-min SLA); 4-5 star auto-posts are low-risk thank-yous with content filters + fallback templates |
| Client won't grant GBP manager access | Blocking onboarding requirement, framed as standard practice ("same access you'd give any marketing agency"); refusal = disqualify before money changes hands |
| Owner stops sending intake texts → churn signal | 7-day inactivity SMS check-in flags the drift 30 days before cancellation, gives Owner time to intervene |
| Churn exceeds 8% model | Competitor report + recency framing; if Month 6 churn >10%, test optional annual plan ($247/mo billed annually) without abandoning no-contract positioning for monthly |
| Google native AI review-reply feature threatens category | 12-24 month window; expansion roadmap already scoped — missed-call text-back (~$100/mo add-on, trivial with Close), AI voice answering — moves the offer from "reviews" to "front-desk automation" |
| Lead pool depletion (~Month 6-8) | Scraper pipeline feeding fresh trade leads by Month 3 — standing dependency |
| Founding 5 client churns before delivering testimonial | Setup fee waiver contingent on testimonial delivered within 60 days of first review — otherwise setup fee back-billed |
| SerpAPI/competitor data source outage or price hike | Fall back to DataForSEO (~$50/mo) or manual competitor lookup for weekly report; report can degrade gracefully to "your reviews this week" without competitor comparison for 1-2 weeks |

### Kill Criteria
If fewer than 5 clients closed by Day 180, reassess. Options: pivot to done-for-you service model, white-label to agencies, or exit.

### Insurance & Legal
- Register new LLC for asset isolation (~$300 setup, $150/yr)
- E&O insurance with TCPA coverage at $5K MRR (~$200/mo, $1M limit) — earlier if any single client list exceeds 1K numbers
- Founding 5 testimonial rights release (1-page signed) at onboarding

---

## 9. Team & Time Commitment

### Solo founder execution (Owner)
- **Build phase** (Weeks 1-2): ~35 hours
- **Sales operations** (ongoing): ~10 hours/week (demo calls, reply monitoring, 1-3 star response approvals)
- **Client delivery** (per client): ~10 minutes/week (approving 1-3 star response drafts within 60-min SLA)

### Hiring Plan
- **First hire at 10 clients / $3K MRR**: Part-time VA for onboarding admin + intake monitoring (~$800/mo)
- **Second hire at 30 clients / $9K MRR**: Full-time customer success (~$3K/mo)

---

## 10. Investment Required

### One-time costs
- Legal (LLC formation): $300
- A2P 10DLC Brand + Enhanced Vetting: $150
- Domain: $12
- Sales sender phones (first 3): $3.45/mo × 12 = $41
- **Total one-time**: **~$500**

### Recurring costs (first 12 months)
- Fixed monthly costs ($86 × 12): $1,032
- SerpAPI Basic (starts Day 1): included above
- Insurance (starts ~Month 6 at $5K MRR): ~$200 × 6 = $1,200
- **Total recurring Year 1**: **~$2,232**

### Opportunity cost (new in v2)
- Founding 5 setup fees waived: $2,485 — traded for 5 video testimonials, case-study rights, and before/after screenshots that power all subsequent sales

### **Total Year 1 investment: ~$2,732 cash (+$2,485 waived fees)**
### **Projected Year 1 revenue: ~$100,000**
### **Projected Year 1 profit: ~$80,000**

---

## 11. Approvals Needed

Before Week 1 build begins:

1. **Brand name + domain** approved and registered
2. **Legal entity** approved (new LLC or DBA under existing)
3. **Founding 5 terms** approved (setup waived for testimonial rights; $397 price ladder at 20 case studies; 60-day testimonial contingency)
4. **First outreach batch** approved (which existing Close roofing leads receive Day 1 outreach)
5. **Google account** designated for GBP manager access across all clients (dedicated account recommended, e.g., `reviews@<domain>`)
6. **Competitor data source** confirmed (SerpAPI Basic $75/mo default; DataForSEO $50/mo alternative)

---

## 12. Competitive Landscape (Brief)

| Competitor | Price | Structure | Our Wedge |
|---|---|---|---|
| Podium | $399-$999/mo/loc | 12-mo contract, hidden add-ons | No contract, published pricing, 30-day guarantee |
| Birdeye | $299-$449/mo/loc | Annual, 8% renewal fee | Flat price, no renewal hikes |
| NiceJob | $75-$125/mo | Month-to-month, feature-lean | AI response + service recovery + competitor tracking included |
| GoHighLevel resellers | $99-$497/mo | Bundled with 20 other features | Focused, purpose-built for reviews only |

**Our positioning**: The only Google Reviews service that respects the client — no contract, no add-ons, a guarantee with teeth, and a weekly report that shows exactly where you stand against the competitors down the street.

---

## Contact

**Owner**
Email: Owner@your-domain.com

Full documentation available at: `/Users/rafiulislam/Work/n8n/review-engine/docs/`

---

*This document is a project brief. Detailed technical specifications, workflow diagrams, SMS templates, and cost models available in the supporting documentation folder.*
