"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const API_URL = "";
const integrationLabels = {
  mongodb: "MongoDB",
  "google-business-profile": "Google Business Profile",
  "close-crm": "Close CRM",
  n8n: "n8n automation",
  stripe: "Stripe billing",
  ai: "AI responses",
};

const metricCards = [
  { key: "newReviews", label: "Total reviews", hint: "Reviews in this workspace", icon: "★" },
  { key: "averageRating", label: "Average rating", hint: "Across imported reviews", icon: "✦", suffix: "/ 5" },
  { key: "customers", label: "Customers", hint: "Your customer contacts", icon: "◎" },
  { key: "smsRequests", label: "SMS requests", hint: "Outbound activity recorded", icon: "↗" },
  { key: "campaigns", label: "Campaigns", hint: "Campaigns created", icon: "▤" },
  { key: "repliesToReview", label: "Replies published", hint: "Responses marked as published", icon: "↩" },
];

function MetricSkeleton() {
  return <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"><div className="h-3 w-24 rounded bg-slate-100" /><div className="mt-5 h-8 w-16 rounded bg-slate-100" /><div className="mt-3 h-3 w-32 rounded bg-slate-100" /></div>;
}

function statusLabel(status) {
  return String(status || "not connected").replaceAll("_", " ");
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewResponse, integrationsResponse] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/overview`, { credentials: "include", cache: "no-store" }),
        fetch(`${API_URL}/api/integrations/status`, { credentials: "include", cache: "no-store" }),
      ]);
      const overview = await overviewResponse.json().catch(() => ({}));
      const integrationData = await integrationsResponse.json().catch(() => ({}));
      if (overviewResponse.status === 401 || integrationsResponse.status === 401) throw new Error("Your session has expired. Please sign in again.");
      if (!overviewResponse.ok) throw new Error(overview.error || "Could not load dashboard metrics.");
      if (!integrationsResponse.ok) throw new Error(integrationData.error || "Could not load integration status.");
      setData(overview);
      setIntegrations(integrationData.integrations || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Unable to load your workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const metrics = data?.metrics || {};
  const connectedCount = integrations.filter(item => ["connected", "active"].includes(String(item.status || "").toLowerCase())).length;
  const totalIntegrations = integrations.length;
  const responseRate = metrics.newReviews > 0 ? Math.round((metrics.repliesToReview / metrics.newReviews) * 100) : 0;
  const platformCards = [
    { key: "google-business-profile", name: "Google", detail: "Business Profile reviews", href: "/dashboard/settings" },
    { key: "yelp", name: "Yelp", detail: "Review source", href: "/dashboard/settings" },
    { key: "facebook", name: "Facebook", detail: "Page recommendations", href: "/dashboard/settings" },
  ];

  return (
    <section className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-700"><span className="h-2 w-2 rounded-full bg-teal-500" /> REPUTATION OVERVIEW</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Good morning. Here's your business pulse.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Your reviews, customer relationships and reputation activity—together in one workspace.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">{data?.demo ? "Demo workspace" : "Live workspace data"}</span>
          <button onClick={loadDashboard} disabled={loading} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 disabled:opacity-50">{loading ? "Refreshing…" : "↻ Refresh"}</button>
        </div>
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p>{error}</p><a className="font-semibold underline" href={error.includes("session") ? "/login" : "#"} onClick={event => { if (!error.includes("session")) { event.preventDefault(); loadDashboard(); } }}> {error.includes("session") ? "Sign in" : "Try again"} </a></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading && !data ? metricCards.map(card => <MetricSkeleton key={card.key} />) : metricCards.map(card => (
          <article key={card.key} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md">
            <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{card.label}</p><span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-lg font-semibold text-teal-800">{card.icon}</span></div>
            <div className="mt-5 flex items-baseline gap-1"><p className="text-3xl font-bold tracking-tight text-slate-950 tabular-nums">{metrics[card.key] ?? "—"}</p>{card.suffix && <span className="text-sm text-slate-400">{card.suffix}</span>}</div>
            <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Reputation health</h2><p className="mt-1 text-sm text-slate-500">A quick view of your current review response performance.</p></div><Link href="/dashboard/reviews" className="text-sm font-semibold text-teal-800 hover:underline">Open review inbox →</Link></div>
          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5"><p className="text-sm font-medium text-slate-500">Response rate</p><div className="mt-2 flex items-end gap-2"><span className="text-4xl font-bold tracking-tight text-slate-950 tabular-nums">{metrics.newReviews > 0 ? responseRate : "—"}{metrics.newReviews > 0 ? "%" : ""}</span><span className="pb-1 text-xs text-slate-400">of all reviews</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${metrics.newReviews > 0 ? responseRate : 0}%` }} /></div><p className="mt-3 text-xs text-slate-500">{metrics.repliesToReview || 0} of {metrics.newReviews || 0} reviews have a published response.</p></div>
            <div className="rounded-2xl bg-slate-50 p-5"><p className="text-sm font-medium text-slate-500">Average customer rating</p><div className="mt-2 flex items-end gap-2"><span className="text-4xl font-bold tracking-tight text-slate-950 tabular-nums">{metrics.newReviews > 0 ? Number(metrics.averageRating || 0).toFixed(1) : "—"}</span><span className="pb-1 text-sm text-slate-400">/ 5</span></div><div className="mt-4 flex gap-1 text-xl text-amber-400" aria-label={metrics.newReviews > 0 ? `Average rating ${metrics.averageRating} out of 5` : "No ratings yet"}>{[1,2,3,4,5].map(n => <span key={n} className={n <= Math.round(metrics.averageRating || 0) ? "" : "text-slate-200"}>★</span>)}</div><p className="mt-3 text-xs text-slate-500">Calculated from reviews currently stored in this workspace.</p></div>
          </div>
          {!loading && metrics.newReviews === 0 && <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-4"><p className="text-sm font-semibold text-slate-800">Your review activity will appear here.</p><p className="mt-1 text-sm text-slate-500">Connect Google Business Profile and sync your first reviews to start tracking your reputation.</p><Link href="/dashboard/settings" className="mt-3 inline-flex text-sm font-semibold text-teal-800 hover:underline">Connect a review source →</Link></div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Quick actions</h2><p className="mt-1 text-sm text-slate-500">Get to the work that matters.</p></div><span className="text-xl text-teal-700">✧</span></div>
          <div className="mt-5 space-y-2">
            {[{href:"/dashboard/reviews",title:"Review inbox",desc:"Read and respond to customer reviews",icon:"★"},{href:"/dashboard/settings",title:"Connect platforms",desc:"Set up Google, Yelp and Facebook",icon:"⌘"},{href:"/dashboard/campaigns",title:"SMS campaigns",desc:"Manage customer follow-up campaigns",icon:"↗"},{href:"/dashboard/customers",title:"Customer contacts",desc:"View your customer list",icon:"◎"}].map(action=><Link key={action.href} href={action.href} className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-slate-200 hover:bg-slate-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-lg text-teal-800">{action.icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{action.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{action.desc}</span></span><span className="text-slate-400">→</span></Link>)}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Review platforms</h2><p className="mt-1 text-sm text-slate-500">Only verified connection states are shown here.</p></div><Link href="/dashboard/settings" className="text-sm font-semibold text-teal-800 hover:underline">Manage integrations →</Link></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {platformCards.map(platform => {
            const item = integrations.find(entry => entry.key === platform.key || entry.key === platform.name.toLowerCase());
            const connected = item && ["connected", "active"].includes(String(item.status || "").toLowerCase());
            return <article key={platform.key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">{platform.name.slice(0,1)}</span><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800">{platform.name}</span><span className="block truncate text-xs text-slate-500">{item?.accountEmail || platform.detail}</span></span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${connected ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-500"}`}>{connected ? "Connected" : "Not connected"}</span></article>;
          })}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400"><p>Ricoiz reputation workspace · Your data stays scoped to your business.</p><p>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for workspace data"}</p></div>
    </section>
  );
}
