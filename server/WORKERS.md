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
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `TWILIO_WEBHOOK_BASE_URL` set to the public API origin (used to validate Twilio signatures)
- `TWILIO_STATUS_CALLBACK_URL` set to `https://YOUR_API_HOST/api/webhooks/twilio/status`
- Configure Twilio's inbound message webhook as `https://YOUR_API_HOST/api/webhooks/twilio/inbound`
- Set each workspace's `smsFromNumber` to its Twilio inbound-capable E.164 number so inbound messages can be routed to the correct tenant
- Set `SMS_DELIVERY_ENABLED=true` only after consent records, Twilio webhooks, and legal/compliance review are complete

## Review sync

The worker discovers connected Google Business Profile workspaces every four hours and queues a tenant-scoped sync job. Each review is upserted by `clientId + platform + externalId`, so retries do not create duplicate reviews. A missing Google connection/location is a safe skip.

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
