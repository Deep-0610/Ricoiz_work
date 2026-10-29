# 08. Sales Funnel

**Channel**: Close CRM only (existing leads). No Instantly. No new tools.

## Lead Source (Phase 1)

**Roofing companies only** from existing Close CRM leads.

Filter: ICP tag `review-engine-icp-roofing`.

**Lead supply dependency**: Existing DB seeds Months 1-4. Scraper pipeline must be feeding fresh roofing leads by Month 3 or growth stalls Month 6-8.

## Enrichment (per lead, before outreach)

WF-REV-AUDIT auto-generates when lead moves to `Enriched` status:

1. SerpAPI lookup: business by name/phone → GBP data (current review count, avg rating)
2. SerpAPI local pack search "roofers {city}" → top 3 competitor place IDs
3. Get competitor review counts + ratings
4. Compute reviews/month velocity trend
5. Claude generates 1-page Markdown → PDF via pdfmonkey
6. PDF URL stored in `cf_reviewSalesAuditUrl`

**Cost**: ~$0.15 per audit (SerpAPI + Claude + PDF gen). At 100 audits/week = $60/mo.

## Cadence (4 touches over 10 days)

| Day | Channel | Template |
|---|---|---|
| 1 | SMS + Email | Hook (their # of reviews vs competitor) |
| 3 | SMS + Email | Followup (competitor pulling ahead) |
| 6 | SMS + Email | **Pre-demo audit attached** |
| 10 | SMS + Email | Breakup |

Templates in [07-sms-templates.md](07-sms-templates.md).

## Reply Handling (manual, 30 min/day)

Monitor Close CRM inbox. When positive reply:
- Reply within 15 min from Close
- **Send Calendly link + pre-demo audit URL**: "Great! Book here: {calendlyLink} — and here's the audit I made for you: {auditUrl}"

Common objections:
- "Too expensive" → "1 extra job/mo = 17× ROI. Plus 30-day guarantee: 10 reviews or next month free."
- "Already have review software" → "Ours is no contract, $297 flat. Podium is $500+ with lock-in. Cancel today if you want, no BS."
- "How does it work?" → Send the demo Calendly link + audit URL

## Pre-Demo Audit Delivery

**Two moments the audit is sent**:

1. **Day 6 cadence touch** — attached PDF, "made this for you" beats any case study
2. **Demo booking confirmation email** — sent immediately after Calendly booking (via Calendly webhook → n8n → email)

Prospects who see their gap show up. Lifts demo show rate from 40-50% to 60%+.

## Demo (15 min Zoom)

1. **Min 0-2**: Walk through their audit (they've already seen it — twist the knife on the competitor gap)
2. **Min 2-7**: Demonstrate the 3-message system + service recovery live
3. **Min 7-11**: Pricing + math + **30-day guarantee** ("10 reviews or next month free")
4. **Min 11-13**: Founding 5 pitch (if applicable) — setup waived for testimonial rights
5. **Min 13-15**: Close — send Stripe checkout link

## Pricing Offered

- **Founding 5** (first 5 clients only): $297/mo, **setup waived** in exchange for testimonial rights (60-day contingency)
- **Standard** (client #6-20): $297/mo + $497 setup
- **Post-milestone** (client #21+): $397/mo + $497 setup (existing clients grandfathered at $297)

## Realistic Funnel Math

Per 100 leads:
- ~15 replies (13-15% cumulative)
- ~5 demos booked (30% of replies)
- ~3 demos attended (60%+ show rate with pre-demo audit)
- ~1 client closed (30-35% close rate)

= **1% overall conversion**

Month 12 target (10 new/mo) requires ~1,000 fresh leads/month.

## Referral Program (post-client-5)

**1 month free per closed referral.**

- Convex `referrals` table tracks
- Stripe promo code (`REFER-{clientId}`) applied to referrer's next invoice
- Sent to client after they hit 10 reviews (guarantee milestone) via SMS template

At 95% margin, $297 referral cost dramatically outperforms 1% cold funnel. Should supplement outbound from Month 5+.

## Weekly Cadence Ops

Monday morning (30 min):
1. Pull next 100 leads from Close CRM tagged `review-engine-icp-roofing`
2. Trigger WF-REV-AUDIT for each
3. Add to `cf_reviewSalesStage = 0`
4. Add to WF-REV-SALES-01 queue
5. Monitor replies via Close CRM throughout week
