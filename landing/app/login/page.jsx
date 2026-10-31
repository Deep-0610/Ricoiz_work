"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const [email,setEmail]=useState("demo@ricoiz.local");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response=await fetch(`${API_URL}/api/auth/login`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || "Unable to sign in");
      window.location.href="/dashboard";
    } catch(err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-md items-center px-6"><form onSubmit={submit} className="w-full space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><div><p className="text-sm font-semibold uppercase tracking-widest text-brand">Ricoiz</p><h1 className="mt-2 text-3xl font-bold">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Sign in to your demo workspace.</p></div><label className="block text-sm font-medium">Email<input className="mt-1 w-full rounded-lg border p-3" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label className="block text-sm font-medium">Password<input className="mt-1 w-full rounded-lg border p-3" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} /></label>{error&&<p className="text-sm text-red-600">{error}</p>}<button disabled={busy} className="w-full rounded-lg bg-brand-dark px-5 py-3 font-bold text-white disabled:opacity-50">{busy?"Signing in…":"Sign in"}</button><p className="text-xs text-slate-500">Use the demo credentials configured in server/.env. Never use a production password for the demo account.</p></form></main>;
}
