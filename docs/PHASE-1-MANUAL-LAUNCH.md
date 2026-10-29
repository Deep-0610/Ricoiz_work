# Phase 1 — Manual Launch (First 3-4 Clients)

**Philosophy**: Prove the product works with real paying clients BEFORE building automation. Lean startup approach — no over-engineering.

**Goal**: Land 3-4 paying clients using minimal build + manual admin work. Once product-market fit is validated, move to Phase 2 (full automation).

**Timeline**: 2-3 weeks to first client. 30-45 days to 3-4 clients.

**Investment**: ~$500 one-time + manual labor (Owner ~2 hrs/day/client for delivery).

---

## What We BUILD in Phase 1

### 1. Deploy Convex (Day 1) — 1 hour
- Convex schema (already coded — 272 lines)
- Convex endpoints for DELIVERY ONLY (already coded)
- **Skip**: Stripe webhook endpoint, Founding 5 tracking, guarantee milestone queries, referral tracking
- Just deploy what's needed for SMS drip + intake + opt-out

### 2. Fix + Activate 6 Core Workflows (Days 2-4)

Only these 6 workflows get fixed + activated. Rest stay dormant.

| ID | Workflow | Status | Fix Effort |
|---|---|---|---|
| WF-REV-INTAKE | Owner text parser | ✅ Fix (~2hr) | Add parse error SMS, owner confirmation, opt-out check |
| WF-REV-01 | Check-in Msg 1 | ✅ Fix (~2hr) | Add opt-out check, NPA quiet hours, batch Slack |
| WF-REV-02 | Review request + nudge | ✅ Fix (~4hr) | **CRITICAL: sticky sender + inbound reply check (WF-NW-03 pattern)** |
| WF-REV-03 | Reactivation trickler | ✅ Fix (~2hr) | ≤50/day cap, opt-out check |
| WF-REV-06 | Intake inactivity | ✅ Fix (~1hr) | `lastAlertSentAt` gate |
| WF-REV-INBOUND | Reply router | ✅ Fix (~4hr) | Route by number type, STOP → global opt-out, snooze |

**Effort: 2-3 days total.**

### 3. Basic Landing Page (Day 5) — 4 hours

**Not the full landing page.** Simplified single page:
- Business name + tagline
- 3 bullet points (what we do)
- Pricing: $297/mo + $497 setup
- Guarantee callout
- **Stripe Payment Link** (not full checkout API) — Owner creates in Stripe dashboard, embeds link
- Calendly embed for demo booking

**Skip**: Full onboarding form, referral pages, Stripe API integration.

**Alternative**: Just a Notion page + Calendly link. Even simpler.

### 4. n8n Configuration (Day 5) — 2 hours
- Set env variables (`CONVEX_AUTH_TOKEN`, `OPENROUTER_API_KEY` — for inbound sentiment classifier)
- Create 2 Slack webhooks (`#review-engine-ops`, `#review-engine-alerts`)
- Set up Convex httpHeaderAuth credential

---

## What We DO MANUALLY in Phase 1

### 💰 Payment (MANUAL — Stripe Payment Link)
**How**:
- Create 2 products in Stripe dashboard:
  - `$297/mo recurring` → gets Payment Link URL
  - `$497 one-time setup` → gets Payment Link URL
- After demo closes: Send prospect the Payment Link via email
- Owner manually confirms payment in Stripe dashboard
- **No Stripe webhook needed. No customer portal. No auto-provisioning.**

**Effort**: 5 minutes per new client.

### 🚪 Client Onboarding (MANUAL — Google Form + Manual Admin)
**How**:
1. Client pays via Stripe Payment Link
2. Owner emails them:
   - Google Form link (business info + Google review URL + GBP Manager invite instructions + consent attestation)
   - Instructions to email CSV to `onboarding@<domain>`
3. Client fills form + emails CSV
4. Owner manually:
   - Creates Convex client row via Convex dashboard (or one-off script)
   - Purchases 2 Close CRM numbers (sender + intake)
   - Registers both to A2P campaign
   - Uploads CSV via Convex dashboard (or CSV import mutation)
   - Emails client their intake phone number + example: `"Sarah Johnson +14155551234"`

**Effort**: 30-45 minutes per client one-time.

### 🤖 AI Review Responses (MANUAL PASTE — No GBP API)
**How** (Phase 1):
1. Owner checks each client's Google Business Profile daily (5 min)
2. For each new review:
   - Open Claude in browser (`claude.ai` or Anthropic Console)
   - Paste the review with owner context
   - Copy Claude's response
   - Manually paste into Google Business Profile reply
