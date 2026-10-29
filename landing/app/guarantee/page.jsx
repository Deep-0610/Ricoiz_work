export default function GuaranteePage() {
  const commitments = [
    { title: "Clear setup", description: "Identify the business profiles and permissions needed for your reputation workspace." },
    { title: "Honest review requests", description: "Invite customers to share genuine feedback without filtering people based on whether they are likely to leave a positive review." },
    { title: "Transparent reporting", description: "Ratings, review counts, and campaign activity should come from connected sources—not estimates presented as live results." },
    { title: "Respect customer choice", description: "Messaging workflows must honor documented consent, opt-outs, and applicable sending rules." },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <a href="/" className="text-sm font-semibold text-brand-dark hover:underline">← Back to Ricoiz</a>
      <div className="mt-8 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-brand">Our service commitments</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">A reputation workflow you can trust.</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">Ricoiz is designed to bring review activity and customer follow-up into one workspace. Results depend on connected platforms, permissions, customer participation, and correctly configured workflows.</p>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {commitments.map((item, index) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-sm font-black text-brand-dark">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="mt-5 text-xl font-bold text-slate-900">{item.title}</h2>
            <p className="mt-2 leading-7 text-slate-600">{item.description}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="font-bold text-slate-900">About guarantees and outcomes</h2>
        <p className="mt-2 leading-7 text-slate-600">This page does not promise a specific number of reviews or a guaranteed rating increase. Any paid plan, refund, credit, or performance guarantee should be defined in a separate written agreement before purchase.</p>
      </div>
      <div className="mt-10">
        <a href="/onboarding" className="inline-flex rounded-xl bg-brand-dark px-6 py-3.5 font-bold text-white transition hover:bg-brand">Set up your workspace →</a>
      </div>
    </main>
  );
}
