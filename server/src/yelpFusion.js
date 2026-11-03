const YELP_API = "https://api.yelp.com/v3";

async function yelpFetch(path) {
  const apiKey = process.env.YELP_FUSION_API_KEY;
  if (!apiKey) throw new Error("YELP_FUSION_API_KEY is not configured");
  const response = await fetch(`${YELP_API}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.description || `Yelp API returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function getYelpBusiness(businessId) {
  if (!/^[A-Za-z0-9_-]{3,200}$/.test(String(businessId || ""))) throw new Error("A valid Yelp business ID is required");
  return yelpFetch(`/businesses/${encodeURIComponent(businessId)}`);
}

export async function listYelpReviews(businessId) {
  if (!/^[A-Za-z0-9_-]{3,200}$/.test(String(businessId || ""))) throw new Error("A valid Yelp business ID is required");
  return yelpFetch(`/businesses/${encodeURIComponent(businessId)}/reviews?limit=20&sort_by=newest`);
}
