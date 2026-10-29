# 07. SMS Templates

**Adam's 3 delivery messages verbatim** + v2 additions (service recovery routing, owner intake alerts, sales cadence).

## Delivery Templates (to client's customers)

### Message 1: Check-in

**Sent**: 2 hours after `jobCompletedAt`, within recipient's local quiet hours (8AM-9PM)

```
Hey {firstName}, this is {ownerFirstName} from {businessName}. Just checking in to make sure everything looks good with the work we did today.
```

Not a review ask. Conversation opener. If customer replies with a problem → routed to owner via service recovery flow (Msg 2 & 3 suppressed).

### Message 2: Review Request

**Sent**: 2 hours after Message 1, ONLY if `checkinNegative = false`

**Same link to everyone. No gating.**

```
Hi {firstName}, {ownerFirstName} here from {businessName}. Just wanted to say thanks again for the opportunity to work with you. If you have 30 seconds, would you mind sharing your experience in a quick Google review? {reviewLink} It helps other customers know they can trust us.
```

### Message 3: Nudge

**Sent**: 3 days after Message 2, ONLY if `linkClicked = false`

Adam: "Where a huge share of reviews come in. Do not skip."

```
Just a quick follow-up. If you haven't had a chance yet, we'd really appreciate a quick Google review. It helps others know they can trust us. {reviewLink}
```

---

## Service Recovery Alert (to owner)

**Sent**: When customer replies negatively to Msg 1.

**To**: `client.ownerPhone`

```
🚨 {customerFirstName} just replied to your check-in text:

"{replyText}"

Give them a call. Review request has been suppressed for this customer.
```

Owner handles it. Customer whose problem got fixed often becomes best reviewer — but we let owner make that decision, not the automation.

---

## Owner Intake Confirmation

**Sent**: After owner texts intake number and customer is added.

**To**: `owner intakePhone`

```
Got it — Sarah (415-555-1234) added. First text goes out at 3:47 PM.
```

## Owner Intake Parse Failure

**Sent**: When owner's text can't be parsed as name + phone.

```
Couldn't parse that — please send as: FirstName +1XXXXXXXXXX

Example: "Sarah Johnson +14155551234"
```

## Owner Intake Inactivity (7-day drip check-in)

**Sent**: When owner hasn't texted intake in 7 days.

```
Hey {ownerFirstName}, haven't heard from you in a week. Everything OK with Review Engine? Reply YES to snooze this alert, HELP for support.
```

---

## Sales Templates v5 — Fixed Wrong-Intent Framing (PRODUCTION DEFAULT)

**Canonical file**: [review-engine-sms-sequence.md](review-engine-sms-sequence.md)

**Why v5 rewrite**: v4 backfired on 460 live sends — 40% STOP rate, 33% "wrong intent" replies (roofers thought we wanted to hire them), **0 qualified prospects**. v5 removes customer-story ambiguity by leading with explicit service pitch.

### Quick Reference — 4 Touches

**Touch 1 (Day 1, 7:30-9:00 AM ET)**:
```
hey, Owner here. quick observation on {business_name}'s google reviews — the 3 businesses ranking above you in {city} have way more. i put together a specific fix. want it?
```

**Touch 2 (Day 2, hourly 9AM-8PM ET)**:
```
hey — still want that review-gap breakdown for {business_name}? 60 sec to look at.
```

**Touch 3 (Day 5)**:
```
last try, {first_name}. if getting 10+ new google reviews next month interests you, reply YES. otherwise closing your file.
```

**Touch 4 (Day 7)**:
```
alright, closing your file. giving the founding 5 spot to another {niche_singular}. good luck this year 🐊
```

---

## v4 Sales Templates (DEPRECATED — DO NOT SEND)

Kept for reference only. Live data: 3.3% reply rate, 40% STOP, 0% qualified. Do not resurrect without a full A/B test.

**Touch 1**:
```
I was searching for {niche_plural} in {city} last week and pulled up {business_name} to check reviews first...

Noticed the 3 businesses above you in the map pack all have something specific in common — and it's exactly why they're pulling your inbound.

Put together a quick breakdown. Can I send it over?
```

**Touch 2**:
```
Hey, still want me to send that breakdown for {business_name}? It's ready whenever.
```

**Touch 3**:
```
last try I promise, want me to drop the review gap breakdown for {business_name}? Takes 10 sec to glance at.
```

**Touch 4**:
```
alright, going with the next {niche_plural} in line for founding 5. cya later alligator 🐊
```

### v3 (Curiosity-Hook) Archived Below — Use Only If A/B Testing

Kept for reference. v4 (Voltaris-cloned) is production default.

---

## Sales Templates v3 (ARCHIVED) — Curiosity-Hook Cadence

**Rewritten 2026-07-10** based on:
- Voltaris websell live data (1,190 leads, 13.7% reply rate, VV-SMS-REPORT.md)
- AgentIQ A/B test (19.6% reply on $900K variant)
- 2026 research: Gosset "1M Cold SMS", Barber, Berman, Clay, Hormozi
- Insight: **Touch 3+ = 1 reply per 92 attempts (dead)** → cap sequence at 3 msgs

### Format Rules (Non-Negotiable)
1. All lowercase, casual (Voltaris positive data — 100% of positives casual)
2. First-person ("hey, this is Owner") — no signature
3. NO link in msg 1 (carriers throttle first-touch URLs)
4. NO "Reply STOP" on msg 1 to unconsented (implies you assumed consent)
5. Under 160 chars (single SMS)
6. **One personalization token** — not three (research: diminishing returns after 1)
7. **Curiosity gap**: reveal what → withhold why

### 4-Message Cadence (Days 0 / 2 / 5 / 9)

