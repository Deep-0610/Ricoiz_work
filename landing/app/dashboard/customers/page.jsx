"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = "";

export default function CustomersPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/customers`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load customers.");
      setItems(data.items || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/customers`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, consentStatus: "unknown" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save customer.");
      setForm({ firstName: "", lastName: "", phone: "" });
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return <section className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Customer relationships</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Customers & consent</h1><p className="mt-2 text-slate-600">Customer records are stored in your workspace. New contacts start with unknown consent and are not eligible for SMS.</p></div>
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-4">
      <input className="rounded-lg border p-3" placeholder="First name" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} required />
      <input className="rounded-lg border p-3" placeholder="Last name (optional)" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} />
      <input className="rounded-lg border p-3" placeholder="Phone number" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required />
      <button disabled={saving} className="rounded-lg bg-brand-dark px-4 py-3 font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Add customer"}</button>
    </form>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b p-5"><h2 className="font-bold">Workspace customers</h2><p className="text-sm text-slate-500">{items.length} records</p></div>
      {loading ? <p className="p-6 text-slate-500">Loading customers…</p> : items.length === 0 ? <p className="p-6 text-slate-500">No customer records yet. Add a contact above to get started.</p> :
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Customer</th><th className="p-4">Phone</th><th className="p-4">Consent</th><th className="p-4">Added</th></tr></thead><tbody>{items.map(item=><tr key={item._id} className="border-t"><td className="p-4 font-medium">{item.firstName} {item.lastName||""}</td><td className="p-4">{item.phone}</td><td className="p-4"><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{item.consentStatus||"unknown"}</span></td><td className="p-4 text-slate-500">{item.createdAt?new Date(item.createdAt).toLocaleDateString():"—"}</td></tr>)}</tbody></table></div>}
    </div>
    <p className="text-xs text-slate-500">Do not send SMS to contacts until documented permission is verified and recorded. Honor all STOP requests.</p>
  </section>;
}
