"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
      const res = await fetch(`${API_URL}/api/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Submission failed. Please review your details and try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (e) {
      setError("We could not reach the onboarding service. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-4 text-3xl font-bold text-slate-900">Your workspace request is in</h1>
          <p className="mb-6 text-lg text-slate-700">
            Our team has received your details. Review sources and messaging workflows will be enabled after access and consent checks are complete.
          </p>
          <p className="text-sm text-slate-500">
            Questions? Email your Ricoiz onboarding contact
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
      <h1 className="mb-8 text-3xl font-bold">Set up your Ricoiz workspace</h1>

      {step === 1 && (
        <Section title="Business details">
          <Input label="Business Name" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Contact first name" value={form.ownerFirstName} onChange={(v) => setForm({ ...form, ownerFirstName: v })} />
            <Input label="Contact last name" value={form.ownerLastName} onChange={(v) => setForm({ ...form, ownerLastName: v })} />
          </div>
          <Input label="Work email" type="email" value={form.ownerEmail} onChange={(v) => setForm({ ...form, ownerEmail: v })} />
          <Input label="Business phone" type="tel" value={form.ownerPhone} onChange={(v) => setForm({ ...form, ownerPhone: v })} help="Used for workspace coordination and support" />
          <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <NextBtn onClick={() => setStep(2)}>Continue</NextBtn>
        </Section>
      )}

      {step === 2 && (
        <Section title="Review platforms">
          <Input label="Google review link" value={form.googleReviewUrl} onChange={(v) => setForm({ ...form, googleReviewUrl: v })} help='Format: https://g.page/r/YOUR-ID/review' />
          <div className="rounded-lg border border-brand bg-brand/5 p-6">
            <h3 className="mb-3 font-bold text-brand-dark">Connect your Google Business Profile</h3>
            <p className="mb-3 text-slate-700">Authorize required account access only through official platform settings. Never share your password.</p>
            <ol className="ml-6 list-decimal space-y-2 text-slate-700">
              <li>Go to business.google.com</li>
              <li>Select your business</li>
              <li>Click <strong>Users</strong> (three-dot menu)</li>
              <li>Click <strong>Add user</strong></li>
              <li>Email: <code className="rounded bg-slate-100 px-2 py-1 text-sm">the authorized Ricoiz team account provided during setup</code></li>
              <li>Role: <strong>Manager</strong></li>
              <li>Click <strong>Invite</strong></li>
            </ol>
            <p className="mt-4 text-sm text-slate-600">
              <strong>Note:</strong> Platform access and review-response features depend on account permissions and verification. No messages are sent until workflows are configured and tested.
            </p>
          </div>
          <BackNextBtn onBack={() => setStep(1)} onNext={() => setStep(3)}>Continue</BackNextBtn>
        </Section>
      )}

      {step === 3 && (
        <Section title="Consent Attestation (Required)">
          <p className="mb-4 text-slate-700">
            To send SMS to your customer list, we need you to attest to how you collected their consent.
            Only include customers with documented permission for the specific messages you plan to send. This form is an operational record, not legal advice.
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
              indemnify: "I confirm these records are accurate and I am authorized to submit them for review",
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
        <Section title="Customer list and consent">
          <p className="text-slate-700">
            Provide customer records only if you have the required permission for the intended SMS communications. Sending limits and timing must be reviewed and configured before any campaign is activated.
          </p>
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
            <p className="text-slate-500">CSV selection only — secure upload must be configured before data is transmitted</p>
            <input type="file" accept=".csv" className="mt-4" />
          </div>
          <p className="text-sm text-slate-600">
            <strong>Or</strong> share your CSV only through a secure, approved upload method after it is configured.
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
