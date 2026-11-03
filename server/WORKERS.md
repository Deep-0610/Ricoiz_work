# Ricoiz background workers

## Runtime services

Run the API and the worker process as separate Render services. Both connect to the same MongoDB database. The worker additionally requires Redis.

Worker start command:

```sh
npm start --prefix server:workers
```

From the `server` directory, use:

```sh
npm run workers
```

Required worker environment:

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET` (API runtime)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY` for Google review sync
- `YELP_FUSION_API_KEY` for Yelp public Fusion API access
- `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, and optional `META_GRAPH_API_VERSION` (defaults to `v26.0`) for Meta Page authorization
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `TWILIO_WEBHOOK_BASE_URL` set to the public API origin (used to validate Twilio signatures)
- `TWILIO_STATUS_CALLBACK_URL` set to `https://YOUR_API_HOST/api/webhooks/twilio/status`
- Configure Twilio's inbound message webhook as `https://YOUR_API_HOST/api/webhooks/twilio/inbound`
- Set each workspace's `smsFromNumber` to its Twilio inbound-capable E.164 number so inbound messages can be routed to the correct tenant
- Set `SMS_DELIVERY_ENABLED=true` only after consent records, Twilio webhooks, and legal/compliance review are complete

## Review sync

The worker discovers connected Google Business Profile and Yelp workspaces every four hours and queues tenant-scoped sync jobs. Each review is upserted by `clientId + platform + externalId`, so retries do not create duplicate reviews. A missing connection or provider identifier is a safe skip.

### Yelp Fusion
Connect a Yelp business with `POST /api/integrations/yelp/connect` and body `{"businessId":"<Yelp business ID>"}`. The API verifies the business with Yelp before saving the ID to that tenant. Manual sync: `POST /api/integrations/yelp/sync-reviews`. The public Fusion reviews endpoint exposes only a small recent sample (up to three reviews), not a full review archive or reply capability. Full owner review management and responding require Yelp's separate partner/Respond-to-Reviews access and approval. Do not describe the public Fusion connector as full review sync.

### Meta / Facebook Pages
Start authorization at `GET /api/integrations/meta-facebook/connect`, then choose a managed Page using `GET /api/integrations/meta-facebook/pages` and `POST /api/integrations/meta-facebook/page` with `{"pageId":"<Page ID>"}`. Page tokens are encrypted at rest. The app needs Meta app configuration, review/approval for required Page permissions, and a Page administered by the authorizing user. Meta removed Page ratings/recommendations endpoints in Graph API v22.0+, so the connector can securely authorize and identify a Page but cannot ingest Facebook Page reviews via the current supported Graph API. The sync endpoint intentionally returns `501 META_PAGE_REVIEWS_UNAVAILABLE` instead of fabricating review data. Re-check Meta's official changelog before revisiting this limitation.

## SMS delivery safety

SMS jobs re-read the customer using both `_id` and `clientId` immediately before delivery. Delivery requires `consentStatus=granted`, a non-empty `consentAt`, no `optedOutAt`, a valid E.164 number, a workspace with `status=active`, and local time between 09:00 and 19:59. Invalid timezones fail closed. The queue does not send to customers with unknown consent.

SMS sending is hard-disabled unless `SMS_DELIVERY_ENABLED=true`; Twilio credentials alone cannot trigger delivery. Campaign dispatch queues only customers with recorded consent, and the worker re-checks consent, opt-out state, workspace status, phone format, and local sending window immediately before sending. Campaign queue jobs have deterministic IDs to prevent duplicate enqueues on repeat requests.

Signed Twilio inbound webhooks process STOP-family keywords and persist opt-outs. START does not silently restore consent; fresh consent must be recorded through the authenticated customer consent endpoint. HELP receives a basic response. Signed status callbacks update the corresponding outbound SMS activity. Set `TWILIO_WEBHOOK_BASE_URL` to the exact public API origin and configure both Twilio webhook URLs. Do not enable SMS until the account, sender registration, consent language, local telecom rules (including applicable India TRAI/DLT requirements), and webhook configuration have been reviewed.

## Local verification

```sh
npm install
npm test
npm run check
npm run workers
```

## Stripe Billing

Create Starter, Growth, and Scale products and recurring monthly/yearly prices in Stripe Dashboard. Copy each Price ID into the matching `STRIPE_PRICE_*` environment variable. Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `FRONTEND_URL` on the API service. Never expose the secret or webhook signing key to the browser.

Authenticated billing routes:
- `GET /api/billing/plans` returns configured plans (it does not expose Price IDs).
- `POST /api/billing/checkout` accepts `{"plan":"starter|growth|scale","interval":"month|year"}` and returns a hosted Checkout URL.
- `POST /api/billing/portal` returns a Stripe Customer Portal URL.
- `GET /api/billing/status` returns the tenant's persisted subscription state and usage.

Configure a Stripe webhook at `https://YOUR_API_HOST/api/webhooks/stripe` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. The endpoint verifies the raw request body using Stripe's signature, and event IDs are stored for idempotent processing. Subscription access is granted from verified webhook state, not the Checkout redirect. Customer quotas and monthly SMS quotas are enforced server-side. Free workspaces have a 100-customer cap and no paid SMS allowance; paid plans use configured plan limits.

Billing is disabled until real Stripe keys and recurring Price IDs are configured. Use Stripe test mode and the Stripe CLI before enabling live billing. Do not mark an account paid from a browser redirect.
