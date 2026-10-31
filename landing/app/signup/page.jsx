"use client";

import { useState } from "react";

const API_URL = "";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", businessName: "", city: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (form.password.length < 12) return setError("Use a password with at least 12 characters.");
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, businessName: form.businessName, city: form.city, password: form.password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create your account.");
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Unable to connect to Ricoiz.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
      <form onSubmit={submit} className="w-full space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <a href="/" className="text-sm font-bold uppercase tracking-widest text-brand">Ricoiz</a>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Create your workspace</h1>
          <p className="mt-2 text-sm text-slate-500">Set up your owner account. Your workspace is private to your business. Connect your review sources after creating your account.</p>
        </div>
        {[
          ["name", "Your full name", "text"],
          ["email", "Work email", "email"],
          ["businessName", "Business name", "text"],
          ["city", "City", "text"],
          ["password", "Password (12+ characters)", "password"],
          ["confirmPassword", "Confirm password", "password"]
        ].map(([key, label, type]) => (
          <label key={key} className="block text-sm font-medium text-slate-700">
            {label}
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-brand"
              type={type}
              value={form[key]}
              onChange={event => update(key, event.target.value)}
              required={key !== "city"}
              minLength={key.includes("password") ? 12 : undefined}
              autoComplete={key === "password" ? "new-password" : key === "confirmPassword" ? "new-password" : key === "email" ? "email" : "name"}
            />
          </label>
        ))}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-brand-dark px-5 py-3 font-bold text-white disabled:opacity-50">
          {busy ? "Creating workspace…" : "Create account"}
        </button>
        <p className="text-center text-sm text-slate-500">Already have an account? <a href="/login" className="font-semibold text-brand underline">Sign in</a></p>
      </form>
    </main>
  );
}
