"use client";

import { useEffect, useState } from "react";

const API_URL = "";

const integrationLabels = {
  mongodb: "MongoDB",
  "google-business-profile": "Google Business Profile",
  "close-crm": "Close CRM",
  n8n: "n8n automation",
  stripe: "Stripe billing",
  ai: "AI responses",
};

function readableStatus(status) {
  return String(status || "not_connected").replaceAll("_", " ");
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const [overviewResponse, integrationsResponse] = await Promise.all([
          fetch(`${API_URL}/api/dashboard/overview`, { credentials: "include", cache: "no-store" }),
          fetch(`${API_URL}/api/integrations/status`, { credentials: "include", cache: "no-store" }),
        ]);
        const overview = await overviewResponse.json().catch(() => ({}));
        const integrationData = await integrationsResponse.json().catch(() => ({}));
        if (overviewResponse.status === 401 || integrationsResponse.status === 401) {
          throw new Error("Your session has expired. Please sign in again.");
        }
        if (!overviewResponse.ok) throw new Error(overview.error || "Could not load dashboard data.");
        if (!integrationsResponse.ok) throw new Error(integrationData.error || "Could not load integration status.");
        if (active) {
          setData(overview);
          setIntegrations(integrationData.integrations || []);
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load your workspace.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  const metrics = [
    ["New reviews", data?.metrics?.newReviews ?? 0],
    ["Average rating", data?.metrics?.averageRating ?? "—"],
    ["Customers", data?.metrics?.customers ?? 0],
    ["SMS requests", data?.metrics?.smsRequests ?? 0],
    ["Campaigns", data?.metrics?.campaigns ?? 0],
    ["Replies published", data?.metrics?.repliesToReview ?? 0]
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Reputation overview</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Your Ricoiz workspace</h1><p className="mt-2 text-slate-600">Live workspace data from your MongoDB-backed API.</p></div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{data?.demo ? "Demo data — no messages sent" : "Production workspace"}</span>
      </header>
      {loading && <p className="rounded-xl border p-5 text-slate-600">Loading workspace metrics…</p>}
      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><p>{error}</p><a className="mt-3 inline-block font-semibold underline" href="/login">Sign in</a></div>}
      {!loading && !error && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label,value]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold text-slate-900">{value}</p></article>)}</section>}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold">Integration status</h2>
        <p className="mt-1 text-sm text-slate-500">Statuses are read from the backend, not inferred by the dashboard.</p>
        {loading ? <p className="mt-4 text-sm text-slate-500">Checking providers…</p> : integrations.length === 0 ? <p className="mt-4 text-sm text-slate-500">No integration status is available.</p> :
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{integrations.map(item => <div key={item.key} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold">{integrationLabels[item.key] || item.name || item.key}</p><p className="mt-1 text-xs capitalize text-slate-500">{readableStatus(item.status)}</p>{item.accountEmail && <p className="mt-1 truncate text-xs text-slate-500">{item.accountEmail}</p>}{item.location && <p className="mt-1 truncate text-xs text-slate-500">{item.location}</p>}</div>)}</div>}
      </section>
      <p className="text-xs text-slate-500">Ricoiz does not send SMS unless a provider is configured and the recipient has documented consent.</p>
    </main>
  );
}
