# Convex Backend — Review Engine

Deployed to: `YOUR_CONVEX_DEPLOYMENT`

## Files

| File | Purpose |
|---|---|
| `schema.ts` | 10 tables |
| `http.ts` | 30+ HTTP endpoints (n8n workflows call these) |
| `reviewClients.ts` | Client CRUD + queries |
| `reviewCustomers.ts` | Drip state machine + intake |
| `reviewResponses.ts` | AI response tracking + SLA fallback |
| `reactivation.ts` | Trickler + ≤50/day cap |
| `reports.ts` | Weekly competitor snapshots |
| `monitoring.ts` | Owner intake activity + snooze |
| `referrals.ts` | Referral code tracking |
| `optOuts.ts` | Global opt-out + STOP detection |
| `stripe.ts` | Webhook handler |
| `lib/npaTz.ts` | Area code → timezone (~200 US area codes) |
| `lib/quietHours.ts` | Federal + state TCPA windows |
| `lib/senderRotation.ts` | Deterministic sender hashing |
| `lib/templates.ts` | SMS templates + AI fallback + content filter |

## Deploy

```bash
cd convex/
npx convex dev              # dev mode with hot reload
npx convex deploy --prod    # deploy to prod
```

## Auth

All endpoints (except `/reviews/click/:id` and `/reviews/stripe-webhook`) require:

```
Authorization: Bearer <CONVEX_AUTH_TOKEN>
```

Set in n8n as `httpHeaderAuth` credential named `Convex (review-engine)`.

## Environment Variables

See `.env.example`.
