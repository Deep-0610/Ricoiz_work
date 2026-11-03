import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { getYelpBusiness, listYelpReviews } from "../src/yelpFusion.js";
import { metaAuthorizationUrl } from "../src/metaGraph.js";

describe("Yelp Fusion integration", () => {
  afterEach(() => { delete process.env.YELP_FUSION_API_KEY; jest.restoreAllMocks(); });

  test("requires a configured API key", async () => {
    delete process.env.YELP_FUSION_API_KEY;
    await expect(getYelpBusiness("business-123")).rejects.toThrow("YELP_FUSION_API_KEY is not configured");
  });

  test("fetches business details with Bearer auth", async () => {
    process.env.YELP_FUSION_API_KEY = "test-yelp-key";
    const mock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, json: async () => ({ id: "business-123", name: "Cafe One", rating: 4.5 })
    });
    const business = await getYelpBusiness("business-123");
    expect(business.name).toBe("Cafe One");
    expect(mock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-yelp-key");
  });

  test("uses Yelp's supported three-review sample limit", async () => {
    process.env.YELP_FUSION_API_KEY = "test-yelp-key";
    const mock = jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ reviews: [] }) });
    await listYelpReviews("business-123");
    expect(String(mock.mock.calls[0][0])).toContain("limit=3");
  });

  test("rejects malformed business identifiers before network access", async () => {
    process.env.YELP_FUSION_API_KEY = "test-yelp-key";
    const mock = jest.spyOn(globalThis, "fetch");
    await expect(getYelpBusiness("../other-tenant")).rejects.toThrow("valid Yelp business ID");
    expect(mock).not.toHaveBeenCalled();
  });
});

describe("Meta Pages OAuth", () => {
  test("builds a version-pinned authorization URL with required Page scopes", () => {
    process.env.META_APP_ID = "test-app";
    process.env.META_APP_SECRET = "test-secret";
    process.env.META_REDIRECT_URI = "https://api.example.test/api/integrations/meta-facebook/callback";
    const url = new URL(metaAuthorizationUrl("signed-state"));
    expect(url.hostname).toBe("www.facebook.com");
    expect(url.searchParams.get("client_id")).toBe("test-app");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toContain("pages_show_list");
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    delete process.env.META_REDIRECT_URI;
  });

  test("fails closed when Meta OAuth configuration is missing", () => {
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    delete process.env.META_REDIRECT_URI;
    expect(() => metaAuthorizationUrl("state")).toThrow("Meta OAuth environment variables are not configured");
  });
});
