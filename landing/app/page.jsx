export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section className="bg-gradient-to-br from-brand-dark to-brand py-24 text-white">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-brand-light">
            For Roofers Only
          </p>
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
            Google Reviews on Autopilot.
            <br />
            <span className="text-brand-light">10 new reviews in 30 days,</span> or your next month is free.
          </h1>
          <p className="mb-8 max-w-2xl text-xl text-brand-light/90">
            Text us your customer. We send 3 texts, respond to reviews with AI, and email you a weekly report showing you vs. your top 3 local competitors.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#pricing"
              className="rounded-lg bg-white px-8 py-4 font-bold text-brand-dark shadow-lg transition hover:bg-brand-light hover:text-white"
            >
              Get Started — $297/mo
            </a>
            <a
              href="https://calendly.com/review-engine/demo"
              className="rounded-lg border-2 border-white bg-transparent px-8 py-4 font-bold text-white transition hover:bg-white hover:text-brand-dark"
            >
              Book a 15-min Demo
            </a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-4xl font-bold">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Step
              n={1}
              title="Text us your customer"
              body='After every job, text customer name + phone to your dedicated line. Example: "Sarah Johnson +14155551234". That&apos;s your entire workflow.'
            />
            <Step
              n={2}
              title="We send 3 texts"
              body="Check-in at 2hr → review request at 4hr → nudge 3 days later if no click. Unhappy customers get routed to you, not to Google."
            />
            <Step
              n={3}
              title="AI responds to every review"
              body="Every Google review gets a warm, human response within 20 minutes. 5-star auto-post. Low-star reviewed by us before posting."
            />
          </div>
        </div>
      </section>

      {/* COMPETITOR REPORT */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-6 text-4xl font-bold">Every Monday, You&apos;ll See This Email</h2>
          <p className="mb-8 text-lg text-slate-600">
            The weekly report that shows exactly where you stand against the roofers down the street.
          </p>
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="mb-4 text-xl font-bold text-brand-dark">
              Your Review Engine Report — Week of July 8
            </h3>
            <p className="mb-6 text-slate-700">
              You this week: <strong>+7 new reviews</strong> (avg 4.9 stars)
              <br />
              Total: 48 reviews (up from 12 when you started)
            </p>
            <div className="mb-6">
              <p className="mb-3 font-semibold text-slate-800">You vs. Your Top 3 Competitors:</p>
              <ul className="space-y-2 text-slate-700">
                <li>✓ You: 48 reviews (⭐ 4.9) — +7 this week</li>
                <li>• Ohio Roof Pros: 89 reviews (⭐ 4.7) — +3 this week</li>
                <li>• Cleveland Roofing: 71 reviews (⭐ 4.6) — +2 this week</li>
                <li>• Buckeye Roofers: 65 reviews (⭐ 4.8) — +4 this week</li>
              </ul>
            </div>
            <p className="rounded bg-green-50 p-4 font-semibold text-green-800">
              You gained ground on 3 out of 3 competitors this week.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-4 text-center text-4xl font-bold">Simple, Honest Pricing</h2>
          <p className="mb-12 text-center text-lg text-slate-600">
            No contracts. No hidden add-ons. Cancel with one click.
          </p>
          <div className="rounded-2xl border-2 border-brand p-8 shadow-xl">
            <div className="mb-6 flex items-baseline">
              <span className="text-5xl font-bold text-brand-dark">$297</span>
              <span className="ml-2 text-xl text-slate-500">/month</span>
            </div>
            <p className="mb-6 text-slate-600">
              + $497 one-time setup <span className="text-sm text-slate-400">(waived for first 5 clients)</span>
            </p>
            <ul className="mb-8 space-y-3 text-slate-700">
              <li>✓ Unlimited SMS review requests</li>
              <li>✓ Reactivation campaign for past customers</li>
              <li>✓ AI review responses (4-5 star auto, 1-3 star human review)</li>
              <li>✓ Dedicated sender + intake phone numbers</li>
              <li>✓ Weekly competitor report</li>
              <li>✓ Service recovery (unhappy customers routed to you)</li>
              <li>✓ 30-day guarantee: 10 reviews or next month free</li>
              <li>✓ US-based support, direct phone number</li>
              <li>✓ Data export anytime, one CSV</li>
            </ul>
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "/onboarding"}
              className="block w-full rounded-lg bg-brand-dark py-4 text-center font-bold text-white transition hover:bg-brand"
            >
              Start Now — $297/mo
            </a>
            <p className="mt-4 text-center text-sm text-slate-500">
              Powered by Stripe. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="bg-brand-dark py-20 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-4xl font-bold">The Guarantee</h2>
          <p className="mb-8 text-2xl leading-relaxed">
            <strong>10 new Google reviews in your first 30 days,</strong>
            <br />
            or your next month is <strong>free</strong>.
          </p>
          <p className="text-brand-light">
            We reactivate your existing customer list (300-500 people) and reliably produce
            15-30 reviews in the first two weeks. If we can&apos;t hit 10 in 30 days, you get a $297 credit.
          </p>
          <a
            href="/guarantee"
            className="mt-8 inline-block text-brand-light underline hover:text-white"
          >
            Read full guarantee terms →
          </a>
        </div>
      </section>

      {/* WEDGE */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-12 text-center text-4xl font-bold">
            Why We&apos;re Not Podium or Birdeye
          </h2>
          <div className="grid gap-4">
            <Contrast row="Contract" us="Month-to-month" them="12-month lock-in" />
            <Contrast row="Cancel" us="One click" them="30-90 day notice window" />
            <Contrast row="Pricing" us="$297 flat, published" them="$399-$999 + hidden add-ons" />
            <Contrast row="Renewal price hike" us="Never" them="8% annually" />
            <Contrast row="Data export" us="One-click CSV" them="Locked in their platform" />
            <Contrast row="Support" us="US-based, published phone" them="Offshore, no phone" />
            <Contrast row="AI review response" us="Included" them="$99/mo add-on" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-50 py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-4 text-4xl font-bold">Ready to catch up to your competitors?</h2>
          <p className="mb-8 text-lg text-slate-600">
            15 minutes on Zoom. See the audit for your business. Decide.
          </p>
          <a
            href="https://calendly.com/review-engine/demo"
            className="inline-block rounded-lg bg-brand-dark px-8 py-4 font-bold text-white shadow-lg transition hover:bg-brand"
          >
            Book a Demo
          </a>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        Review Engine — Google Reviews for local businesses. © 2026.
      </footer>
    </main>
  );
}

function Step({ n, title, body }) {
  return (
    <div className="rounded-xl border border-slate-200 p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
        {n}
      </div>
      <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
      <p className="text-slate-600">{body}</p>
    </div>
  );
}

function Contrast({ row, us, them }) {
  return (
    <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 p-4">
      <div className="font-semibold text-slate-800">{row}</div>
      <div className="text-green-700">✓ {us}</div>
      <div className="text-red-600">✗ {them}</div>
    </div>
  );
}
