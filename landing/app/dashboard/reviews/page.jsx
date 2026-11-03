"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = "";
const platforms = [
  { value: "all", label: "All platforms" },
  { value: "google", label: "Google" },
  { value: "yelp", label: "Yelp" },
  { value: "facebook", label: "Facebook" },
];
const platformName = value => ({ google: "Google", yelp: "Yelp", facebook: "Facebook", demo: "Demo" }[String(value || "").toLowerCase()] || "Other");

export default function ReviewsPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [platformCounts, setPlatformCounts] = useState({});
  const [platform, setPlatform] = useState("all");
  const [rating, setRating] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingReply, setSavingReply] = useState("");
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (nextPage = 1, append = false) => {
    setError("");
    const params = new URLSearchParams({ page: String(nextPage), limit: "50", platform, search });
    if (rating !== "all") params.set("rating", rating);
    try {
      const response = await fetch(`${API_URL}/api/reviews?${params}`, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load reviews.");
      setItems(current => append ? [...current, ...(data.items || [])] : (data.items || []));
      setPage(data.page || nextPage);
      setTotal(data.total || 0);
      setHasMore(Boolean(data.hasMore));
      setPlatformCounts(data.platformCounts || {});
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [platform, rating, search]);

  useEffect(() => { setLoading(true); load(1); }, [load]);

  async function syncGoogle() {
    setSyncing(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/integrations/google-business-profile/sync-reviews`, { method: "POST", credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Google review sync failed.");
      setNotice(`Google sync complete: ${data.synced || 0} reviews checked across ${data.pages || 0} pages.`);
      setLoading(true); await load(1);
    } catch (err) { setError(err.message); }
    finally { setSyncing(false); }
  }

  async function publishReply(review) {
    const responseText = String(drafts[review._id] ?? review.response ?? "").trim();
    if (!responseText) return setError("Write a reply before publishing.");
    setSavingReply(review._id); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/integrations/google-business-profile/reviews/${encodeURIComponent(review._id)}/reply`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: responseText }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not publish the Google reply.");
      setItems(current => current.map(item => item._id === review._id ? { ...item, response: responseText, responseStatus: "published" } : item));
      setNotice("Reply published to Google Business Profile.");
    } catch (err) { setError(err.message); }
    finally { setSavingReply(""); }
  }

  return <section className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Reputation management</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Unified review inbox</h1><p className="mt-2 text-slate-600">Monitor customer feedback across connected review platforms in one place.</p></div>
      <div className="flex flex-wrap gap-2"><a href="/dashboard/settings" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">Manage platforms</a><button onClick={syncGoogle} disabled={syncing} className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{syncing ? "Syncing…" : "Sync Google reviews"}</button></div>
    </header>
    {error && <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      {["google","yelp","facebook"].map(key => <article key={key} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{platformName(key)} reviews</p><p className="mt-2 text-2xl font-bold text-slate-900">{platformCounts[key] || 0}</p></article>)}
    </div>
    <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input aria-label="Search reviews" className="min-w-56 flex-1 rounded-lg border p-2.5 text-sm" placeholder="Search reviewer or review text…" value={search} onChange={e => setSearch(e.target.value)} />
      <select aria-label="Filter platform" className="rounded-lg border p-2.5 text-sm" value={platform} onChange={e => setPlatform(e.target.value)}>{platforms.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
      <select aria-label="Filter rating" className="rounded-lg border p-2.5 text-sm" value={rating} onChange={e => setRating(e.target.value)}><option value="all">Any rating</option>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} stars</option>)}</select>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-5"><div><h2 className="font-bold">Review activity</h2><p className="text-sm text-slate-500">{items.length} of {total} matching reviews</p></div><button onClick={() => { setLoading(true); load(1); }} className="rounded-lg border px-3 py-2 text-sm font-semibold">Refresh</button></div>
      {loading && items.length === 0 ? <p className="p-6 text-slate-500">Loading reviews…</p> : items.length === 0 ? <div className="space-y-3 p-6"><p className="font-semibold text-slate-800">No matching reviews yet.</p><p className="text-sm text-slate-600">Connect a supported review source in Settings and sync it. Ricoiz never fabricates reviews or mixes data between businesses.</p><a href="/dashboard/settings" className="inline-flex rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Configure review sources</a></div> :
        <div className="divide-y">{items.map(item=><article key={item._id} className="space-y-3 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold">{item.author || "Customer"} · {"★".repeat(item.rating || 0)}<span className="ml-2 text-xs font-normal text-slate-500">{item.rating}/5</span></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{platformName(item.platform)} · {item.responseStatus || "not started"}</span></div><p className="whitespace-pre-wrap text-sm text-slate-700">{item.text || "No written review."}</p><p className="text-xs text-slate-400">{item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : ""}</p>{item.response && <div className="rounded-lg bg-slate-50 p-3 text-sm"><span className="font-semibold">Business response: </span>{item.response}</div>}{String(item.platform).toLowerCase() === "google" && <div className="space-y-2 rounded-xl border border-slate-200 p-3"><label className="block text-sm font-semibold">Google reply<textarea className="mt-1 min-h-24 w-full rounded-lg border p-3 font-normal" maxLength={4096} value={drafts[item._id] ?? item.response ?? ""} onChange={event => setDrafts(current => ({ ...current, [item._id]: event.target.value }))} placeholder="Write a thoughtful, professional response…" /></label><button onClick={() => publishReply(item)} disabled={savingReply === item._id || !(drafts[item._id] ?? item.response ?? "").trim()} className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingReply === item._id ? "Publishing…" : item.responseStatus === "published" ? "Update Google reply" : "Publish Google reply"}</button></div>}</article>)}</div>}
      {hasMore && <div className="border-t p-5 text-center"><button disabled={loading} onClick={() => load(page + 1, true)} className="rounded-lg border px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Load more reviews</button></div>}
    </div>
    <p className="text-xs text-slate-500">Google publishing is available when Google Business Profile is connected. Yelp and Facebook publishing depend on each platform's API permissions.</p>
  </section>;
}
