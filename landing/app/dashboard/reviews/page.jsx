"use client";

import { useEffect, useState } from "react";

const API_URL = "";

export default function ReviewsPage() {
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(() => {
    fetch(`${API_URL}/api/reviews`,{credentials:"include"})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not load reviews.");return data;})
      .then(data=>setItems(data.items||[]))
      .catch(err=>setError(err.message))
      .finally(()=>setLoading(false));
  },[]);
  return <section className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Unified review inbox</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Reviews</h1><p className="mt-2 text-slate-600">Reviews are loaded from your workspace database. Google sync requires an authorized Business Profile connection.</p></div>
    {error&&<p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b p-5"><h2 className="font-bold">Review activity</h2><p className="text-sm text-slate-500">{items.length} reviews</p></div>
      {loading?<p className="p-6 text-slate-500">Loading reviews…</p>:items.length===0?<p className="p-6 text-slate-500">No reviews yet. Connect your Google Business Profile to sync available reviews.</p>:
      <div className="divide-y">{items.map(item=><article key={item._id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold">{item.author||"Customer"} · {"★".repeat(item.rating||0)}</div><span className="text-xs text-slate-500">{item.platform} · {item.responseStatus||"not started"}</span></div><p className="mt-3 text-sm text-slate-700">{item.text||"No written review."}</p>{item.response&&<div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="font-semibold">Business response: </span>{item.response}</div>}</article>)}</div>}
    </div>
  </section>;
}
