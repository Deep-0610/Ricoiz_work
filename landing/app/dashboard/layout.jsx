import Link from "next/link";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: "◫" },
  { href: "/dashboard/reviews", label: "Review inbox", icon: "★" },
  { href: "/dashboard/campaigns", label: "SMS automation", icon: "↗" },
  { href: "/dashboard/customers", label: "Customers", icon: "♙" },
  { href: "/dashboard/settings", label: "Platforms & settings", icon: "⚙" },
];

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 md:grid md:grid-cols-[250px_1fr]">
      <aside className="border-r border-slate-200 bg-white p-5 md:min-h-screen">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-brand-dark">Ricoiz<span className="text-brand">.</span></Link>
        <p className="mb-8 mt-1 text-xs text-slate-500">Local Reputation Hub</p>
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-teal-50 hover:text-brand-dark">
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-10 hidden rounded-xl bg-teal-50 p-4 md:block">
          <p className="text-sm font-semibold text-brand-dark">Keep your reputation healthy</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Connect review sources and confirm consent settings before activating SMS follow-ups.</p>
          <a className="mt-3 inline-block text-sm font-semibold text-brand-dark underline" href="/onboarding">Continue setup</a>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
          <div><p className="text-sm font-semibold text-slate-900">Business workspace</p><p className="text-xs text-slate-500">Google · Yelp · Facebook reputation</p></div>
          <Link href="/onboarding" className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand">Configure business</Link>
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
