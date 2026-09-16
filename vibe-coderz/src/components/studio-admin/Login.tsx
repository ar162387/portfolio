"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import styles from "./dashboard.module.css";

export function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/studio-admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
    }).catch(() => null);
    if (response?.ok) { window.location.assign("/studio-admin"); return; }
    const payload = await response?.json().catch(() => null);
    setError(payload?.detail || payload?.error || "Those sign-in details were not accepted.");
    setBusy(false);
  }

  return <main className={styles.loginShell}>
    <section className={styles.loginCard}>
      <div className={styles.lock}><LockKeyhole size={22} /></div>
      <p className={styles.kicker}>VIBECODERZZ / PRIVATE STUDIO</p>
      <h1>See every conversation<br />move toward a <em>yes.</em></h1>
      <p className={styles.loginCopy}>Sign in to review transcripts, qualified leads, and booked consultations.</p>
      <form onSubmit={submit} className={styles.loginForm}>
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className={styles.formError} role="alert">{error}</p>}
        <button disabled={busy}>{busy ? "Signing in…" : "Open dashboard"}<ArrowRight size={17} /></button>
      </form>
    </section>
  </main>;
}
