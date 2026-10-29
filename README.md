# Review Engine — Google Reviews SMS Service

**Two-phase approach: Manual first (prove it works), then automate.**

**Main plan**: [PROJECT-PLAN.md](PROJECT-PLAN.md) (v2 — LOCKED)

**Status**: 📝 Phase 1 (manual launch) ready to build
**Started**: 2026-07-10
**Owner**: Owner

---

## 🎯 Two-Phase Strategy

### Phase 1: Manual Launch (Now → First 3-4 Clients)

**Philosophy**: Prove the product works with real paying clients BEFORE building automation.

**Build**: 6 core n8n workflows + Convex delivery endpoints + simple landing page
**Manual**: Payment (Stripe Payment Link), onboarding (Google Form), AI responses (manual paste), weekly reports (Gmail), sales outreach (Close CRM UI)

**Timeline**: 2-3 weeks to first client, 30-45 days to 4 clients
**Cost**: ~$500 one-time + ~$75/mo at 4 clients
**Target**: 4 clients, $1,188 MRR, prove product-market fit

**Full plan**: [docs/PHASE-1-MANUAL-LAUNCH.md](docs/PHASE-1-MANUAL-LAUNCH.md)

### Phase 2: Full Automation (After 3-4 Clients)

**Trigger**: Only after Phase 1 success criteria met.

**Build**: 6 additional workflows + full landing page + Stripe webhook + SerpAPI + Postmark + PDFMonkey + GBP OAuth
**Kills**: All manual delivery work → Owner time drops from 2-3 hrs/day to <1 hr/day
**Timeline**: 2-3 weeks
**Scale unlock**: 20-50 clients on the same time budget

**Full plan**: [docs/PHASE-2-AUTOMATION.md](docs/PHASE-2-AUTOMATION.md)

---

## The Product (Same in Both Phases)

- **Price**: $297/month + $497 setup (Founding 5: setup waived)
- **Guarantee**: 10 new Google reviews in 30 days or next month free
- **Delivery**: 3-message SMS drip after every job + reactivation + AI review responses
- **Target**: Roofers (first 10 clients), then HVAC / dentists / med spas

---

## Phase 1 Build Checklist

### Deploy (Day 1-2)
- [ ] Deploy Convex to `YOUR_CONVEX_DEPLOYMENT` (code already written)
- [ ] Simple landing page (Notion or 1-page Vercel) with Stripe Payment Link + Calendly

### Fix 6 Workflows (Day 3-5)
- [ ] WF-REV-INTAKE — Owner text parser (fix parse errors + confirmation)
- [ ] WF-REV-01 — Check-in SMS (add opt-out check + NPA quiet hours)
- [ ] WF-REV-02 — Review request + nudge (**add sticky sender + inbound reply check — critical**)
- [ ] WF-REV-03 — Reactivation trickler (add ≤50/day cap)
- [ ] WF-REV-06 — Intake inactivity check-in
- [ ] WF-REV-INBOUND — Reply router (add all branches)

### Registration (Day 1, parallel)
- [ ] File new LLC ($300)
- [ ] Register domain ($12)
- [ ] Submit A2P 10DLC Brand + Aegis Enhanced Vetting ($46 + $95)
- [ ] Submit A2P Campaign with ISV framing ($15 + $10/mo)
- [ ] Create 2 Stripe Payment Links ($297/mo + $497 setup)
- [ ] Create Google Form onboarding
- [ ] Set up 2 Slack channels (`#ops`, `#alerts`)

### Sales (Week 2-3)
- [ ] Filter Close CRM leads → tag `review-engine-icp-roofing`
- [ ] Purchase 1 Close CRM sales sender phone
- [ ] Manual outbound to 100 roofers via Close CRM UI
- [ ] Book + conduct demos
- [ ] Close first 2 Founding 5 clients

---

## Skipped in Phase 1 (Build in Phase 2 Only)

**Workflows NOT built in Phase 1**:
- ❌ WF-REV-04 (AI Auto-Response) — do manual paste
- ❌ WF-REV-05 (Weekly Competitor Report) — do manual Gmail
- ❌ WF-REV-AUDIT (Pre-Demo Audit) — do manual demo screenshots
- ❌ WF-REV-SALES-01/02/03 (Sales cadence) — do manual Close CRM
- ❌ WF-REV-STRIPE-WEBHOOK — use Stripe Payment Link, manual admin
- ❌ WF-REV-GBP-COOLDOWN-CHECK
- ❌ WF-REV-GUARANTEE-MILESTONE
- ❌ WF-REV-FOUNDING-CHECK
- ❌ WF-REV-WARMUP
- ❌ WF-REV-REACTIVATION-CSV-PARSER

**Services NOT needed in Phase 1**:
- ❌ SerpAPI ($75/mo — skip)
- ❌ PDFMonkey — skip
- ❌ Postmark — skip (Gmail)
- ❌ Google `reviews@<domain>` OAuth — skip

