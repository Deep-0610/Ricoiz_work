import crypto from "node:crypto";

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/business.manage";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ACCOUNT_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const LOCATION_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_API = "https://mybusiness.googleapis.com/v4";

function encryptionKey() {
  const value = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be 64 hexadecimal characters");
  return Buffer.from(value, "hex");
}
export function encryptToken(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64url")).join(".");
}
export function decryptToken(value) {
  if (!value) return "";
  const [iv, tag, encrypted] = value.split(".").map(part => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
export function googleOAuthConfig() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) throw new Error("Google OAuth environment variables are not configured");
  encryptionKey();
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: GOOGLE_REDIRECT_URI };
}
export function googleAuthorizationUrl(state) {
  const config = googleOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: `openid email profile ${GOOGLE_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
async function googleFetch(url, accessToken, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${accessToken}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || payload.error_description || `Google API returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}
export async function exchangeGoogleCode(code) {
  const config = googleOAuthConfig();
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description || payload.error || "Google OAuth token exchange failed");
  return payload;
}
export async function refreshGoogleToken(connection, save) {
  const refreshToken = decryptToken(connection.refreshTokenEncrypted);
  if (!refreshToken) throw new Error("Google refresh token is missing; reconnect the account");
  const config = googleOAuthConfig();
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ refresh_token: refreshToken, client_id: config.clientId, client_secret: config.clientSecret, grant_type: "refresh_token" }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description || payload.error || "Google token refresh failed");
  connection.accessTokenEncrypted = encryptToken(payload.access_token);
  connection.tokenExpiresAt = new Date(Date.now() + (payload.expires_in || 3600) * 1000);
  await save(connection);
  return payload.access_token;
}
export async function googleAccessToken(connection, save) {
  if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() > Date.now() + 60000) return decryptToken(connection.accessTokenEncrypted);
  return refreshGoogleToken(connection, save);
}
export async function googleUserInfo(accessToken) {
  return googleFetch("https://www.googleapis.com/oauth2/v2/userinfo", accessToken);
}
export async function listGoogleAccounts(accessToken) {
  return googleFetch(`${ACCOUNT_API}/accounts`, accessToken);
}
export async function listGoogleLocations(accessToken, accountName) {
  const url = new URL(`${LOCATION_API}/${accountName}/locations`);
  url.searchParams.set("readMask", "name,title,storefrontAddress,metadata");
  url.searchParams.set("pageSize", "100");
  return googleFetch(url.toString(), accessToken);
}
export async function listGoogleReviews(accessToken, locationName, pageToken) {
  const url = new URL(`${REVIEWS_API}/${locationName}/reviews`);
  url.searchParams.set("pageSize", "50");
  url.searchParams.set("orderBy", "updateTime desc");
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  return googleFetch(url.toString(), accessToken);
}
export async function publishGoogleReviewReply(accessToken, reviewResourceName, comment) {
  return googleFetch(`${REVIEWS_API}/${reviewResourceName}/reply`, accessToken, { method: "PUT", body: JSON.stringify({ comment }) });
}
