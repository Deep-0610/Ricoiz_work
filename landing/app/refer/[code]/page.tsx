import { redirect } from "next/navigation";

interface Props {
  params: { code: string };
}

export default async function ReferralPage({ params }: Props) {
  const { code } = params;

  // Verify code exists (via Convex)
  try {
    const res = await fetch(
      `${process.env.CONVEX_URL}/reviews/referral-by-code?code=${encodeURIComponent(code)}`,
      { headers: { Authorization: `Bearer ${process.env.CONVEX_AUTH_TOKEN}` } }
    );
    if (!res.ok) redirect("/");
    const data = await res.json();
    if (!data || data.error) redirect("/");

    // Track referral (client-side would use cookies; server-side just show page)
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand">
          Referred by {data.businessName}
        </p>
        <h1 className="mb-4 text-4xl font-bold">
          Your Referral Discount is Applied
        </h1>
        <p className="mb-8 text-lg text-slate-600">
          Because {data.businessName} sent you, {data.businessName} gets 1 month free when you sign up.
        </p>
        <a
          href={`/api/stripe-checkout?ref=${encodeURIComponent(code)}`}
          className="inline-block rounded-lg bg-brand-dark px-8 py-4 font-bold text-white shadow-lg transition hover:bg-brand"
        >
          Start Now — $297/mo
        </a>
        <p className="mt-4 text-sm text-slate-500">Powered by Stripe. Cancel anytime.</p>
      </main>
    );
  } catch (err) {
    redirect("/");
  }
}