3. Time: ~2-3 minutes per review × ~5 reviews/week per client × 4 clients = ~2 hours/week

**Skip in Phase 1**:
- WF-REV-04 (AI response workflow)
- GBP OAuth verification (not needed for manual paste)
- Google `reviews@<domain>` account (not needed yet)
- 7-day cooldown tracking
- SLA fallback logic
- Content filter automation
- PolicyViolation handling

**Effort**: ~30 min/day for 4 clients.

### 📊 Weekly Competitor Report (MANUAL EMAIL)
**How** (Phase 1):
1. Every Monday morning:
   - Open Google Maps, search "roofers [client city]"
   - Note top 3 competitor names + review counts
   - Compare to client's current review count
   - Write a simple email in Gmail with numbers
   - Send

**Skip**:
- WF-REV-05 workflow
- SerpAPI account
- Postmark server
- HTML template
- Snapshot tracking in Convex

**Effort**: ~15 min/client × 4 clients × 1x/week = 1 hour/week.

### 📞 Sales Outreach (MANUAL Close CRM)
**How** (Phase 1):
1. Owner manually sends outbound SMS/email to prospects via Close CRM UI
2. Follow up manually every 2-3 days
3. Book demos via Calendly
4. Track prospects in Close CRM tags

**Skip**:
- WF-REV-SALES-01/02/03 workflows
- Pre-demo audit generator (WF-REV-AUDIT)
- SerpAPI-based competitor lookups
- PDF generation

**For demo**: Just show Google Maps side-by-side comparison with competitors. No fancy PDF audit.

**Effort**: ~1-2 hours/day of outbound during launch.

### 🎁 Founding 5 Tracking (MANUAL Google Sheet)
- Track in Google Sheet: client name, sign-up date, testimonial due date (+60 days), testimonial received Y/N
- Send calendar reminder to Owner on due dates
- Manually charge $497 via Stripe if lapsed

**Skip**: WF-REV-FOUNDING-CHECK workflow.

### ✅ Guarantee Tracking (MANUAL Google Sheet)
- Track in Google Sheet: reviews received per client per month
- Manually message client when they hit 10 reviews (referral ask)
- Manually credit $297 to next invoice if guarantee missed

**Skip**: WF-REV-GUARANTEE-MILESTONE workflow.

### 🤝 Referrals (MANUAL Stripe Promo Codes)
- Create Stripe promo code manually when a client refers someone: `REFER-{clientname}`
- Apply to referred client's checkout
- Apply 1-month credit to referrer via Stripe dashboard when referred client pays

**Skip**: Referral automation, Convex `referrals` table usage.

---

## What We DO NOT DO in Phase 1

### Workflows to Skip Building
- ❌ WF-REV-04 (AI Auto-Response)
- ❌ WF-REV-05 (Weekly Competitor Report)
- ❌ WF-REV-AUDIT (Pre-Demo Audit)
- ❌ WF-REV-SALES-01/02/03 (Sales cadence)
- ❌ WF-REV-STRIPE-WEBHOOK
- ❌ WF-REV-GBP-COOLDOWN-CHECK
- ❌ WF-REV-GUARANTEE-MILESTONE
- ❌ WF-REV-FOUNDING-CHECK
- ❌ WF-REV-WARMUP
- ❌ WF-REV-REACTIVATION-CSV-PARSER

### Third-Party Skip in Phase 1
- ❌ SerpAPI ($75/mo — skip, use manual Google Maps for competitor checks)
- ❌ PDFMonkey (skip, use Google Maps screenshots for demos)
- ❌ Postmark (skip, use Gmail for weekly reports)
- ❌ Google `reviews@<domain>` OAuth (skip, do manual paste)
- ❌ GBP API access (skip)

### Code Skip in Phase 1
- ❌ Full landing page (`landing/`) — use simple Notion page or single-page Vercel
- ❌ Onboarding form (`app/onboarding/page.tsx`) — use Google Form
- ❌ Stripe checkout API (`app/api/stripe-checkout/`) — use Stripe Payment Link
- ❌ Referral pages — do manually

---

## Phase 1 Cost Structure

### One-Time (Day 1)
- Legal (LLC): $300
- A2P 10DLC Brand: $46
- Aegis Enhanced Vetting: $95
- A2P Campaign registration: $15
- Domain: $12
- **Total one-time**: **~$470**

