# Google Business Profile integration

## What is implemented

- OAuth 2.0 authorization-code flow with offline access and signed, short-lived state.
- AES-256-GCM encryption for access and refresh tokens at rest in MongoDB.
- Automatic access-token refresh.
- Google account and location discovery.
- Review synchronization into the workspace's MongoDB reviews.
- Publishing an approved reply to the corresponding Google review.
- Integration status derived from the saved connection rather than a hard-coded demo value.

## Google Cloud setup (required before live use)

1. Use a Google account that manages a verified Business Profile.
2. Create/select a Google Cloud project and configure the OAuth consent screen.
3. Request Business Profile API access for that project. Google currently requires the applicant to manage a verified, active profile for 60+ days and have a website representing the business on that profile. API access is not automatic.
4. After approval, enable the required Business Profile APIs in the project.
5. Create an OAuth Client ID of type **Web application**.
6. Add this exact authorized redirect URI (or your deployed API callback):
   `http://localhost:5000/api/integrations/google-business-profile/callback`
7. Add the credentials to `server/.env` (never commit this file):
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/integrations/google-business-profile/callback
   GOOGLE_TOKEN_ENCRYPTION_KEY=64_hex_characters
   ```
8. Generate the encryption key with:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
9. Restart the API.

## OAuth and API flow

All routes below use the existing authenticated session except the OAuth callback.

1. `GET /api/integrations/google-business-profile/connect` returns an `authorizationUrl`. Open it in the browser.
2. The user grants access to the Google account that manages the business.
3. Google redirects to the callback. Tokens are encrypted before persistence.
4. `GET /api/integrations/google-business-profile/accounts` lists accessible GBP accounts.
5. `GET /api/integrations/google-business-profile/locations?account=accounts/ACCOUNT_ID` lists locations.
6. Select a verified location with `POST /api/integrations/google-business-profile/location` and JSON:
   ```json
   { "accountName": "accounts/ACCOUNT_ID", "locationName": "accounts/ACCOUNT_ID/locations/LOCATION_ID", "locationTitle": "Business name" }
   ```
7. `POST /api/integrations/google-business-profile/sync-reviews` imports reviews (up to 10 pages per request).
8. After approval, `PUT /api/integrations/google-business-profile/reviews/:reviewId/reply` with JSON `{ "response": "Thank you for your feedback." }` publishes a reply to Google.

## Important constraints

- API access must be approved by Google for the Cloud project. OAuth credentials alone do not grant GBP API access.
- The connected Google user can only access profiles they already manage; OAuth does not grant access to arbitrary businesses.
- Review list/reply methods require a verified location.
- Google does not provide a sandbox for these API calls. Use a real authorized test Business Profile and take care: publishing a reply changes public data.
- The reply endpoint publishes immediately. The frontend should only call it after the user explicitly approves the response.
- A Google account manager invite may have a seven-day permission cooldown in some partner workflows; verify current Google account permissions before enabling automated replies.
