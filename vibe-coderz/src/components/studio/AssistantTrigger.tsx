"use client";

import { ArrowUpRight, AudioLines } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { trackEvent } from "./Analytics";

export const openAssistantEvent = "studio:open-assistant";

export function AssistantTrigger() {
  const [state, setState] = useState<"ready" | "checking" | "offline">("ready");
  async function open() {
    setState("checking");
    try {
      const response = await fetch("/api/voice", { signal: AbortSignal.timeout(10_000), cache: "no-store" });
      if (!response.ok || !(await response.json()).available) throw new Error("unavailable");
      setState("ready");
      trackEvent("studio_assistant_open", { source: "demo_section" });
      window.dispatchEvent(new Event(openAssistantEvent));
    } catch { setState("offline"); }
  }
  return <div className="assistant-invite-action">{state === "offline" ? <><p role="status">The studio assistant is unavailable right now. We can still walk through a demo with you.</p><Link className="button orange-button" href="/contact">Request a walkthrough <ArrowUpRight size={18} /></Link><button className="text-link assistant-retry" type="button" onClick={open}>Try the assistant again</button></> : <button type="button" className="button orange-button" aria-haspopup="dialog" disabled={state === "checking"} aria-busy={state === "checking"} onClick={open}><AudioLines size={18} /> {state === "checking" ? "Checking the connection…" : "Try our studio assistant"} <ArrowUpRight size={18} /></button>}</div>;
}
