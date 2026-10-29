"use client";

import { useState } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://YOUR_CONVEX_DEPLOYMENT";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    businessName: "",
    ownerFirstName: "",
    ownerLastName: "",
    ownerEmail: "",
    ownerPhone: "",
    timezone: "America/New_York",
    city: "",
    googleReviewUrl: "",
    consentMethod: "",
    consentDateFrom: "",
    consentDateTo: "",
    consents: {
      withinYear: false,
      voluntary: false,
      pewc: false,
      notEBR: false,
      indemnify: false,
    },
    signature: "",
    csvUrl: "",
  });

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${CONVEX_URL}/reviews/onboarding-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Submission failed. Please try again or email onboarding@review-engine.co");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (e) {
      setError("Network error. Please try again or email onboarding@review-engine.co");
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-4 text-3xl font-bold text-slate-900">You&apos;re In!</h1>
          <p className="mb-6 text-lg text-slate-700">
            We received your onboarding info. Our team will set up your account
            within 24 hours and text you the confirmation.
          </p>
          <p className="text-sm text-slate-500">
            Questions? Email onboarding@review-engine.co
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand">
        Onboarding — Step {step} of 4
      </p>
      <h1 className="mb-8 text-3xl font-bold">Let&apos;s get you set up</h1>

      {step === 1 && (
        <Section title="Business Info">
          <Input label="Business Name" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Owner First Name" value={form.ownerFirstName} onChange={(v) => setForm({ ...form, ownerFirstName: v })} />
            <Input label="Owner Last Name" value={form.ownerLastName} onChange={(v) => setForm({ ...form, ownerLastName: v })} />
          </div>
          <Input label="Owner Email" type="email" value={form.ownerEmail} onChange={(v) => setForm({ ...form, ownerEmail: v })} />
          <Input label="Owner Phone" type="tel" value={form.ownerPhone} onChange={(v) => setForm({ ...form, ownerPhone: v })} help="For urgent issues + shown in AI responses to low-rating reviews" />
          <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <NextBtn onClick={() => setStep(2)}>Continue</NextBtn>
        </Section>
      )}

      {step === 2 && (
        <Section title="Google Business Profile">
          <Input label="Google Review URL" value={form.googleReviewUrl} onChange={(v) => setForm({ ...form, googleReviewUrl: v })} help='Format: https://g.page/r/YOUR-ID/review' />
          <div className="rounded-lg border border-brand bg-brand/5 p-6">
            <h3 className="mb-3 font-bold text-brand-dark">Add us as a Google Business Profile Manager</h3>
            <p className="mb-3 text-slate-700">This lets us respond to reviews on your behalf. Standard agency practice.</p>
            <ol className="ml-6 list-decimal space-y-2 text-slate-700">
              <li>Go to business.google.com</li>
              <li>Select your business</li>
              <li>Click <strong>Users</strong> (three-dot menu)</li>
              <li>Click <strong>Add user</strong></li>
              <li>Email: <code className="rounded bg-slate-100 px-2 py-1 text-sm">reviews@review-engine.co</code></li>
              <li>Role: <strong>Manager</strong></li>
              <li>Click <strong>Invite</strong></li>
            </ol>
            <p className="mt-4 text-sm text-slate-600">
              <strong>Note:</strong> Google requires a 7-day verification period. Your AI review responses will activate on Day 8. Reactivation SMS campaign starts within 24 hours regardless.
            </p>
          </div>
          <BackNextBtn onBack={() => setStep(1)} onNext={() => setStep(3)}>Continue</BackNextBtn>
        </Section>
      )}

      {step === 3 && (
        <Section title="Consent Attestation (Required)">
          <p className="mb-4 text-slate-700">
            To send SMS to your customer list, we need you to attest to how you collected their consent.
            This is a legal requirement (TCPA) that shifts liability in the event of any dispute.
          </p>
          <label className="mb-3 block">
            <span className="mb-2 block font-semibold">1. How did you obtain consent from your customers?</span>
            <select
              value={form.consentMethod}
              onChange={(e) => setForm({ ...form, consentMethod: e.target.value })}
              className="w-full rounded border border-slate-300 p-3"
            >
              <option value="">-- Select --</option>
              <option value="signed_agreement">Signed service agreement with SMS clause</option>
              <option value="checkbox">Checkbox at point of transaction</option>
              <option value="verbal">Verbal consent with staff notation</option>
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="2. Date range from" type="date" value={form.consentDateFrom} onChange={(v) => setForm({ ...form, consentDateFrom: v })} />
            <Input label="Date range to" type="date" value={form.consentDateTo} onChange={(v) => setForm({ ...form, consentDateTo: v })} />
          </div>
          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <p className="font-semibold">3. I confirm (all required):</p>
            {Object.entries({
              withinYear: "All customers transacted with my business within the last 12 months",
              voluntary: "All customers provided their phone number voluntarily",
              pewc: "I have express written consent to send them SMS communications",
              notEBR: "I understand consent basis is PEWC (Prior Express Written Consent), not EBR",
              indemnify: "I indemnify Review Engine against TCPA violations arising from this list",
            }).map(([key, label]) => (
              <label key={key} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={form.consents[key]}
                  onChange={(e) => setForm({ ...form, consents: { ...form.consents, [key]: e.target.checked } })}
                  className="mt-1"
                />
                <span className="text-slate-700">{label}</span>
              </label>
            ))}
          </div>
          <Input label="Signature (type your full name)" value={form.signature} onChange={(v) => setForm({ ...form, signature: v })} />
          <BackNextBtn onBack={() => setStep(2)} onNext={() => setStep(4)}>Continue</BackNextBtn>
        </Section>
      )}

      {step === 4 && (
        <Section title="Upload Past Customer List">
          <p className="text-slate-700">
            Upload a CSV of your past 12 months of customers (name + phone).
            We&apos;ll drip 2-3 review requests every 20 minutes during business hours, capped at 50/day per your account.
          </p>
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
            <p className="text-slate-500">CSV upload — wire to file storage</p>
            <input type="file" accept=".csv" className="mt-4" />
          </div>
          <p className="text-sm text-slate-600">
            <strong>Or</strong> email your CSV to <code>onboarding@review-engine.co</code> and we&apos;ll upload it for you within 24 hours.
          </p>
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}
          <BackNextBtn onBack={() => setStep(3)} onNext={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Finish Onboarding"}
          </BackNextBtn>
        </Section>
      )}
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, type = "text", help }) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-slate-300 p-3 focus:border-brand focus:outline-none"
      />
      {help && <span className="mt-1 block text-sm text-slate-500">{help}</span>}
    </label>
  );
}

function NextBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg bg-brand-dark px-6 py-3 font-bold text-white transition hover:bg-brand"
    >
      {children}
    </button>
  );
}

function BackNextBtn({ onBack, onNext, children, disabled }) {
  return (
    <div className="flex justify-between">
      <button
        onClick={onBack}
        disabled={disabled}
        className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Back
      </button>
      <button
        onClick={onNext}
        disabled={disabled}
        className="rounded-lg bg-brand-dark px-6 py-3 font-bold text-white hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {children}
      </button>
    </div>
  );
}
