const integrations = [
  { name: "Google Business Profile", detail: "Business profile identity, review access, and response permissions.", status: "Connect account" },
  { name: "Yelp", detail: "Business listing and any supported authorized review data access.", status: "Verify access" },
  { name: "Facebook Pages", detail: "Page access and permissions for available reputation features.", status: "Connect account" },
  { name: "Convex", detail: "Database, business records, review endpoints, and application state.", status: "Configure environment" },
  { name: "n8n automation", detail: "Review-request sequences, inbound replies, opt-out checks, and scheduled follow-ups.", status: "Verify workflows" },
  { name: "SMS compliance", detail: "Document consent, STOP handling, quiet hours, sender identity, and message templates.", status: "Required before sending" },
];

export default function SettingsPage() {
  return <section className="mx-auto max-w-6xl"><p className="text-sm font-semibold uppercase tracking-widest text-brand">Workspace configuration</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Platforms & settings</h1><p className="mt-2 max-w-3xl text-slate-600">Configure the review sources and messaging workflow that power your local business reputation hub. Availability depends on platform permissions and credentials.</p><div className="mt-8 space-y-4">{integrations.map((item) => <article key={item.name} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-slate-900">{item.name}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{item.detail}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{item.status}</span></article>)}</div><p className="mt-6 text-xs leading-5 text-slate-500">A platform listed here is not necessarily connected. Confirm authorization and test data retrieval before relying on it in production.</p></section>;
}
