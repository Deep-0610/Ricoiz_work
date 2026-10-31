"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = "";

export default function ReviewsPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (nextPage = 1, append = false) => {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/reviews?page=${nextPage}&limit=50`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load reviews.");
      setItems(current => append ? [...current, ...(data.items || [])] : (data.items || []));
      setPage(data.page || nextPage);
      setTotal(data.total || 0);
      setHasMore(Boolean(data.hasMore));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  async function syncGoogle() {
    setSyncing(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/integrations/google-business-profile/sync-reviews`, { method: "POST", credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Google review sync failed.");
      setNotice(`Google sync complete: ${data.synced || 0} reviews checked.`);
      setLoading(true);
      await load(1);
    } catch (err) { setError(err.message); }
    finally { setSyncing(false); }
  }

  return <section className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Unified review inbox</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Reviews</h1><p className="mt-2 text-slate-600">All reviews synced into this business workspace, newest first.</p></div>
      <div className="flex flex-wrap gap-2"><a href="/dashboard/settings" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">Connect Google</a><button onClick={syncGoogle} disabled={syncing} className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{syncing ? "Syncing Google…" : "Sync Google reviews"}</button></div>
    </div>
    {error && <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-5"><div><h2 className="font-bold">Review activity</h2><p className="text-sm text-slate-500">{items.length} of {total} reviews loaded</p></div><button onClick={() => { setLoading(true); load(1); }} className="rounded-lg border px-3 py-2 text-sm font-semibold">Refresh</button></div>
      {loading && items.length === 0 ? <p className="p-6 text-slate-500">Loading reviews…</p> : items.length === 0 ? <div className="space-y-3 p-6"><p className="font-semibold text-slate-800">No reviews synced yet.</p><p className="text-sm text-slate-600">Connect the Google Business Profile that owns your reviews in Settings, select the correct location, then sync. Reviews are never fabricated or shared across businesses.</p><a href="/dashboard/settings" className="inline-flex rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Set up Google connection</a></div> :
        <div className="divide-y">{items.map(item=><article key={item._id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold">{item.author || "Customer"} · {"★".repeat(item.rating || 0)}<span className="ml-2 text-xs font-normal text-slate-500">{item.rating}/5</span></div><span className="text-xs text-slate-500">{item.platform} · {item.responseStatus || "not started"}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.text || "No written review."}</p><p className="mt-2 text-xs text-slate-400">{item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : ""}</p>{item.response && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="font-semibold">Business response: </span>{item.response}</div>}</article>)}</div>}
      {hasMore && <div className="border-t p-5 text-center"><button disabled={loading} onClick={() => load(page + 1, true)} className="rounded-lg border px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Load more reviews</button></div>}
    </div>
  </section>;
}
