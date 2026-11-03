"use client";

import { useEffect, useState } from "react";

const platforms = [
  { key: "google", label: "Google" },
  { key: "yelp", label: "Yelp" },
  { key: "facebook", label: "Facebook" },
];

export default function PublicReviewPage({ params }) {
  const [business, setBusiness] = useState(null);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/public/business/${encodeURIComponent(params.businessSlug)}`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "This review page is unavailable.");
        if (active) setBusiness(data.data);
      })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.businessSlug]);

  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><p className="text-sm text-slate-500">Loading review page…</p></main>;
  if (error || !business) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="max-w-md rounded-2xl border bg-white p-8 text-center"><h1 className="text-xl font-bold">Review page unavailable</h1><p className="mt-2 text-sm text-slate-600">{error || "We couldn't find this business."}</p></div></main>;

  const links = platforms.filter(platform => business.reviewLinks?.[platform.key]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Customer feedback</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{business.name}</h1>
        {business.industry && <p className="mt-2 text-sm text-slate-500">{business.industry}</p>}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">How was your experience?</h2>
          <p className="mt-1 text-sm text-slate-600">Choose a rating, then share your honest feedback on a review platform.</p>
          <div className="mt-5 flex items-center gap-2" role="group" aria-label="Your experience rating">
            {[1, 2, 3, 4, 5].map(value => (
              <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} className={`grid h-12 w-12 place-items-center rounded-xl border text-2xl transition ${rating >= value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-400 hover:border-slate-400"}`}>★</button>
            ))}
          </div>
        </div>
        {rating > 0 && (
          <div className="mt-7 rounded-2xl bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-900">Thanks for sharing your {rating}-star rating.</h3>
            <p className="mt-1 text-sm text-slate-600">Your rating doesn't limit where you can leave feedback. Choose any public review platform below and tell others about your experience in your own words.</p>
          </div>
        )}
        <div className="mt-7 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Leave an honest public review</h3>
          {links.length ? links.map(platform => (
            <a key={platform.key} href={business.reviewLinks[platform.key]} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50">
              <span>Continue to {platform.label}</span><span aria-hidden="true">↗</span>
            </a>
          )) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Public review links haven't been configured by this business yet.</p>}
        </div>
        <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">Your feedback is your own. Ricoiz doesn't filter or hide public reviews based on their rating.</p>
      </section>
    </main>
  );
}
