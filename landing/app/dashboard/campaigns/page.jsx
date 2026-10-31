"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = "";

export default function CampaignsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", channel: "sms", messageTemplate: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/campaigns`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load campaigns.");
      setItems(data.items || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCampaign(event) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/campaigns`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create campaign.");
      setForm({ name: "", channel: "sms", messageTemplate: "" });
      setNotice("Draft campaign saved to your workspace.");
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function updateStatus(item, status) {
    setError(""); setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/campaigns/${item._id}/status`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update campaign.");
      setNotice(data.message || "Campaign status updated.");
      await load();
    } catch (err) { setError(err.message); }
  }

  return <section className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Customer follow-up</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Campaigns</h1><p className="mt-2 max-w-3xl text-slate-600">Create and manage campaign drafts in your workspace. Activating a campaign currently changes its saved status only; it does not send SMS until a compliant messaging provider and automation workflow are connected.</p></div>
    <form onSubmit={createCampaign} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-bold">Create campaign draft</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="rounded-lg border p-3" placeholder="Campaign name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} minLength={2} required />
        <select className="rounded-lg border p-3" value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})}><option value="sms">SMS</option><option value="email">Email</option></select>
      </div>
      <textarea className="min-h-28 w-full rounded-lg border p-3" placeholder="Message template (optional)" value={form.messageTemplate} onChange={e=>setForm({...form,messageTemplate:e.target.value})} maxLength={2000} />
      <button disabled={saving} className="rounded-lg bg-brand-dark px-5 py-3 font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Save draft"}</button>
    </form>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice&&<p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b p-5"><h2 className="font-bold">Your campaigns</h2><p className="text-sm text-slate-500">{items.length} saved campaigns</p></div>
      {loading?<p className="p-6 text-slate-500">Loading campaigns…</p>:items.length===0?<p className="p-6 text-slate-500">No campaigns yet. Create your first draft above.</p>:
        <div className="divide-y">{items.map(item=><article key={item._id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.name}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.status}</span><span className="text-xs text-slate-500">{item.channel}</span></div>{item.messageTemplate&&<p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.messageTemplate}</p>}</div><div className="flex flex-wrap gap-2">{item.status!=="paused"&&<button onClick={()=>updateStatus(item,"paused")} className="rounded-lg border px-3 py-2 text-sm font-semibold">Pause</button>}{item.status!=="draft"&&<button onClick={()=>updateStatus(item,"draft")} className="rounded-lg border px-3 py-2 text-sm font-semibold">Move to draft</button>}</div></article>)}</div>}
    </div>
    <p className="text-xs leading-5 text-slate-500">Compliance gate: only message contacts with documented consent, maintain STOP suppression, and configure sender registration and quiet hours before enabling real messaging.</p>
  </section>;
}
