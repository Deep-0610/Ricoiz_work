const platforms = [
  { name: "Google", mark: "G", detail: "Business Profile reviews" },
  { name: "Yelp", mark: "Y", detail: "Local discovery feedback" },
  { name: "Facebook", mark: "f", detail: "Page recommendations" },
];

const features = [
  { number: "01", title: "One reputation inbox", description: "Bring Google, Yelp, and Facebook feedback into one clear workspace so your team spends less time switching tabs." },
  { number: "02", title: "Consent-aware SMS requests", description: "Set up customer follow-ups after a service or visit, with opt-out handling and quiet-hour checks built into the workflow." },
  { number: "03", title: "Faster, thoughtful replies", description: "Organize response work, draft helpful replies, and keep a human review step for sensitive or negative feedback." },
  { number: "04", title: "Reputation insights", description: "Track review volume, average ratings, response coverage, and trends by connected platform when real data is available." },
];

const steps = [
  { title: "Connect your profiles", description: "Add the business profiles and review links you want to monitor." },
  { title: "Configure follow-ups", description: "Review your message templates, consent source, opt-out behavior, and send windows." },
  { title: "Manage everything together", description: "Review feedback, coordinate replies, and monitor reputation activity from one dashboard." },
];

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="text-2xl font-black tracking-tight text-brand-dark">Ricoiz<span className="text-brand">.</span></a>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#platforms" className="hover:text-brand-dark">Platforms</a>
            <a href="#features" className="hover:text-brand-dark">Features</a>
            <a href="#how-it-works" className="hover:text-brand-dark">How it works</a>
          </nav>
          <a href="/onboarding" className="rounded-lg bg-brand-dark px-5 py-3 text-sm font-bold text-white transition hover:bg-brand">Set up your business</a>
        </div>
      </header>

      <section className="relative bg-gradient-to-br from-brand-dark via-brand to-slate-900 py-20 text-white md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-teal-100">Local reputation, in one place</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">Every review. Every platform. <span className="text-teal-200">One clear view.</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100/90">Ricoiz brings your Google, Yelp, and Facebook reputation into a single workspace, with customer review-request SMS sequences and practical tools to keep feedback moving.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a href="/onboarding" className="rounded-xl bg-white px-7 py-4 font-bold text-brand-dark shadow-lg transition hover:bg-teal-50">Set up your workspace <span aria-hidden="true">→</span></a>
              <a href="/dashboard" className="rounded-xl border border-white/40 px-7 py-4 font-bold text-white transition hover:bg-white/10">Explore dashboard</a>
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-200">Connectors, review data, and messaging activate only after the required account access and workflow configuration are complete.</p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-sm md:p-7">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-sm text-teal-100">Reputation workspace</p><h2 className="mt-1 text-xl font-bold">Your business at a glance</h2></div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Live data after setup</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4 text-slate-900"><p className="text-xs font-semibold text-slate-500">New reviews</p><p className="mt-2 text-3xl font-black">—</p><p className="mt-1 text-xs text-slate-500">Awaiting connection</p></div>
              <div className="rounded-2xl bg-white p-4 text-slate-900"><p className="text-xs font-semibold text-slate-500">Average rating</p><p className="mt-2 text-3xl font-black">—</p><p className="mt-1 text-xs text-slate-500">Across connected sources</p></div>
              <div className="col-span-2 rounded-2xl bg-slate-950/50 p-4">
                <div className="flex items-center justify-between"><p className="font-semibold">Connected review sources</p><p className="text-xs text-teal-100">Set up to begin</p></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">{platforms.map((platform) => <div key={platform.name} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-black text-brand-dark">{platform.mark}</span><div><p className="text-sm font-bold">{platform.name}</p><p className="text-[10px] text-slate-200">{platform.detail}</p></div></div>)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platforms" className="border-b border-slate-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-[.2em] text-slate-500">Designed around the places customers leave feedback</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">{platforms.map((platform) => <div key={platform.name} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-xl font-black text-brand-dark">{platform.mark}</span><div><h3 className="font-bold text-slate-900">{platform.name}</h3><p className="mt-1 text-sm text-slate-500">{platform.detail}</p></div></div>)}</div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-brand">Built for local businesses</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">From scattered feedback to a reputation you can manage.</h2><p className="mt-4 text-lg leading-8 text-slate-600">Spend less time chasing reviews across sites and more time understanding what customers are telling you.</p></div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{features.map((feature) => <article key={feature.number} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><p className="text-sm font-black text-brand">{feature.number}</p><h3 className="mt-5 text-lg font-bold text-slate-900">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p></article>)}</div>
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50 py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-brand">Simple setup</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">A clearer workflow from day one.</h2></div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">{steps.map((step, index) => <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-7"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-dark text-sm font-black text-white">{index + 1}</div><h3 className="mt-5 text-xl font-bold text-slate-900">{step.title}</h3><p className="mt-3 leading-7 text-slate-600">{step.description}</p></article>)}</div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6"><div className="rounded-3xl bg-brand-dark px-7 py-12 text-center text-white md:px-16 md:py-16"><p className="text-sm font-bold uppercase tracking-[.18em] text-teal-200">Make every customer voice easier to hear</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black md:text-4xl">Bring your local reputation into focus.</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-200">Start with your business details and review links. Configure messaging and integrations only when your accounts and consent requirements are ready.</p><a href="/onboarding" className="mt-8 inline-flex rounded-xl bg-white px-7 py-4 font-bold text-brand-dark hover:bg-teal-50">Get started <span className="ml-2" aria-hidden="true">→</span></a></div></div>
      </section>

      <footer className="border-t border-slate-200 py-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Ricoiz. Local business reputation management.</p><div className="flex gap-5"><a href="/dashboard" className="hover:text-brand-dark">Dashboard</a><a href="/onboarding" className="hover:text-brand-dark">Onboarding</a></div></div></footer>
    </main>
  );
}
