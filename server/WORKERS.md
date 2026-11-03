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
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` only when SMS delivery is intentionally enabled; also set `SMS_DELIVERY_ENABLED=true` to permit sends

## Review sync

The worker discovers connected Google Business Profile workspaces every four hours and queues a tenant-scoped sync job. Each review is upserted by `clientId + platform + externalId`, so retries do not create duplicate reviews. A missing Google connection/location is a safe skip.

## SMS delivery safety

SMS jobs re-read the customer using both `_id` and `clientId` immediately before delivery. Delivery requires `consentStatus=granted`, a non-empty `consentAt`, no `optedOutAt`, a valid E.164 number, a workspace with `status=active`, and local time between 09:00 and 19:59. Invalid timezones fail closed. The queue does not send to customers with unknown consent.

SMS sending is additionally hard-disabled unless `SMS_DELIVERY_ENABLED=true`; Twilio credentials alone cannot trigger delivery. No campaign route is wired to dispatch in this phase. This is intentional: Phase 3 adds campaign orchestration and opt-out webhooks. Do not enable Twilio credentials until consent capture, STOP handling and provider callbacks are operational and legally reviewed.

## Local verification

```sh
npm install
npm test
npm run check
npm run workers
```
