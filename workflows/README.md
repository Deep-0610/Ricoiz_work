# Review Engine — n8n Workflows

16 sanitized n8n workflows, 197 nodes. The full automation backend of a Google Reviews SMS SaaS for local businesses: both the **client-side delivery engine** (getting reviews for a paying client) and the **sales pipeline** (acquiring new clients).

Every workflow is sanitized (API keys, tokens, Convex deployment, n8n host, app host, owner identity, and phone numbers replaced with placeholders). Logic, node wiring, and code-node JavaScript are intact and importable.

## Client-side delivery (01–08)

| File | Workflow | Nodes | Trigger | Status | What it does |
|---|---|---|---|---|---|
| 01 | Intake — Owner Text → Customer | 16 | webhook | active | Owner texts `Name +1XXXXXXXXXX`; regex → E.164, client lookup, global opt-out check, enroll, honest branch-per-outcome confirmation SMS |
| 02 | Check-in SMS (Msg 1) | 9 | cron 20 min | active | Recipient-local quiet-hours guard (NPA→timezone), first check-in with CTIA STOP disclosure, batched + throttled |
| 03 | Review Request + Nudge (Msg 2+3) | 9 | cron hourly | active | Msg 2 (2h) + Msg 3 (72h no-click); service-recovery gate, sticky sender, halts if the customer already replied |
| 04 | Reactivation Trickler | 6 | cron 12 min | active | Seeds ≤3 past customers per tick into the drip so sends stay ≤50/day/client |
| 05 | Inbound Reply Router | 14 | webhook | active | STOP → opt-out + CTIA confirm, HELP → compliance reply, SNOOZE → 7-day mute, else Claude sentiment → route negatives to owner |
| 06 | Intake Activity Check-in | 9 | cron daily | active | Flags clients who sent no jobs for 7 days (earliest churn signal), send-success guarded |
| 07 | AI Auto-Response (GBP + Claude) | 11 | cron 15 min | built | Polls Google Business Profile reviews, Claude drafts owner-voice reply; 4–5★ auto-post, 1–3★ Slack approval (60-min SLA) |
| 08 | Weekly Competitor Report | 9 | cron Mon | built | Client vs top-3 local competitors via SerpAPI + GBP; Convex snapshot, emailed via Postmark |

## Sales pipeline / client acquisition (09–16)

| File | Workflow | Nodes | Trigger | Status | What it does |
|---|---|---|---|---|---|
| 09 | Pre-Demo Audit Generator | 7 | webhook | built | SerpAPI local pack → Claude 1-page audit → PDFMonkey PDF → attached to the Close lead |
| 10 | Demo Send — Audit Link | 15 | webhook | active | Close field flip → builds audit-link SMS, dual-account sticky-sender routing, self-resets the trigger flag |
| 11 | Audit 1hr Post-View Nudge | 2 | cron 10 min | active | Thin cron shim → app endpoint for the "viewed audit, no reply" nudge |
| 12 | Sales Daily Ingest + Touch 1 | 29 | cron (4x AM) | active | Dedup + TCPA gate + sender assignment, opener SMS with A/B opener variants and a deferred second-touch queue |
| 13 | V2 Second-Text Drain | 8 | cron 2 min | active | Drains the A/B V2 queue SL-01 fills, throttled per-send worker |
| 14 | Sales Followups (Touch 2–4) | 25 | cron hourly | active | Day-gap cadence with status skip-list, inbound-reply suppression, sticky sender, dry-run switch |
| 15 | Delivery Status Cleanup | 12 | cron 15 min | inactive | SMS-deliverability polling as a mobile/landline classifier, prunes un-textable numbers |
| 16 | AI Reply Classifier + Auto-Reply | 16 | webhook | inactive | Two-stage Claude (Sonnet 4.5) classify→generate with STOP handling + banned-word content filter before send |

## Compliance patterns worth studying
- **Recipient-local quiet hours** (TCPA) via NPA area-code → timezone lookup, enforced before every send.
- **Service recovery, not review gating** — a negative check-in suppresses the *ask* but never filters *who can review* (Google-policy safe).
- **STOP/HELP/SNOOZE** opt-out handling across every campaign.
- **Human-approval SLA** for 1–3★ AI responses (60-min Slack gate, auto-post fallback).
- **Content-safety filter** on AI sales replies (bans guarantee/free/AI/bot language) before any outbound.
- **Sticky-sender continuity** and dual-account routing so a lead always hears from the same number.

## Tech stack
n8n · Convex (HTTP actions) · Close CRM (SMS) · Claude (Haiku 4.5 + Sonnet 4.5) via OpenRouter · Google Business Profile API · SerpAPI · Postmark · PDFMonkey · Slack

## Setup
Import a JSON into n8n, replace the `YOUR_*` placeholders, add your own credentials for Close CRM / OpenRouter / Slack / Google, and point the Convex HTTP endpoints at your backend (schemas in `../convex`).