---

## Docs Index

| # | Doc | Phase |
|---|-----|---|
| — | **[PROJECT-PLAN.md](PROJECT-PLAN.md)** | Overall plan v2 |
| — | **[docs/PHASE-1-MANUAL-LAUNCH.md](docs/PHASE-1-MANUAL-LAUNCH.md)** | Phase 1 build + manual ops |
| — | **[docs/PHASE-2-AUTOMATION.md](docs/PHASE-2-AUTOMATION.md)** | Phase 2 build (after 3-4 clients) |
| 01 | [Product Overview](docs/01-product-overview.md) | Both |
| 02 | [Tech Architecture](docs/02-tech-architecture.md) | Both |
| 03 | [Convex Schema](docs/03-convex-schema.md) | Both |
| 04 | [Convex Endpoints](docs/04-convex-endpoints.md) | Both |
| 05 | [n8n Workflows](docs/05-n8n-workflows.md) | Both |
| 06 | [Close CRM Setup](docs/06-close-crm-setup.md) | Both |
| 07 | [SMS Templates](docs/07-sms-templates.md) | Both |
| 08 | [Sales Funnel](docs/08-sales-funnel.md) | Both (manual in P1) |
| 09 | [Client Onboarding](docs/09-client-onboarding.md) | Both |
| 10 | [AI Response System](docs/10-ai-response-system.md) | Phase 2 |
| 11 | [Compliance](docs/11-compliance.md) | Both |
| 12 | [Cost Model](docs/12-cost-model.md) | Both |
| 13 | [Launch Timeline](docs/13-launch-timeline.md) | Both |
| 14 | [Metrics & KPIs](docs/14-metrics-kpis.md) | Both |
| 15 | [Risk Mitigation](docs/15-risk-mitigation.md) | Both |
| 16 | [Open Decisions](docs/16-open-decisions.md) | Both |

**Archive**: [docs/archive/](docs/archive/) — earlier research
**Audit**: [n8n-workflows/AUDIT-2026-07-10.md](n8n-workflows/AUDIT-2026-07-10.md) — workflow gaps

---

## Business Math (Phase 1 → Phase 2)

| Milestone | Clients | MRR | Time/Day | Cost/mo |
|---|---|---|---|---|
| Phase 1 target (Day 45) | 4 | $1,188 | 2-3 hrs | $75 |
| Phase 2 automate (Month 4-5) | 8 | $2,376 | 1 hr | $175 |
| Growth (Month 6) | 20 | $5,940 | 1 hr | $451 |
| Month 12 target | 44 | $13,068 | 1-2 hrs | ~$800 |

**Phase 1 profit at 4 clients**: ~$1,100/mo (Owner's labor covers)
**Phase 2 profit at 20 clients**: ~$5,489/mo (92% margin, automation handles delivery)

---

## Next Actions

### This Week — Lock Decisions
See [docs/16-open-decisions.md](docs/16-open-decisions.md):

1. Brand name + domain (Recommend: ReviewLift.co)
2. Legal entity — new LLC recommended
3. Founding 5 terms confirmed (60-day contingency)
4. First outreach batch (which Close CRM roofers?)

### Day 1 (After Decisions Locked)
1. File LLC
2. Register domain
3. Submit A2P 10DLC
4. Create Stripe Payment Links
5. Deploy Convex

### Days 2-5
1. Fix 6 core workflows
2. Simple landing page
3. n8n config

### Days 6-14
1. Manual outreach to 100 roofers
2. Book demos
3. Close first 2 clients

### Days 15-45
1. Onboard 4 clients (manually)
2. Deliver service (manually)
3. Collect first Founding 5 testimonials
4. Prove product-market fit

### Day 46+ (After 4 Clients + PMF)
1. Start Phase 2 automation build
2. All 12 remaining workflows + full landing + Stripe webhook + SerpAPI + Postmark + PDFMonkey
3. Scale to 20+ clients

---

## Key Files

```
review-engine/
├── PROJECT-PLAN.md
├── README.md                    ← YOU ARE HERE
├── docs/
│   ├── PHASE-1-MANUAL-LAUNCH.md ← ⭐ Start here for build
│   ├── PHASE-2-AUTOMATION.md    ← After 3-4 clients
│   ├── 01-16 planning docs
│   └── archive/
├── convex/                      ← 2,573 lines TypeScript (ready to deploy)
├── landing/                     ← 571 lines Next.js (skip in Phase 1)
└── n8n-workflows/
    ├── README.md                ← 12 workflow IDs
    └── AUDIT-2026-07-10.md      ← Gap analysis
```

---

## Bottom Line

**Phase 1 = 6 workflows + minimal build + manual ops. Get 4 clients.**
**Phase 2 = full automation. Scale to 20+ clients.**

No wasted engineering. Adam Erhart approach. Ship fast, prove it works, then scale.
