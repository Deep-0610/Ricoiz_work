const platforms = [
  { name: "Google", detail: "Business Profile reviews", mark: "G" },
  { name: "Yelp", detail: "Local customer feedback", mark: "Y" },
  { name: "Facebook", detail: "Page recommendations", mark: "f" },
];

const metrics = [
  { label: "New reviews", value: "—", note: "Connect review sources to load real data" },
  { label: "Average rating", value: "—", note: "Calculated from connected platforms" },
  { label: "SMS requests", value: "—", note: "Available after workflow connection" },
  { label: "Replies to review", value: "—", note: "Waiting for review data" },
];

const checklist = [
  { title: "Add your business details", detail: "Set your business name, location, contact, and timezone.", status: "Start here" },
  { title: "Connect review platforms", detail: "Add Google, Yelp, and Facebook profile links and authorize supported integrations.", status: "Required" },
  { title: "Verify messaging consent", detail: "Confirm permission records, opt-out handling, and quiet-hour rules before any SMS is sent.", status: "Required" },
  { title: "Review your follow-up sequence", detail: "Check message templates, sender settings, and n8n workflow readiness.", status: "Before launch" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Reputation overview</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Your local reputation, unified.</h1><p className="mt-2 max-w-2xl text-slate-600">Monitor review activity across Google, Yelp, and Facebook, then manage customer follow-ups from one workspace.</p></div>
        <a href="/onboarding" className="inline-flex items-center justify-center rounded-lg bg-brand-dark px-5 py-3 text-sm font-bold text-white hover:bg-brand">Set up business</a>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{metric.label}</p><p className="mt-3 text-3xl font-bold text-slate-900">{metric.value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{metric.note}</p></article>)}</section>
      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6"><div><h2 className="text-lg font-bold text-slate-900">Workspace setup</h2><p className="mt-1 text-sm text-slate-500">Complete these steps before enabling automation.</p></div><div className="mt-6 space-y-5">{checklist.map((item, index) => <div key={item.title} className="flex gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-brand-dark">{index + 1}</div><div className="flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{item.title}</h3><span className="text-xs font-medium text-slate-500">{item.status}</span></div><p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p></div></div>)}</div></div>
        <div className="rounded-2xl bg-brand-dark p-6 text-white"><p className="text-sm font-semibold text-teal-200">One workspace. Multiple review sources.</p><h2 className="mt-3 text-2xl font-bold">See the whole customer conversation.</h2><p className="mt-3 text-sm leading-6 text-teal-50/90">Your dashboard is designed for multi-platform reputation management. Connect the supported data sources before expecting live ratings, reviews, or campaign activity.</p><div className="mt-6 space-y-3">{platforms.map((platform) => <div key={platform.name} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-black text-brand-dark">{platform.mark}</span><div><p className="text-sm font-bold">{platform.name}</p><p className="text-xs text-teal-50/75">{platform.detail}</p></div><span className="ml-auto rounded-full bg-white/10 px-2 py-1 text-[10px]">Setup needed</span></div>)}</div><a href="/onboarding" className="mt-6 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-teal-50">Configure sources →</a></div>
      </section>
      <p className="text-xs leading-5 text-slate-500">Numbers remain placeholders until real platform and workflow data is connected. This dashboard does not fabricate ratings, reviews, or SMS delivery records.</p>
    </div>
  );
}
