"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = "";

export default function SettingsPage() {
  const [intakePhone, setIntakePhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [googleStatus, setGoogleStatus] = useState("unknown");
  const [accounts, setAccounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [accountName, setAccountName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationTitle, setLocationTitle] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/settings/intake-phone`, { credentials: "include" })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not load settings"); setIntakePhone(d.intakePhone || ""); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function save(event) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const r = await fetch(`${API_URL}/api/settings/intake-phone`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intakePhone }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not save number");
      setIntakePhone(d.intakePhone); setMessage("Intake phone saved for this workspace.");
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function connectGoogle() {
    setGoogleBusy(true); setError("");
    try {
      const r = await fetch(`${API_URL}/api/integrations/google-business-profile/connect`, { credentials: "include" });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Google connection is not configured on the server.");
      window.location.assign(d.authorizationUrl);
    } catch (e) { setError(e.message); setGoogleBusy(false); }
  }

  const loadAccounts = useCallback(async () => {
    setGoogleBusy(true); setError("");
    try {
      const r = await fetch(`${API_URL}/api/integrations/google-business-profile/accounts`, { credentials: "include" });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Google account lookup failed.");
      setAccounts(d.accounts || []);
      setGoogleStatus("connected");
    } catch (e) { setError(e.message); setGoogleStatus("not_connected"); }
    finally { setGoogleBusy(false); }
  }, []);

  async function loadLocations(value) {
    setAccountName(value); setLocations([]); setLocationName(""); setLocationTitle(""); setError("");
    if (!value) return;
    setGoogleBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/integrations/google-business-profile/locations?account=${encodeURIComponent(value)}`, { credentials: "include" });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not load business locations.");
      setLocations(d.locations || []);
    } catch (e) { setError(e.message); }
    finally { setGoogleBusy(false); }
  }

  async function saveLocation() {
    const selected = locations.find(item => item.name === locationName);
    if (!selected) return;
    setGoogleBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(`${API_URL}/api/integrations/google-business-profile/location`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountName, locationName, locationTitle: selected.title }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not save Google location.");
      setLocationTitle(d.locationTitle); setMessage(`Connected location: ${d.locationTitle}`);
    } catch (e) { setError(e.message); }
    finally { setGoogleBusy(false); }
  }

  return <section className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Workspace configuration</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Platforms & settings</h1><p className="mt-2 text-slate-600">Connect the services that power your review inbox and customer workflows.</p></div>
    <form onSubmit={save} className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div><h2 className="font-bold">Owner intake phone</h2><p className="mt-1 text-sm text-slate-500">Close CRM inbound number used by the n8n intake workflow, in E.164 format.</p></div>
      <input className="w-full rounded-lg border p-3" type="tel" placeholder="+14155550123" value={intakePhone} onChange={e => setIntakePhone(e.target.value)} disabled={loading} required />
      <button disabled={saving || loading} className="rounded-lg bg-brand-dark px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save intake number"}</button>
    </form>
    <div className="max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Google Business Profile</h2><p className="mt-1 text-sm text-slate-500">Authorize Google, choose the business location, and sync its reviews.</p></div><button onClick={connectGoogle} disabled={googleBusy} className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{googleBusy ? "Please wait…" : "Connect Google account"}</button></div>
      <button onClick={loadAccounts} disabled={googleBusy} className="rounded-lg border px-4 py-2 text-sm font-semibold">Load connected Google accounts</button>
      {accounts.length > 0 && <div className="space-y-3"><label className="block text-sm font-medium">Google account<select className="mt-1 w-full rounded-lg border p-3" value={accountName} onChange={e => loadLocations(e.target.value)}><option value="">Choose an account</option>{accounts.map(a => <option key={a.name} value={a.name}>{a.accountName || a.name}</option>)}</select></label>{locations.length > 0 && <><label className="block text-sm font-medium">Business location<select className="mt-1 w-full rounded-lg border p-3" value={locationName} onChange={e => setLocationName(e.target.value)}><option value="">Choose a location</option>{locations.map(l => <option key={l.name} value={l.name}>{l.title}</option>)}</select></label><button onClick={saveLocation} disabled={!locationName || googleBusy} className="rounded-lg border px-4 py-2 text-sm font-semibold">Save selected location</button></>}</div>}
      {locationTitle && <p className="text-sm text-emerald-700">Selected: {locationTitle}. Open Reviews and run Sync Google reviews.</p>}
      <p className="text-xs leading-5 text-slate-500">Google Cloud OAuth client, Business Profile API access, and the exact redirect URI must be configured on the server before authorization can complete.</p>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Other integrations</h2><p className="mt-2 text-sm text-slate-600">Close CRM, n8n, Stripe and email delivery still require their provider accounts and credentials. They are not marked connected until tested.</p></div>
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  </section>;
}
