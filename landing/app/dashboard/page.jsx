const metrics = [
  { label: "New reviews", value: "—", note: "Connect your review data" },
  { label: "Average rating", value: "—", note: "Waiting for business profile" },
  { label: "SMS requests sent", value: "—", note: "Connect your campaign workflow" },
  { label: "Pending replies", value: "—", note: "No live data connected" },
];

const activity = [
  { title: "Connect your business profile", detail: "Add your Google review link and business details.", status: "Setup" },
  { title: "Verify SMS consent", detail: "Confirm your customer list has the required consent.", status: "Required" },
  { title: "Activate your first campaign", detail: "Review message timing and opt-out handling before launch.", status: "Next step" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Overview</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Your review engine</h1><p className="mt-2 text-slate-600">A clear view of your reputation and customer follow-ups.</p></div>
        <a href="/onboarding" className="inline-flex items-center justify-center rounded-lg bg-brand-dark px-5 py-3 text-sm font-bold text-white hover:bg-brand">Complete onboarding</a>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{metric.label}</p><p className="mt-3 text-3xl font-bold text-slate-900">{metric.value}</p><p className="mt-2 text-xs text-slate-500">{metric.note}</p></article>)}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Getting started</h2><p className="mt-1 text-sm text-slate-500">Complete these steps before sending campaigns.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Setup required</span></div>
          <div className="mt-6 space-y-5">{activity.map((item, index) => <div key={item.title} className="flex gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-brand-dark">{index + 1}</div><div className="flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{item.title}</h3><span className="text-xs text-slate-500">{item.status}</span></div><p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p></div></div>)}</div>
        </div>
        <div className="rounded-2xl bg-brand-dark p-6 text-white"><p className="text-sm font-semibold text-teal-200">Built for local service teams</p><h2 className="mt-3 text-2xl font-bold">Turn great service into more reviews.</h2><p className="mt-3 text-sm leading-6 text-teal-50/90">Configure your business and customer-consent settings, then connect your existing workflow before enabling automated messages.</p><a href="/onboarding" className="mt-6 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-teal-50">Start setup →</a></div>
      </section>
      <p className="text-xs leading-5 text-slate-500">Metrics show placeholders until live data is connected. No review, SMS, or campaign activity is fabricated.</p>
    </div>
  );
}
