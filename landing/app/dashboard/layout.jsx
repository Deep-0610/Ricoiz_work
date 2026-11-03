"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: "◫", exact: true },
  { href: "/dashboard/reviews", label: "Review inbox", icon: "★" },
  { href: "/dashboard/campaigns", label: "SMS automation", icon: "↗" },
  { href: "/dashboard/customers", label: "Customers", icon: "♙" },
  { href: "/dashboard/settings", label: "Platforms & settings", icon: "⚙" },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f6f9f8] md:grid md:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex h-full flex-col p-5">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#134e4a]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-800 text-sm text-white">R</span>Ricoiz<span className="-ml-2 text-teal-600">.</span></Link>
          <p className="mb-7 ml-11 -mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Reputation platform</p>
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
          <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
            {navigation.map(item => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active ? "bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                <span className={`grid h-7 w-7 place-items-center rounded-lg text-base ${active ? "bg-white text-teal-800 shadow-sm" : "text-slate-400"}`} aria-hidden="true">{item.icon}</span>{item.label}
                {active && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-teal-600 md:block" />}
              </Link>;
            })}
          </nav>
          <div className="mt-auto hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-4 md:block">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-teal-800 shadow-sm">✧</div>
            <p className="mt-3 text-sm font-bold text-slate-900">Build trust with every interaction</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Connect review sources and keep customer consent up to date before sending follow-ups.</p>
            <Link href="/dashboard/settings" className="mt-3 inline-flex text-xs font-bold text-teal-800 hover:underline">Finish setup →</Link>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 py-3 backdrop-blur-xl md:px-8">
          <div><p className="text-xs font-semibold text-slate-900 sm:text-sm">Business workspace</p><p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">One place for your customer reputation</p></div>
          <Link href="/dashboard/settings" className="rounded-xl bg-[#134e4a] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800 sm:px-4 sm:text-sm">Configure business <span aria-hidden="true">→</span></Link>
        </header>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
