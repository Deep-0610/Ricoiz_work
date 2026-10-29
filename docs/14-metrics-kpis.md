# 14. Metrics & KPIs

**Track what matters. No dashboard yet — Slack summaries + weekly review.**

## Business Health (weekly)

- **MRR** — active clients × $297
- **Active clients** — count where `active=true`
- **New clients this week**
- **Churned clients this week**
- **Founding 5 progress** — testimonials received vs. due
- **Cash on hand** — 3-month fixed cost runway minimum

## Sales Funnel (per outreach cohort)

- **Day 1 reply rate** — target 5-7%
- **Cumulative reply rate** (14 days) — target 13-15%
- **Demos booked / week**
- **Show rate** — target 60% (pre-demo audit lifts this)
- **Close rate** — target 30-35%
- **Overall conversion** — target 1% (leads → clients)
- **Founding 5 acceptance rate** — target 50%+ of first-5 offered

## Delivery Quality (per client, per month)

- **SMS delivery rate** — target 95%+
- **Check-in reply rate** — target 30%+
- **Negative reply rate** (service recovery triggered) — 3-8% expected
- **Review link click rate** — target 20%+
- **Reviews received** — target 8-15% of customers texted
- **Opt-out rate** — target <1.5%, alert if >2%

## Client Retention Signals

- **Intake activity per client** (weekly avg intake texts)
  - Healthy: 5+ per week
  - Warning: <3 per week
  - **Critical: 0 for 7 days** → automated check-in fires (WF-REV-06)
- **7-day inactivity alerts fired** (per week, across all clients)
- **Snooze reply rate** — high snooze = clients slipping
- **Competitor gap trend** per client — widening = churn risk

## AI Response System

- **Response post rate** — target 100% (excluding skipped)
- **Auto-post share** (4-5 star) — expect ~75-80%
- **Approval SLA hit rate** (1-3 star within 60 min) — target >95%
- **Auto-post-after-SLA rate** — track breaches
- **Content filter trigger rate** — target <5%
- **Claude API cost per client** — target <$0.10/mo

## Guarantee & Testimonials

- **10-review milestone hit rate** — target 100% for reactivation clients
- **Guarantee triggered (refund month issued)** — track any occurrences
- **Founding 5 testimonial delivered within 60 days** — track individually
- **Testimonials collected total** (case studies for sales)

## Referral Program (from Month 5+)

- **Referral asks sent** (after 10-review milestone)
- **Referrals invited**
- **Referrals converted to paying**
- **Referrer months-free credited**
- **Referral-sourced client CAC** vs cold outreach CAC

## System Health

- **Workflow success rate** — target 99%+
- **Slack alerts** on any workflow failure
- **Close CRM API errors** — target <0.1%
- **SerpAPI quota usage** — monitor to stay under Basic tier
- **GBP API rate limits hit** — should be 0

## Client-Facing Weekly Report

Sent Monday 9AM to each active client:

- **Your reviews this week**: X new (Y stars avg)
- **Total since start**: N reviews (M stars avg)
- **You vs. your top 3 competitors**:
  - [Competitor 1]: Q reviews, R stars (gained S this month)
  - [Competitor 2]: ...
  - [Competitor 3]: ...
- **Your review velocity trend**: ↑ 5/mo (last quarter avg 3/mo)
- **Response rate**: 100%
- **Next week focus**: [dynamic based on data]

Delivered via Postmark, simple Markdown → HTML.

## Slack Channels

- `#review-engine-ops` — daily workflow summary, new clients, milestones
- `#review-engine-approvals` — 1-3 star response queue
- `#review-engine-alerts` — critical failures, service recovery routes
- `#review-engine-wins` — new client closed, testimonial received, guarantee milestone hit

## Weekly Review (Friday 4PM ET)

1. MRR + client count vs. plan
2. Funnel numbers this week
3. Any churn? Interview if so
4. Delivery quality issues? Any clients underperforming?
5. Founding 5 testimonials on track?
6. One thing to improve next week

## Monthly Review (last Friday)

- Full MRR + CAC + LTV report
- Client-by-client health check
- Update this plan doc with actuals vs targets
- Approve/adjust next month's outreach volume
- Insurance check (activate at $5K MRR)
