# 16. Open Decisions

**Lock these before Week 1 build starts.**

## 1. Brand Name + Domain

Options:
- ReviewLift.co
- ReviewEngine.co
- GetMoreGoogle.co
- Other?

**Locked**: _______________
**Locked date**: _______________

## 2. Legal Entity

- New LLC (Delaware) — recommended for asset isolation
- New LLC (home state) — cheaper filing
- DBA under existing entity — simpler, less protection

**Locked**: _______________
**Locked date**: _______________

## 3. Founding 5 Terms

Confirm terms from PROJECT-PLAN v2:
- Setup fee waived ($497 forgone)
- Video testimonial + case-study rights + before/after GBP screenshots
- Signed release at onboarding
- **60-day contingency**: testimonial must be delivered within 60 days of first review, or setup fee back-billed

Locked as-is? ☐ Yes ☐ Modified: _______________

**Locked date**: _______________

## 4. First Outreach Batch

Confirmed: **Roofing companies only for first 10 clients.**

Which existing Close CRM leads?
- Tag filter: `review-engine-icp-roofing`
- Top 100 enriched with SerpAPI review counts + audits
- Geographic scope (nationwide? specific states?)

**Locked**: _______________
**Locked date**: _______________

## 5. Google Account for GBP Manager Access

Options:
- Dedicated account `reviews@<domain>` — recommended
- Reuse an existing Google Workspace account
- Personal Gmail — NOT recommended (professional appearance + suspension risk)

**Locked**: _______________
**Locked date**: _______________

## 6. Competitor Data Source

Options:
- **SerpAPI Basic** ($75/mo, 5K queries) — default recommendation
- **DataForSEO** ($50/mo, higher limits, less polished)
- **Bright Data** (enterprise, if scaling past 100 clients)

**Locked**: _______________
**Locked date**: _______________

## 7. Convex Deployment

- **Reuse `YOUR_CONVEX_DEPLOYMENT`** (existing, add tables — simpler, free)
- Provision new `review-engine` deployment (isolated, +$25/mo Convex Pro)

**Locked**: _______________
**Locked date**: _______________

---

## Lock Summary Template

Once decided, fill in below:

```
LOCKED (YYYY-MM-DD):

Brand: [BRAND NAME]
Domain: [DOMAIN]
Legal entity: [LLC-STATE / DBA]
Founding 5: [YES with 60-day contingency / MODIFIED]
First vertical: ROOFING (confirmed)
Google account: reviews@[DOMAIN]
Competitor data: [SERPAPI / DATAFORSEO]
Convex deployment: [REUSE / NEW]

Signed off by: Owner
```

---

## Not-Decisions (Already Locked in v2)

- ✅ Pricing: $297/mo + $497 setup, grandfathered
- ✅ Price ladder to $397 after 20 case studies
- ✅ 30-day review guarantee ("10 reviews or next month free")
- ✅ 3-message SMS drip (Adam's exact templates)
- ✅ Service recovery flow (negative reply → owner routing)
- ✅ Weekly competitor report (retention play)
- ✅ Pre-demo audit generator (SerpAPI + Claude + PDF)
- ✅ SMS via Close CRM (not Twilio direct)
- ✅ Sales via Close CRM (not Instantly)
- ✅ n8n (existing instance)
- ✅ Claude Haiku 4.5 via OpenRouter
- ✅ AI response split: 4-5 auto, 1-3 approval (60-min SLA)
- ✅ Vercel for landing page
- ✅ Stripe for billing
- ✅ Reactivation ≤50/day
- ✅ Recipient-local quiet hours (client TZ default + NPA override)
- ✅ Structured consent attestation (not checkbox)
- ✅ ISV framing for A2P 10DLC
- ✅ 7-day owner intake inactivity check-in
- ✅ 1 month free per closed referral
- ✅ 4-touch sales cadence (Day 1/3/6/10) with pre-demo audit at Day 6
- ✅ E&O insurance at $5K MRR
- ✅ Kill criteria: <5 clients by Day 180 → reassess

---

## Decision Deadline

**All 7 open decisions must be locked before Week 1 Day 1 build begins.**

Recommended: lock this week, start build Monday.
