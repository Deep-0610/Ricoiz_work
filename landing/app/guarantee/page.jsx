export default function GuaranteePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 leading-relaxed">
      <h1 className="mb-6 text-4xl font-bold">The Guarantee</h1>
      <p className="mb-8 text-xl text-slate-700">
        <strong>10 new Google reviews in your first 30 days, or your next month is free.</strong>
      </p>

      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="mb-3 text-2xl font-bold">The Rules</h2>
          <ol className="ml-6 list-decimal space-y-2">
            <li>
              Your <strong>past customer CSV</strong> must be uploaded during onboarding (300+ customers recommended for guarantee).
            </li>
            <li>
              You must <strong>grant Google Business Profile Manager access</strong> during onboarding (blocks AI responses if not granted).
            </li>
            <li>
              You must <strong>complete the consent attestation</strong> (TCPA compliance requirement).
            </li>
            <li>
              The guarantee window starts on the day your <strong>reactivation campaign begins</strong> (typically within 24 hours of onboarding completion).
            </li>
            <li>
              If we don&apos;t deliver <strong>10 new Google reviews to your Google Business Profile</strong> within 30 days,
              your next month&apos;s $297 subscription is <strong>waived</strong>.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold">What Counts as a "New Review"</h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>Any review posted to your Google Business Profile between Day 0 and Day 30.</li>
            <li>Both 5-star and lower-star reviews count.</li>
            <li>Reviews posted before onboarding do not count.</li>
            <li>Fake reviews or reviews you incentivize do not count (and violate our terms).</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold">What Happens if We Miss</h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>You get a $297 credit applied to your next month automatically.</li>
            <li>Setup fee is <strong>non-refundable</strong>.</li>
            <li>Your account continues normally after the credited month.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold">Why We Can Offer This</h2>
          <p>
            Reactivation campaigns to a 300-500 person past-customer list reliably produce
            15-30 reviews in the first two weeks. In 6+ months of data, we&apos;ve never missed the 10-review target
            for a client who uploaded a properly-consented past customer list.
          </p>
          <p className="mt-3">
            The worst-case cost of a miss is one $297 credit. That&apos;s the risk we take to earn your trust.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold">Cancel Anytime</h2>
          <p>
            No matter what happens with the guarantee, you can cancel your subscription at any time with one click.
            No 30-day notice window. No retention calls. No BS.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-slate-200 pt-8 text-center">
        <a
          href="/"
          className="inline-block rounded-lg bg-brand-dark px-8 py-4 font-bold text-white transition hover:bg-brand"
        >
          Get Started — $297/mo
        </a>
      </div>
    </main>
  );
}
