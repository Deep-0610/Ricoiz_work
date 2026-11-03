import Stripe from "stripe";

const planCatalog = [
  { key: "starter", name: "Starter", monthlyPrice: process.env.STRIPE_PRICE_STARTER_MONTHLY || "", yearlyPrice: process.env.STRIPE_PRICE_STARTER_YEARLY || "", limits: { customers: 500, monthlySms: 1000, locations: 1 } },
  { key: "growth", name: "Growth", monthlyPrice: process.env.STRIPE_PRICE_GROWTH_MONTHLY || "", yearlyPrice: process.env.STRIPE_PRICE_GROWTH_YEARLY || "", limits: { customers: 2500, monthlySms: 5000, locations: 3 } },
  { key: "scale", name: "Scale", monthlyPrice: process.env.STRIPE_PRICE_SCALE_MONTHLY || "", yearlyPrice: process.env.STRIPE_PRICE_SCALE_YEARLY || "", limits: { customers: 10000, monthlySms: 20000, locations: 10 } }
];

let stripeClient;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}
export function getPlanCatalog() {
  return planCatalog.map(({ key, name, monthlyPrice, yearlyPrice, limits }) => ({
    key, name, limits,
    monthlyConfigured: Boolean(monthlyPrice),
    yearlyConfigured: Boolean(yearlyPrice)
  }));
}
export function findConfiguredPrice(priceId) {
  for (const plan of planCatalog) {
    if (priceId && priceId === plan.monthlyPrice) return { key: plan.key, interval: "month", limits: plan.limits };
    if (priceId && priceId === plan.yearlyPrice) return { key: plan.key, interval: "year", limits: plan.limits };
  }
  return null;
}
export function getPlanPrice(planKey, interval) {
  const plan = planCatalog.find(item => item.key === planKey);
  if (!plan) return null;
  const priceId = interval === "year" ? plan.yearlyPrice : plan.monthlyPrice;
  return priceId ? { priceId, planKey: plan.key, interval, limits: plan.limits } : null;
}
export function getPlanLimits(planKey) {
  return planCatalog.find(item => item.key === planKey)?.limits || { customers: 100, monthlySms: 0, locations: 1 };
}
export async function createCheckoutSession({ client, priceId, successUrl, cancelUrl }) {
  const stripe = getStripe();
  const price = findConfiguredPrice(priceId);
  if (!price) throw Object.assign(new Error("The selected billing price is not configured"), { status: 400 });
  let customerId = client.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: client.businessName,
      email: client.ownerEmail || undefined,
      metadata: { clientId: String(client._id) }
    }, { idempotencyKey: `ricoiz-customer-${client._id}` });
    customerId = customer.id;
    client.stripeCustomerId = customerId;
    await client.save();
  }
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: String(client._id),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    subscription_data: { metadata: { clientId: String(client._id), planKey: price.key } },
    metadata: { clientId: String(client._id), planKey: price.key }
  }, { idempotencyKey: `ricoiz-checkout-${client._id}-${priceId}-${Math.floor(Date.now() / 60000)}` });
}
export async function createPortalSession(customerId, returnUrl) {
  if (!customerId) throw Object.assign(new Error("No Stripe customer is linked to this workspace"), { status: 404 });
  return getStripe().billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}
export function verifyStripeWebhook(rawBody, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
