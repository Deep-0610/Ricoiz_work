"use client";

import { useEffect, useState } from "react";

const API_URL = "";

export default function SettingsPage() {
  const [intakePhone,setIntakePhone]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  useEffect(()=>{
    fetch(`${API_URL}/api/settings/intake-phone`,{credentials:"include"})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load settings");setIntakePhone(d.intakePhone||"");})
      .catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[]);
  async function save(event){
    event.preventDefault();setSaving(true);setError("");setMessage("");
    try{
      const r=await fetch(`${API_URL}/api/settings/intake-phone`,{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({intakePhone})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not save number");
      setIntakePhone(d.intakePhone);setMessage("Intake phone saved for this workspace.");
    }catch(e){setError(e.message);}finally{setSaving(false);}
  }
  return <section className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Workspace configuration</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Platforms & settings</h1><p className="mt-2 text-slate-600">Configure the inbound number used to identify your workspace in the first n8n intake workflow.</p></div>
    <form onSubmit={save} className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div><h2 className="font-bold">Owner intake phone</h2><p className="mt-1 text-sm text-slate-500">Use the Close CRM number that receives owner-submitted customer details, in E.164 format.</p></div>
      <input className="w-full rounded-lg border p-3" type="tel" placeholder="+14155550123" value={intakePhone} onChange={e=>setIntakePhone(e.target.value)} disabled={loading} required />
      <button disabled={saving||loading} className="rounded-lg bg-brand-dark px-5 py-3 font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Save intake number"}</button>
      {message&&<p className="text-sm text-green-700">{message}</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-bold">External integrations</h2>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><p className="font-semibold">Google Business Profile</p><p className="text-sm text-slate-500">OAuth credentials and Google API access approval required.</p></div><a className="rounded-lg border px-4 py-2 text-sm font-semibold" href="/settings/integrations">Connect Google</a></div>
      <div className="border-b py-3"><p className="font-semibold">n8n automation</p><p className="text-sm text-slate-500">Import the first intake workflow and configure its Header Auth credential in your n8n editor.</p></div>
      <div className="border-b py-3"><p className="font-semibold">Close CRM / SMS</p><p className="text-sm text-slate-500">Close API credentials and approved sender configuration are not connected yet.</p></div>
      <div className="py-3"><p className="font-semibold">Stripe billing</p><p className="text-sm text-slate-500">Payment checkout and webhook activation require your Stripe account credentials.</p></div>
    </div>
  </section>;
}
