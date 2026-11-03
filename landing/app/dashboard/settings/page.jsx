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
  const [businessForm, setBusinessForm] = useState({ businessName: "", industry: "", city: "", google: "", yelp: "", facebook: "", slug: "" });
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessNotice, setBusinessNotice] = useState("");
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billingPlan, setBillingPlan] = useState("starter");
  const [billingInterval, setBillingInterval] = useState("month");
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/settings/intake-phone`, { credentials: "include" })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not load settings"); setIntakePhone(d.intakePhone || ""); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/business/me`, { credentials: "include" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load business profile");
        const item = data.data || {};
        setBusinessForm({
          businessName: item.businessName || "",
          industry: item.industry || "",
          city: item.address?.city || item.city || "",
          google: item.publicReviewLinks?.google || item.googleReviewUrl || "",
          yelp: item.publicReviewLinks?.yelp || "",
          facebook: item.publicReviewLinks?.facebook || "",
          slug: item.slug || ""
        });
      })
      .catch(err => setError(err.message));
  }, []);


  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/billing/status`, { credentials: "include" }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not load billing status"); return d.data; }),
      fetch(`${API_URL}/api/billing/plans`, { credentials: "include" }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not load plans"); return d.data || []; })
    ]).then(([status, availablePlans]) => { setBilling(status); setPlans(availablePlans); })
      .catch(err => setError(err.message));
  }, []);

  async function startCheckout() {
    setBillingBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/billing/checkout`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: billingPlan, interval: billingInterval })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start Stripe Checkout");
      if (!data.data?.checkoutUrl) throw new Error("Stripe did not return a Checkout URL");
      window.location.assign(data.data.checkoutUrl);
    } catch (err) { setError(err.message); setBillingBusy(false); }
  }

  async function openBillingPortal() {
    setBillingBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/billing/portal`, { method: "POST", credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open billing portal");
      if (!data.data?.portalUrl) throw new Error("Stripe did not return a billing portal URL");
      window.location.assign(data.data.portalUrl);
    } catch (err) { setError(err.message); setBillingBusy(false); }
  }

  async function saveBusiness(event) {
    event.preventDefault(); setBusinessSaving(true); setError(""); setBusinessNotice("");
    try {
      const response = await fetch(`${API_URL}/api/business/settings`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessForm.businessName,
          industry: businessForm.industry,
          address: { city: businessForm.city },
          publicReviewLinks: { google: businessForm.google, yelp: businessForm.yelp, facebook: businessForm.facebook }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save business profile");
      setBusinessForm(current => ({ ...current, slug: data.data?.slug || current.slug }));
      setBusinessNotice("Business profile and public review links saved.");
    } catch (err) { setError(err.message); }
    finally { setBusinessSaving(false); }
  }

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
    <form onSubmit={saveBusiness} className="max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div><h2 className="font-bold">Business profile & public review links</h2><p className="mt-1 text-sm text-slate-500">These details power your public review page. Every configured platform link is shown to every customer, regardless of their rating.</p></div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="rounded-lg border p-3" aria-label="Business name" placeholder="Business name" value={businessForm.businessName} onChange={e=>setBusinessForm({...businessForm,businessName:e.target.value})} required />
        <input className="rounded-lg border p-3" aria-label="Industry" placeholder="Industry (optional)" value={businessForm.industry} onChange={e=>setBusinessForm({...businessForm,industry:e.target.value})} />
        <input className="rounded-lg border p-3 md:col-span-2" aria-label="City" placeholder="City" value={businessForm.city} onChange={e=>setBusinessForm({...businessForm,city:e.target.value})} />
        <input className="rounded-lg border p-3 md:col-span-2" type="url" aria-label="Google review URL" placeholder="Google review URL" value={businessForm.google} onChange={e=>setBusinessForm({...businessForm,google:e.target.value})} />
        <input className="rounded-lg border p-3 md:col-span-2" type="url" aria-label="Yelp review URL" placeholder="Yelp review URL" value={businessForm.yelp} onChange={e=>setBusinessForm({...businessForm,yelp:e.target.value})} />
        <input className="rounded-lg border p-3 md:col-span-2" type="url" aria-label="Facebook review URL" placeholder="Facebook recommendations URL" value={businessForm.facebook} onChange={e=>setBusinessForm({...businessForm,facebook:e.target.value})} />
      </div>
      <button disabled={businessSaving} className="rounded-lg bg-brand-dark px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{businessSaving ? "Saving…" : "Save business profile"}</button>
      {businessForm.slug && <p className="text-sm text-slate-600">Public review page: <a className="font-semibold underline" href={`/r/${businessForm.slug}`} target="_blank" rel="noreferrer">/r/{businessForm.slug}</a></p>}
      {businessNotice && <p role="status" className="text-sm text-emerald-700">{businessNotice}</p>}
    </form>
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

    <div className="max-w-3xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-bold">Subscription & billing</h2><p className="mt-1 text-sm text-slate-500">Manage your Ricoiz plan, usage limits, and payment details through Stripe.</p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{billing?.status || "Loading"}</span>
      </div>
      {billing ? <>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Current plan</p><p className="mt-1 text-lg font-bold capitalize">{billing.plan}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Customers</p><p className="mt-1 text-lg font-bold">{billing.usage?.customers ?? 0} / {billing.limits?.customers ?? 0}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">SMS this month</p><p className="mt-1 text-lg font-bold">{billing.usage?.monthlySms ?? 0} / {billing.limits?.monthlySms ?? 0}</p></div>
        </div>
        {billing.currentPeriodEnd && <p className="text-sm text-slate-500">Current period ends {new Date(billing.currentPeriodEnd).toLocaleDateString()} {billing.cancelAtPeriodEnd ? "· Cancellation scheduled" : ""}</p>}
      </> : <p className="text-sm text-slate-500">Loading billing details…</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Choose plan
          <select className="mt-1 w-full rounded-lg border p-3" value={billingPlan} onChange={e => setBillingPlan(e.target.value)}>
            {plans.map(plan => <option key={plan.key} value={plan.key}>{plan.name}{!plan.monthlyConfigured && !plan.yearlyConfigured ? " (not configured)" : ""}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Billing interval
          <select className="mt-1 w-full rounded-lg border p-3" value={billingInterval} onChange={e => setBillingInterval(e.target.value)}>
            <option value="month">Monthly</option><option value="year">Yearly</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={startCheckout} disabled={billingBusy || !plans.some(p => p.key === billingPlan && (billingInterval === "month" ? p.monthlyConfigured : p.yearlyConfigured))} className="rounded-lg bg-brand-dark px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{billingBusy ? "Please wait…" : "Choose plan"}</button>
        <button type="button" onClick={openBillingPortal} disabled={billingBusy || !billing?.status || billing.status === "inactive"} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-50">Manage subscription</button>
      </div>
      <p className="text-xs leading-5 text-slate-500">Payments are processed on Stripe-hosted pages. Your plan changes only after Ricoiz receives and verifies the Stripe webhook. Configure Stripe products, recurring prices, and webhook secrets on the server before enabling checkout.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Yelp</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Not connected</span></div>
        <p className="mt-2 text-sm text-slate-600">Yelp review ingestion is planned through an approved Yelp API or partner integration. Ricoiz will not scrape reviews or display invented data.</p>
        <p className="mt-3 text-xs text-slate-500">Requires eligible API access, approved use case, and business authorization.</p>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Facebook Pages</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Not connected</span></div>
        <p className="mt-2 text-sm text-slate-600">Facebook recommendations and Page feedback require a Meta app with approved permissions and a Page admin authorization flow.</p>
        <p className="mt-3 text-xs text-slate-500">Requires Meta app review, Page access token, and approved permissions.</p>
      </article>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Other integrations</h2><p className="mt-2 text-sm text-slate-600">Close CRM, n8n and email delivery still require their provider accounts and credentials. They are not marked connected until tested.</p></div>
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  </section>;
}
