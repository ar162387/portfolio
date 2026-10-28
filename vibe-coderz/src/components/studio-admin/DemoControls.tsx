"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";

type DemoState = { allowed: boolean; enabled: boolean; email_ready: boolean; email_sending_enabled: boolean };

export function DemoControls() {
  const [state, setState] = useState<DemoState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/studio-admin/demos", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); setState(await response.json()); })
      .catch(() => { if (!controller.signal.aborted) setError("Demo switch status unavailable. Reload before enabling demos."); });
    return () => controller.abort();
  }, []);
  async function toggle(enabled: boolean) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/studio-admin/demos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "The demo switch could not be changed.");
      setState(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The demo switch could not be changed."); }
    finally { setBusy(false); }
  }
  return <section className={styles.funnelSection} aria-label="Niche demo emergency controls">
    <div className={styles.sectionHeading}><div><p className={styles.kicker}>SAMPLE DEMOS / RELEASE CONTROL</p><h2>{state?.enabled ? "Niche demos are on" : "Niche demos are off"}</h2></div>
      <button className={styles.signOut} disabled={busy} onClick={() => void toggle(false)}>Emergency off: stop all demos</button>
    </div>
    <p>Off stops new niche calls, invalidates earlier demo sessions, ends active demo calls and blocks sample email requests. Your homepage sales assistant keeps running.</p>
    <p>Sample email: {state?.email_ready && state.email_sending_enabled ? "Resend configured and sending approved" : "Sending disabled or awaiting verified Resend sender configuration"}.</p>
    <p><Link href="/garage-doors">Garage doors</Link> · <Link href="/salons">Salons</Link> · <Link href="/heating-plumbing">Heating and plumbing</Link></p>
    {state && !state.enabled && <button className={styles.signOut} disabled={busy || !state.allowed} onClick={() => void toggle(true)}>Enable niche demos</button>}
    {state && !state.allowed && <p>The server release gate is off. The operator must allow demos before enabling them here.</p>}
    {error && <p className={styles.formError} role="alert">{error}</p>}
  </section>;
}
