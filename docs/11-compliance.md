# 11. Compliance

**Non-negotiable. v2 hardened.**

## A2P 10DLC

**ISV framing (critical for approval)**:

- Register Standard Brand: $4.50 one-time + $41.50 vetting = **~$46**
- Aegis Enhanced Vetting: **+$95 one-time** (unlocks 200K/day T-Mobile cap)
- Register Campaign as **Standard - Mixed**, use case worded as:

> "Review request platform sending on behalf of local business customers. Each end-business is a client of the platform with signed agreement. Messages are sent to consumers who transacted with the end-business. Consent captured by end-business via signed service agreement or checkbox at time of transaction. Platform enforces opt-out globally across all end-businesses."

- Campaign fee: $15 one-time vetting + $10/mo

**Timeline**: 5-15 biz days. Submit Day 1.

## TCPA (Federal)

- **Quiet hours**: 8 AM to 9 PM in **recipient's local time**
  - Default: client's timezone (from onboarding)
  - Override: NPA area code lookup for per-customer TZ
  - n8n enforces via `Gate + build SMS` code node on every workflow

- **Consent basis**: PEWC (Prior Express Written Consent) — client attests via **structured attestation** (not checkbox)

- **STOP handling**: Twilio auto-honors 8 keywords + our regex catches natural language ("please stop", "unsubscribe me")

- **Global opt-out**: Convex `optOuts` table — STOP applies across ALL clients (designed for FCC's Jan 2027 revoke-all rule)

- **Fines**: $500-$1,500 per message

## Structured Consent Attestation

At CSV upload during onboarding — **not a checkbox**:

```
1. Method of consent obtained:
   ○ Signed service agreement with SMS clause
   ○ Checkbox at point of transaction
   ○ Verbal consent with staff notation
   ○ Other: ___________

2. Date range of transactions represented:
   From: __/__/____ To: __/__/____

3. I confirm (all required):
   ☐ All customers transacted within the last 12 months
   ☐ All customers provided phone voluntarily
   ☐ I have express written consent for SMS
   ☐ Consent basis is PEWC (not EBR)
   ☐ I indemnify Review Engine against TCPA claims from this list

Signed: _____________  Date: __/__/____  IP: (auto-captured)
```

**Retain 7 years** (beyond statute of limitations).

## Per-Intake Attestation (Ongoing Owner Texts)

**ToS clause** in signup agreement:

> "By texting a customer name and phone number to your dedicated intake line, you attest that (a) you have PEWC consent from that individual to send them SMS communications, (b) the transaction occurred within the past 12 months, and (c) you take full responsibility for TCPA compliance regarding that individual."

Captured once at signup. Every intake message is legally covered by this attestation.

## Google Review Policy

- ✅ **Same link to everyone** — no gating (service recovery suppresses the *ask*, never filters *who can review*)
- ✅ No incentives ("get 10% off for a review") — FTC violation ($53,088/violation)
- ✅ Ask everyone
- ✅ Reactivation pace ≤50/day per client (natural growth, avoids Google spam detection)

## STOP Handling

**Twilio/Close auto-honored keywords**: STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, REVOKE, OPTOUT

**Our regex extension** (catches natural language):
```
/\b(please stop|unsubscribe me|take me off|opt out|no more|remove me|don't text)\b/i
```

**Global opt-out**: any STOP → added to Convex `optOuts` → suppressed across all clients forever.

**Silent suppression**: no confirmation SMS sent (Twilio handles carrier-required STOP acknowledgment).

## Reactivation Compliance

- ≤50/day per client (Adam's "2-3 every 20 min" pace)
- ≤12-month lookback on customer transactions (older = higher TCPA risk, number reassignment)
- No promotional content in SMS
- All reactivation SMS include client's business name

## SMS Content Rules

- Include business name in every SMS
- On first-ever SMS to a phone: "Reply STOP to opt out"
- No public URL shorteners (bit.ly, tinyurl blocked by carriers)
- Use own-domain redirect: `go.<domain>/r/{customerId}`
- Single-segment GSM-7 (no emojis, no smart quotes)
- Twilio Smart Encoding enabled on Messaging Service (prevents accidental UCS-2)

## Insurance

At $5K MRR: E&O with TCPA coverage.
- Providers: Munich Re Specialty, DOXA, CRC Group
- Coverage: $1M
- Cost: ~$150-300/mo
- **Buy sooner if any client list exceeds 1K numbers** (larger blast radius on a single bad list)

## Legal Entity

**Register new LLC for asset isolation.**
- Delaware or home state
- Cost: $300 filing + $150/yr
- Do before Stripe onboarding

## Founding 5 Testimonial Rights Release

Separate 1-page signed agreement:
- Grants Review Engine LLC perpetual right to use client's business name, GBP screenshots, revenue improvement figures, and video testimonial in marketing
- Signed at Founding 5 onboarding
- **Contingent**: setup fee waiver revoked if testimonial not delivered within 60 days of first review

## Kill Switch

If Slack alert fires:
- >2% opt-out rate on any single campaign → pause that client's workflows, investigate
- >5% aggregate opt-out rate → pause ALL workflows, deep review of consent basis
- Any TCPA demand letter received → immediate legal review, halt marketing to that state
