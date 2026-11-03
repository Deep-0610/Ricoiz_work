import { test, expect } from "@playwright/test";

const review = {
  _id: "review-e2e-1",
  author: "Alex Example",
  platform: "google",
  rating: 5,
  text: "Great service and a very helpful team.",
  responseStatus: "unanswered",
  reviewedAt: "2026-10-01T10:00:00.000Z",
};

test("business user can sign in and reach the workspace", async ({ page }) => {
  await page.route("**/api/auth/login", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "set-cookie": "ricoiz_session=e2e-session; Path=/; HttpOnly; SameSite=Lax" },
    body: JSON.stringify({ success: true, user: { email: "owner@example.test" } }),
  }));
  await page.route("**/api/dashboard/overview", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ metrics: { newReviews: 1, averageRating: 5, customers: 2, smsRequests: 0, campaigns: 0, repliesToReview: 0 } }),
  }));
  await page.route("**/api/integrations/status", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ integrations: [{ key: "google-business-profile", status: "connected" }] }),
  }));

  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@example.test");
  await page.getByLabel("Password").fill("SecurePass123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /business pulse/i })).toBeVisible();
  await expect(page.getByText("Google", { exact: true }).first()).toBeVisible();
});

test("review inbox filters reviews and publishes a Google reply", async ({ page }) => {
  const requestedUrls = [];
  let publishedBody;
  await page.route("**/api/reviews**", async route => {
    requestedUrls.push(route.request().url());
    const url = new URL(route.request().url());
    const isUnanswered = url.searchParams.get("responseStatus") === "unanswered";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: isUnanswered ? [review] : [],
        page: 1,
        total: isUnanswered ? 1 : 0,
        hasMore: false,
        platformCounts: { google: 1, yelp: 0, facebook: 0 },
      }),
    });
  });
  await page.route("**/api/integrations/google-business-profile/reviews/review-e2e-1/reply", async route => {
    publishedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.goto("/dashboard/reviews");
  await expect(page.getByText("Alex Example")).toBeVisible();

  await page.getByLabel("Filter reply status").selectOption("unanswered");
  await expect.poll(() => requestedUrls.some(url => new URL(url).searchParams.get("responseStatus") === "unanswered")).toBeTruthy();

  await page.getByLabel("Google reply").fill("Thank you for sharing your feedback!");
  await page.getByRole("button", { name: "Publish Google reply" }).click();

  await expect(page.getByRole("status")).toContainText("Reply published to Google Business Profile.");
  expect(publishedBody).toEqual({ response: "Thank you for sharing your feedback!" });
});
