# 12. Cost Model

**v2**: 8% monthly churn, SerpAPI added, Founding 5 opportunity cost included.

## Fixed Costs (monthly)

| Item | Cost | Notes |
|---|---|---|
| Domain | $1 | GoDaddy/Namecheap |
| Vercel Hobby | $0 | Free until revenue |
| Convex | $0 | Reusing `YOUR_CONVEX_DEPLOYMENT` |
| n8n | $0 | Existing subscription |
| Close CRM | $0 | Existing subscription |
| A2P 10DLC Campaign | $10 | Recurring |
| **SerpAPI Basic** | **$75** | Competitor tracking + pre-demo audits |
| Slack | $0 | Free |
| **Total fixed** | **$86/mo** | Plus $150 one-time A2P + Aegis vetting |

## Variable Costs (per client, per month)

| Item | Cost |
|---|---|
| Close CRM sender phone | $1.15 |
| Close CRM intake phone | $1.15 |
| Close CRM SMS (~250 segments outbound) | $5.00 |
| Claude AI (Haiku 4.5, ~20 reviews) | $0.05 |
| SerpAPI competitor queries | $1.00 (amortized) |
| Postmark weekly reports (5 emails/mo) | $0.05 |
| Stripe fee (3% of $297) | $8.91 |
| **Total per client** | **~$17/mo** |

## Setup Economics

| Item | Standard | Founding 5 |
|---|---|---|
| Setup fee revenue | $497 | $0 (waived) |
| Admin time cost | ~$100 | ~$100 |
| **Setup profit** | **$397** | **-$100** |

**Opportunity cost of Founding 5** = 5 × $497 = **$2,485 total waived** — traded for testimonials that power all subsequent sales.

## Unit Economics (per client per month)

| Item | Amount |
|---|---|
| Revenue | $297.00 |
| Variable cost | ($17.00) |
| **Contribution margin** | **$280 (94%)** |

## 12-Month Projection (8% Monthly Churn)

| Month | New Clients | Total (net churn) | MRR | Setup Rev |
|---|---|---|---|---|
| 1 | 2 (Founding) | 2 | $594 | $0 |
| 2 | 3 (Founding) | 5 | $1,485 | $0 |
| 3 | 3 | 8 | $2,376 | $1,491 |
| 4 | 4 | 11 (-1 churn) | $3,267 | $1,988 |
| 5 | 5 | 15 (-1 churn) | $4,455 | $2,485 |
| 6 | 6 | 20 (-1 churn) | $5,940 | $2,982 |
| 7 | 6 | 24 (-2 churn) | $7,128 | $2,982 |
| 8 | 7 | 29 (-2 churn) | $8,613 | $3,479 |
| 9 | 8 | 34 (-3 churn) | $10,098 | $3,976 |
| 10 | 9 | 39 (-4 churn) | $11,583 | $4,473 |
| 11 | 10 | 45 (-4 churn) | $13,365 | $4,970 |
| 12 | 10 | 51 (-4 churn) | $15,147 | $4,970 |

Adjusted for realistic execution with Founding 5 waived:

**Year 1 revenue**:
- Recurring: sum of MRR = ~$84K
- Setup fees (excl. Founding 5): ~$34K
- **Total: ~$118K**

**Year 1 costs**:
- Fixed × 12: $1,032
- Variable × avg clients × 12: ~$4,300
- Founding 5 opportunity cost: $2,485 (waived setup)
- A2P + Aegis one-time: $150
- Insurance (Month 6+, ~$200 × 7): $1,400
- LLC: $300
- Domain: $12
- **Total: ~$9,700**

**Year 1 net profit: ~$100,000**

If churn holds at 5% (v1 assumption), lands ~$16K MRR by M12 → treat as upside.

## Break-Even

| Clients | Fixed | Variable | Revenue | Profit |
|---|---|---|---|---|
| 1 | $86 | $17 | $297 | +$194 |
| 5 | $86 | $85 | $1,485 | +$1,314 |
| **10** | **$86** | **$170** | **$2,970** | **+$2,714** |
| 20 | $86 | $340 | $5,940 | +$5,514 |
| 50 | $86 | $850 | $14,850 | +$13,914 |

**Break-even: 1 client** (contribution margin covers fixed at $280 vs $86).

## Referral Program Impact

**1 month free per closed referral** = $297 cost per referral-sourced client.

vs. cold outreach CAC:
- Admin time: 100 leads × 5 min = 8.3 hrs × $50 = $415
- Enrichment (SerpAPI + Claude): $15
- Total: **~$430/client from cold outreach**

Referral CAC of $297 = **31% cheaper**, plus these clients retain better (personal recommendation). Should supplement outbound from Month 5 onward.

## Sensitivity: If Churn Hits 12%

Worst-case model:
- Month 12: ~35 clients / $10,395 MRR
- Year 1 revenue: ~$70K
- Year 1 profit: ~$55K

Still profitable. Business survives being wrong.

## Sensitivity: If Only 500 Leads/Month Available

If lead supply constrained:
- Month 12 pace: 5 new clients/mo instead of 10
- Month 12: ~28 clients / $8,316 MRR
- Referral program becomes critical to hit 44-client target
