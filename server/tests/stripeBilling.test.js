import { afterEach, describe, expect, test } from "@jest/globals";
import { findConfiguredPrice, getPlanCatalog, getPlanLimits, getPlanPrice } from "../src/stripeBilling.js";

const original = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) if (key.startsWith("STRIPE_PRICE_")) delete process.env[key];
  for (const [key, value] of Object.entries(original)) if (key.startsWith("STRIPE_PRICE_")) process.env[key] = value;
});

describe("Stripe plan configuration", () => {
  test("only resolves price IDs explicitly configured by the server", () => {
    process.env.STRIPE_PRICE_STARTER_MONTHLY = "price_starter_monthly_test";
    expect(getPlanPrice("starter", "month")).toMatchObject({ priceId: "price_starter_monthly_test", planKey: "starter", interval: "month" });
    expect(getPlanPrice("growth", "month")).toBeNull();
    expect(findConfiguredPrice("price_not_configured")).toBeNull();
  });

  test("maps a configured Stripe price to its server-owned plan and limits", () => {
    process.env.STRIPE_PRICE_GROWTH_YEARLY = "price_growth_yearly_test";
    expect(findConfiguredPrice("price_growth_yearly_test")).toMatchObject({ key: "growth", interval: "year", limits: { customers: 2500, monthlySms: 5000, locations: 3 } });
  });

  test("does not expose Stripe Price IDs in the public plan catalog", () => {
    process.env.STRIPE_PRICE_SCALE_MONTHLY = "price_scale_private";
    const catalog = getPlanCatalog();
    expect(JSON.stringify(catalog)).not.toContain("price_scale_private");
    expect(catalog.find(plan => plan.key === "scale")).toMatchObject({ monthlyConfigured: true, yearlyConfigured: false });
  });

  test("falls back to the restricted free-tier limits for unknown plans", () => {
    expect(getPlanLimits("unknown")).toEqual({ customers: 100, monthlySms: 0, locations: 1 });
  });
});