**Research-backed spacing** (Barber, Gosset). Each msg has a distinct role:
- **Msg 1**: Curiosity hook (no ask)
- **Msg 2**: Payload delivery + soft ask (Loom)
- **Msg 3**: Direct ask (demo) + value even if they don't buy
- **Msg 4**: Breakup with KEEP option (nurtures the "not now" for Q4)

### Universal Template Set (Works for All Niches)

**Design principle**: One template that works for roofers, HVAC, plumbers, electricians, dentists, med spas, landscapers — anyone with a Google Business Profile. Reason: simpler to send, easier to A/B test one variant at a time, no lead segmentation required.

**Only 2 personalization tokens**: `{firstName}` + `{businessName}`. Everything else is universal.

### Day 0 — Msg 1: Curiosity Hook (Tue/Wed/Thu 10-11:30AM local)

```
hey, this is Owner. pulled up {businessName} on google — noticed one specific thing on your profile costing you top-3 map pack. want me to send it?
```

**Why universal**: Every business with a Google profile can improve their map pack ranking. "One specific thing" creates curiosity gap. No trade-specific language. Under 160 chars.

### Day 2 — Msg 2: Payload + Loom Ask (Thu 10AM local)

```
hey, Owner again. quick answer to monday's msg: your competitors are using an sms system to auto-request google reviews after every job. that's the whole diff. 60-sec loom of my setup?
```

**Why universal**: "Competitors" works for any business. "After every job/appointment/service" implicit. Delivers the payload from Msg 1's curiosity gap.

### Day 5 — Msg 3: Demo Ask + Free Value (Mon 1:30PM local)

```
{firstName} — if 15 min this week works, i'll show you the exact system + your top 3 local competitors' google review strategy. even if you don't buy — the intel is yours. wed 10am or thu 2pm?
```

**Why universal**: "Local competitors" applies to every geographic business. "Intel is yours" = free value regardless of purchase. Two-option close.

### Day 9 — Msg 4: Breakup + KEEP Option (Wed 10AM local)

```
closing your file today, {firstName}. if google reviews aren't critical right now, all good. reply KEEP and i'll circle back in 90 days when i have real founding 5 client results to share.
```

**Why universal**: Google reviews matter for every local business. "Founding 5" implies exclusivity. `KEEP` catches Q4 nurture leads.

---

### Skip These Niches (Voltaris Live Data)

| Niche | Reason to Skip |
|---|---|
| Paving contractors | 0 positives in Voltaris cohort |
| Fencing contractors | 0 positives |
| Pool contractors | 0 positives |
| Real estate agents | Zillow/homes.com > Google for them |
| Restaurants | Yelp > Google |
| Title / escrow | Wrong buyer persona |

**Everything else is fair game** — trades, medical, professional services, personal care, auto, retail, etc.

---

## Personalization Script (30 sec per lead)

Before sending, look up ONE data point:
1. Google "[business name] [city] google reviews" → note review count
2. Google Maps → "[trade] near [address]" → note top 1 competitor + review count
3. Fill in:
   - `{firstName}` — from Close CRM
   - `{businessName}` — from Close CRM
   - `{trade}` — roofers / HVAC guys / plumbers / electricians
   - `{city}` — from Close CRM
   - `{zip}` — from Close CRM

**Do NOT** try more than 3 tokens. Research: diminishing returns after 1-2.

---

## Timing Matrix

| Send | Day/Time (recipient local) | Reason |
|---|---|---|
| Msg 1 | Tue/Wed/Thu 10:00-11:30 AM | Post-morning-run, pre-lunch |
| Msg 2 | +2 days (skip weekends) 10:00 AM | Same window |
| Msg 3 | +3 days (skip weekends) 1:30 PM | Post-lunch active phase |
| NEVER | Mon 7-9 AM | Inbox flood |
| NEVER | Fri 4-6 PM | Checked out |
| NEVER | Weekends | Family time, hostile in trades |

---

## Vertical Reply Rate Expectations

| Vertical | Expected Reply Rate | Notes |
|---|---|---|
| Junk removal | 30-44% | Voltaris hit 44% |
| Electricians | 15-25% | Voltaris hit 5.8%, but Review Engine value prop stronger |
| Roofers | 15-25% | Loss frame works |
| HVAC | 12-20% | Peer proof works |
| Plumbers | 10-18% | Observation withhold works |
| Landscapers | 8-15% | Peer proof, lower urgency |
| Dentists | 6-12% | More formal register recommended |
| Med spas | 8-15% | More formal register recommended |
| **AVOID** | Paving / fencing / pool | 0 positives (Voltaris) |

**Expected outcome at 100 leads to right verticals**: 20-30 replies, 6-10 positives, 2-4 Founding 5 clients.

---

## Referral Ask (post-first-review to client owners)

**Sent**: When client hits their 10th new review (guarantee milestone).

**To**: `client.ownerPhone`

```
🎉 You just hit 10 new reviews, {ownerFirstName} — guarantee is safe! Know any other {vertical}s who'd want this? Send them my way, you get 1 month free per closed referral: {referralLink}
```

---

## Compliance Notes

- On FIRST-EVER SMS to a phone: include "Reply STOP to opt out"
- Same review link to everyone (never route by sentiment)
- No incentive language ("get 10% off for a review" = FTC violation, $53,088/violation)
- No public URL shorteners (bit.ly, tinyurl blocked by carriers)
- Use `go.<domain>/r/<id>` — own-domain redirect
- Quiet hours 8AM-9PM in recipient's local time (n8n enforces via NPA area code + client TZ default)
- All templates single-segment GSM-7 where possible (no emojis in customer-facing SMS, no smart quotes)