### Monthly (Phase 1)
- Domain: $1
- Vercel Hobby: $0
- Convex: $0 (reusing `YOUR_CONVEX_DEPLOYMENT`)
- n8n: $0 (existing)
- A2P Campaign: $10/mo
- Close CRM: $0 (existing) + $2.30/mo per client (2 phones each)
- Close CRM SMS: $5/mo per client
- Claude via OpenRouter: $0.05/mo per client (only inbound sentiment classifier)
- Stripe fee: $8.91/mo per client (3% of $297)
- **Total per client**: ~$16/mo variable
- **Fixed monthly**: $11
- **Total at 4 clients**: **$11 + $64 = $75/mo**

### Phase 1 Revenue at 4 Clients
- $297 × 4 = $1,188 MRR
- $497 setup × 1 non-founding (assuming 3 Founding 5 + 1 standard) = $497 one-time
- **Contribution profit**: **~$1,100/mo**

### Owner's Manual Labor
- ~2-3 hours/day across 4 clients (delivery + monitoring + outreach)
- ~15 hours/week total

**Trade-off**: Trading time for zero risk of over-building.

---

## Phase 1 Success Criteria

Move to Phase 2 automation when ALL of these are true:

- [ ] 3-4 paying clients live for 30+ days
- [ ] At least 2 clients have hit 10-review guarantee milestone
- [ ] Zero client cancellations
- [ ] At least 1 signed Founding 5 testimonial received
- [ ] Owner's manual delivery time exceeds 3 hrs/day (scaling pain)
- [ ] Positive client feedback on all 4 clients
- [ ] Total MRR: $1,000+

**If NO** on any of these after 45 days: **Product-market fit issue. Do NOT build Phase 2 automation. Investigate and fix.**

---

## Phase 1 Timeline

### Week 1 (Days 1-7): Build + Register
- **Day 1**: File LLC, register domain, submit A2P Brand + Enhanced Vetting + Campaign, create Stripe products + Payment Links
- **Day 2**: Deploy Convex schema + core delivery endpoints
- **Day 3**: Fix WF-REV-INTAKE, WF-REV-01
- **Day 4**: Fix WF-REV-02 (sticky sender), WF-REV-INBOUND
- **Day 5**: Fix WF-REV-03, WF-REV-06 + simple landing page (Notion or 1-page Vercel)
- **Day 6-7**: n8n config (Slack webhooks, credentials, env vars) + integration test with own phone

### Week 2 (Days 8-14): Sales
- **Day 8**: Filter existing Close CRM roofing leads → tag `review-engine-icp-roofing`
- **Day 9-10**: Wait for A2P approval + purchase Close CRM sales sender phone (once approved) — start with 1 sender
- **Day 11-14**: Manual outbound to 50-100 roofing leads via Close CRM UI — book demos

### Week 3 (Days 15-21): First Clients
- **Day 15-18**: Conduct demos, close first 2 Founding 5 clients
- **Day 19-21**: Manual onboarding for first 2 clients — set up Convex, purchase their sender phones, upload CSVs, launch drip

### Week 4-6 (Days 22-42): Scale to 4 Clients + Deliver
- Continue outreach
- Onboard 2 more clients (target: 4 total)
- Manual daily delivery: paste AI responses, monitor drip, respond to negatives
- Weekly manual competitor report emails
- **Target Day 45**: 4 paying clients, $1,188 MRR, at least 2 Founding 5 testimonials collected

---

## Phase 1 Daily Checklist (After Clients Live)

**Every morning (30-45 min)**:
1. Check Slack for negative replies overnight → route to relevant client owner
2. Check each client's Google reviews for new posts → draft + paste response
3. Verify no workflow errors (n8n execution history)

**Every Monday (1-2 hours)**:
- Send manual weekly competitor report emails to all 4 clients

**Every Friday (30 min)**:
- Review new clients closed this week
- Check Founding 5 testimonial deadlines (Google Sheet)
- Update guarantee tracking sheet

**As needed**:
- Manual outbound to new roofing leads
- Book + conduct demos
- Onboard new clients

---

## Bottom Line

**Build 6 workflows. Do everything else manually.** Get 3-4 clients paying. Prove it works.

Then and only then, build Phase 2 automation.

Right approach. Zero wasted engineering.

---

## Next Doc

See [PHASE-2-AUTOMATION.md](PHASE-2-AUTOMATION.md) for the automation build plan (after 3-4 clients).
