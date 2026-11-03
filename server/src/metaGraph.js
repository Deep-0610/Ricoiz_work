const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v26.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function metaOAuthConfig() {
  const { META_APP_ID, META_APP_SECRET, META_REDIRECT_URI } = process.env;
  if (!META_APP_ID || !META_APP_SECRET || !META_REDIRECT_URI) throw new Error("Meta OAuth environment variables are not configured");
  return { appId: META_APP_ID, appSecret: META_APP_SECRET, redirectUri: META_REDIRECT_URI };
}

export function metaAuthorizationUrl(state) {
  const config = metaOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
    scope: "pages_show_list,pages_read_engagement,pages_read_user_content"
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}`;
}

async function graphFetch(path, accessToken) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const error = new Error(payload.error?.message || `Meta Graph API returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function exchangeMetaCode(code) {
  const config = metaOAuthConfig();
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.search = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code
  }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error?.message || "Meta OAuth token exchange failed");
  return payload;
}

export async function listManagedFacebookPages(userAccessToken) {
  return graphFetch("/me/accounts?fields=id,name,access_token,tasks&limit=100", userAccessToken);
}

export async function getFacebookPage(pageId, pageAccessToken) {
  return graphFetch(`/${encodeURIComponent(pageId)}?fields=id,name,link,category`, pageAccessToken);
}
