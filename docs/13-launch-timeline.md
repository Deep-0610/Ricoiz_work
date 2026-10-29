# 13. Launch Timeline (Phased)

**Two-phase strategy**: Manual first, automate after product-market fit.

Full phase docs:
- [PHASE-1-MANUAL-LAUNCH.md](PHASE-1-MANUAL-LAUNCH.md) — First 3-4 clients (manual ops)
- [PHASE-2-AUTOMATION.md](PHASE-2-AUTOMATION.md) — Full automation (after 4 clients)

---

## Phase 1 Timeline (Week 1-6)

### Week 1 — Build + Register (Days 1-7)

**Day 1** (Foundation, parallel)
- [ ] Lock 4 open decisions (brand, LLC, Founding 5, first vertical)
- [ ] File new LLC ($300)
- [ ] Register domain ($12)
- [ ] Submit A2P 10DLC Brand + Aegis Enhanced Vetting ($46 + $95)
- [ ] Submit A2P Campaign with ISV framing ($15 + $10/mo)
- [ ] Create 2 Stripe Payment Links ($297/mo + $497 setup)
- [ ] Create Google Form onboarding
- [ ] Set up 2 Slack channels (`#ops`, `#alerts`)

**Day 2** (Convex Deploy)
- [ ] Deploy Convex schema + core delivery endpoints (code already written)
- [ ] DNS: `go.<domain>` → Convex click tracker
- [ ] Test endpoints with Postman

**Days 3-5** (Fix 6 Core Workflows)
- [ ] WF-REV-INTAKE (parse error SMS + owner confirm + opt-out check)
- [ ] WF-REV-01 (add opt-out check + NPA quiet hours)
- [ ] WF-REV-02 (**sticky sender + inbound reply check — CRITICAL**)
- [ ] WF-REV-03 (add ≤50/day cap)
- [ ] WF-REV-06 (add lastAlertSentAt gate)
- [ ] WF-REV-INBOUND (add routing by number type + STOP + snooze)

**Days 6-7** (Landing + Test)
- [ ] Simple landing page (Notion or 1-page Vercel with Stripe Payment Link + Calendly)
- [ ] n8n config (env vars, Slack webhooks, Convex auth credential)
- [ ] End-to-end test with own phone as test client

### Week 2 — Sales (Days 8-14)

- **Day 8**: Filter Close CRM leads → tag `review-engine-icp-roofing`
- **Day 9-10**: Wait for A2P approval + purchase 1 Close CRM sales sender phone
- **Days 11-14**: Manual outbound to 50-100 roofers via Close CRM UI, book demos

### Week 3-6 — First Clients (Days 15-42)

- **Days 15-18**: Conduct demos, close first 2 Founding 5 clients
- **Days 19-21**: Manual onboarding (Convex row, phones, CSV upload)
- **Days 22-30**: Deliver service manually (paste AI responses, weekly reports, monitor drips)
- **Days 31-42**: Close 2 more clients (target: 4 total)

**Phase 1 Complete**: Day 42-45
- 4 paying clients
- $1,188 MRR
- At least 1 Founding 5 testimonial received
- Zero cancellations
- Manual delivery time ~2-3 hrs/day

---

## Phase 2 Timeline (Days 46-62, ~3 weeks)

**Only start Phase 2 after Phase 1 success criteria met.**

### Week 7 — AI + Payment Automation
- Days 46-49: Build WF-REV-04 (AI Auto-Response) + Google OAuth setup + WF-REV-GBP-COOLDOWN-CHECK
- Day 50: Build WF-REV-STRIPE-WEBHOOK + full landing page + onboarding form
- Days 51-52: Build WF-REV-05 (Weekly Competitor Report) + SerpAPI/Postmark setup

### Week 8 — Sales + Guarantee Automation
- Days 53-55: Build WF-REV-SALES-01/02/03 + WF-REV-AUDIT
- Days 56-58: Build WF-REV-GUARANTEE-MILESTONE + WF-REV-FOUNDING-CHECK + WF-REV-WARMUP + WF-REV-REACTIVATION-CSV-PARSER
- Day 59: Referral automation

### Week 9 — Test + Ship
- Days 60-61: End-to-end integration test of all 12 new workflows
- Day 62: Deploy + activate everything

**Phase 2 Complete**: Day 62 (~2026-11-11)
- All 18 workflows live and healthy
- Owner manual time drops to <1 hr/day
- Ready to scale to 20-50 clients

---

## Critical Path Items

### Phase 1
| Item | Timeline | Backup |
|---|---|---|
| A2P Campaign approval | 5-15 biz days | Toll-free numbers (limited) |
| Aegis Enhanced Vetting | 2-4 weeks | Standard vetting for launch |
| Convex + workflow fixes | 3-5 days build | — |

### Phase 2
| Item | Timeline | Backup |
|---|---|---|
| GBP OAuth verification | 2-6 weeks | Manual paste (Phase 1 pattern) |
| GBP Manager 7-day cooldown per client | Automatic wait | — |
| SerpAPI account approval | Instant | DataForSEO ($50/mo) |

---

## Milestones + Money

| Milestone | Target Date | Signal |
|---|---|---|
| First outbound SMS sent | Day 8 | Workflow live |
| First demo booked | Day 12 | Pitch working |
| First client closed | Day 18 | Product-market fit signal |
| First client fully onboarded | Day 20 | Delivery works |
| First review received | Day 25 | Client sees value |
| 3rd client closed | Day 32 | Repeatable |
| 4th client closed | Day 42 | **PHASE 1 COMPLETE** |
| Phase 2 automation live | Day 62 | Scaling unlocked |
| 10 clients | Day 90 | Growth mode |
| 20 clients | Day 120 | Consider hiring |
| Month 12 target | Day 365 | 44 clients / $13K MRR |

---

## Kill Criteria

### Phase 1
If fewer than 2 clients closed by Day 45:
- Product-market fit issue
- Reassess pitch, offer, ICP
- DO NOT proceed to Phase 2 automation

### Phase 2
If Phase 2 automation causes:
- Client complaints about AI response quality
- Deliverability drops
- Higher churn than Phase 1

Rollback specific workflows to manual until issue resolved.
