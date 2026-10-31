"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/dashboard/overview`, { credentials: "include" })
      .then(async response => {
        if (response.status === 401) throw new Error("Please sign in to view your workspace.");
        if (!response.ok) throw new Error("Could not load dashboard data.");
        return response.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
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
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{data?.demo ? "Demo data — no messages sent" : "Workspace"}</span>
      </header>
      {loading && <p className="rounded-xl border p-5 text-slate-600">Loading workspace metrics…</p>}
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><p>{error}</p><a className="mt-3 inline-block font-semibold underline" href="/login">Sign in</a></div>}
      {!loading && !error && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label,value]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold text-slate-900">{value}</p></article>)}</section>}
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Integration status</h2><p className="mt-1 text-sm text-slate-500">External providers stay in demo mode until credentials and OAuth permissions are configured.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{["MongoDB","Google Business Profile","Close CRM","n8n automation","Stripe billing","AI responses"].map((name,index)=><div key={name} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold">{name}</p><p className="mt-1 text-xs text-slate-500">{index===0?"Connected through API": "Not connected — demo only"}</p></div>)}</div></section>
      <p className="text-xs text-slate-500">Demo mode uses seeded sample records. Campaign actions do not send real SMS or emails.</p>
    </main>
  );
}
