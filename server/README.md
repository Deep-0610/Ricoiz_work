# Ricoiz MongoDB API

This branch adds a MongoDB-backed Express API for Ricoiz and switches the Next.js onboarding and dashboard to it. MongoDB collections replace the primary app data layer for the new API: users, clients/workspaces, customers, reviews, campaigns, SMS activity, and onboarding submissions.

## Run locally

1. Create a MongoDB Atlas cluster and a database user scoped to a dedicated Ricoiz database.
2. Copy `server/.env.example` to `server/.env`.
3. Set `MONGODB_URI`, `JWT_SECRET` (32+ random characters), and a private `DEMO_PASSWORD`. Never commit the real env file.
4. Run `cd server && npm install && npm run dev`.
5. Create `landing/.env.local` containing `NEXT_PUBLIC_API_URL=http://localhost:5000`.
6. Run `cd landing && npm install && npm run dev`.
7. Visit `http://localhost:3000/login`. The first API boot seeds a synthetic demo workspace if `DEMO_MODE=true`.

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | API and MongoDB health |
| POST | `/api/auth/login` | Create HttpOnly session |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/logout` | Clear session |
| POST | `/api/onboarding` | Validated public onboarding intake |
| GET | `/api/dashboard/overview` | Workspace metrics |
| GET/POST | `/api/customers` | List/create customers |
| PATCH/DELETE | `/api/customers/:id` | Update/delete customer |
| GET | `/api/reviews` | List reviews |
| PATCH | `/api/reviews/:id/response` | Save a draft/approved reply |
| GET/POST | `/api/campaigns` | List/create campaigns |
| PATCH | `/api/campaigns/:id/status` | Update campaign state |
| GET | `/api/integrations/status` | Provider connection status |
| GET/PATCH | `/api/settings/intake-phone` | Read or assign the workspace Close inbound number |
| GET | `/api/automation/reviews/client-by-intake-phone` | n8n: resolve workspace by intake number (API-key protected) |
| GET | `/api/automation/reviews/opt-out-check` | n8n: global opt-out check (API-key protected) |
| POST | `/api/automation/reviews/customer-add-via-text` | n8n: save an owner-submitted customer (API-key protected; consent pending) |

## Demo-only guardrails

- `DEMO_MODE=true` by default.
- Seed data is synthetic and isolated in a demo workspace.
- Campaign status changes do not dispatch SMS or email.
- Google Business Profile, Close CRM, n8n, Stripe, and AI provider connections remain disconnected/demo-only until their own OAuth/API credentials and webhooks are configured and tested.
- Do not load real customer lists or send real messages in this demo environment.

## Remaining production work

This is a migration foundation, not a completed production cutover. The legacy `convex/` code and existing n8n workflows are retained so the current setup is not destructively removed. Before removing Convex, migrate and verify every workflow endpoint and scheduled job, backfill any data that must be retained, and run integration tests.

Still required: secure CSV upload/parsing, per-workspace admin provisioning, password reset/invitation flow, Google OAuth and review sync, Close CRM integration, n8n webhook signing/retries, Stripe checkout and signature-verified webhooks, SMS consent/STOP suppression, audit logs, backups, monitoring, and automated tests.


## n8n customer-intake integration

The first workflow is `workflows/01-intake-owner-text-to-customer.json`. It calls the Express API rather than Convex.

1. Deploy this API separately from the Next.js landing service. In Render, create a Node web service from this repository with root directory `server`, build command `npm ci`, and start command `npm start`.
2. Set these secrets in the backend service environment: `MONGODB_URI`, `JWT_SECRET` (32+ random characters), and `RICOIZ_N8N_API_KEY` (32+ random characters). Set `NODE_ENV=production`, `DEMO_MODE=false`, and `CLIENT_ORIGIN` to the deployed frontend origin. Never put secret values in Git or chat.
3. Configure the Close inbound SMS webhook to call the n8n webhook path `wf-rev-intake`.
4. In the authenticated workspace, set the Close inbound phone number using `PATCH /api/settings/intake-phone` with `{ "intakePhone": "+14155550123" }`.
5. Import the workflow JSON into n8n. For the three Ricoiz HTTP nodes, configure the API base URL and a Header Auth credential with header `x-ricoiz-automation-key` and the same secret as `RICOIZ_N8N_API_KEY`.
6. Test with synthetic data first. The intake endpoint records customers with `consentStatus=unknown`; it does not enroll them for SMS. Do not enable any outbound SMS workflow until opt-in evidence and STOP suppression are implemented and tested.

The n8n Cloud free trial does not expose the public REST API; manual JSON import in the editor is sufficient for this phase. Workflow activation and API-driven management are not required for the initial test.
