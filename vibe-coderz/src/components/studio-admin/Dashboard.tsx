"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarCheck, LogOut, MessageSquareText, Search, Target, Users, X } from "lucide-react";
import styles from "./dashboard.module.css";

type Metrics = {
  total_conversations: number; qualified_leads: number; booked_consultations: number;
  qualification_rate: number; booking_rate: number; stages: Record<string, number>;
};
type Message = { id: number; role: "user" | "assistant"; text: string; created_at: string };
type Conversation = {
  id: string; channel: string; status: string; lead_stage: string; progress_score: number;
  qualified: boolean; offer_interest: string | null; company_type: string | null;
  need_summary: string | null; inquiry_volume: string | null; qualification_reason: string | null;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null;
  visitor_timezone: string | null; appointment_start: string | null; booking_uid: string | null;
  meeting_url: string | null; message_count: number; user_turns: number; started_at: string;
  last_activity_at: string; ended_at: string | null; messages?: Message[];
};

const stageLabels: Record<string, string> = {
  new: "New", engaged: "Engaged", discovery: "Discovery", qualified: "Qualified",
  consultation_offered: "Consultation offered", booking_started: "Booking started", booked: "Booked",
};
const stageOrder = Object.keys(stageLabels);

function displayInterest(value: string | null) {
  return value ? value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()) : "Not clear yet";
}
function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [stage, setStage] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams();
    if (stage) params.set("stage", stage);
    if (query.trim()) params.set("search", query.trim());
    const [metricResponse, listResponse] = await Promise.all([
      fetch("/api/studio-admin/metrics", { cache: "no-store" }),
      fetch(`/api/studio-admin/conversations?${params}`, { cache: "no-store" }),
    ]).catch(() => [null, null] as const);
    if (metricResponse?.status === 401 || listResponse?.status === 401) {
      window.location.assign("/studio-admin/login"); return;
    }
    if (!metricResponse?.ok || !listResponse?.ok) {
      setError("The lead dashboard could not be loaded."); setLoading(false); return;
    }
    setMetrics(await metricResponse.json()); setItems(await listResponse.json()); setLoading(false);
  }, [query, stage]);

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 200); return () => clearTimeout(timer); }, [load]);

  async function openConversation(id: string) {
    const response = await fetch(`/api/studio-admin/conversations/${id}`, { cache: "no-store" });
    if (response.status === 401) { window.location.assign("/studio-admin/login"); return; }
    if (response.ok) setSelected(await response.json());
  }

  async function signOut() {
    await fetch("/api/studio-admin/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    window.location.assign("/studio-admin/login");
  }

  const funnelMax = useMemo(() => Math.max(1, ...(metrics ? stageOrder.map((key) => metrics.stages[key] || 0) : [1])), [metrics]);

  return <main className={styles.dashboardShell}>
    <header className={styles.dashboardHeader}>
      <div><p className={styles.kicker}>VIBECODERZZ / LEAD INTELLIGENCE</p><h1>Conversation <em>pipeline.</em></h1></div>
      <button className={styles.signOut} onClick={signOut}><LogOut size={16} /> Sign out</button>
    </header>

    <section className={styles.metrics} aria-label="Lead performance">
      <article><MessageSquareText /><span>Conversations</span><strong>{metrics?.total_conversations ?? "—"}</strong><small>Every voice and chat session</small></article>
      <article><Target /><span>Qualified leads</span><strong>{metrics?.qualified_leads ?? "—"}</strong><small>{metrics?.qualification_rate ?? 0}% of conversations</small></article>
      <article><CalendarCheck /><span>Consultations booked</span><strong>{metrics?.booked_consultations ?? "—"}</strong><small>{metrics?.booking_rate ?? 0}% booking rate</small></article>
      <article><Users /><span>Open opportunities</span><strong>{items.filter((item) => item.qualified && item.status !== "booked").length}</strong><small>Qualified and awaiting booking</small></article>
    </section>

    <section className={styles.funnelSection}>
      <div className={styles.sectionHeading}><div><p className={styles.kicker}>CONVERSION JOURNEY</p><h2>Where conversations are landing</h2></div></div>
      <div className={styles.funnel}>
        {stageOrder.map((key) => <button key={key} onClick={() => setStage(stage === key ? "" : key)} data-active={stage === key}>
          <span>{stageLabels[key]}</span><strong>{metrics?.stages[key] ?? 0}</strong>
          <i style={{ width: `${Math.max(4, ((metrics?.stages[key] || 0) / funnelMax) * 100)}%` }} />
        </button>)}
      </div>
    </section>

    <section className={styles.leadsSection}>
      <div className={styles.sectionHeading}><div><p className={styles.kicker}>LIVE LEAD RECORD</p><h2>Conversations and intent</h2></div>
        <label className={styles.search}><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads or needs" /></label>
      </div>
      {stage && <button className={styles.filter} onClick={() => setStage("")}>{stageLabels[stage]} <X size={13} /></button>}
      {error ? <p className={styles.emptyState}>{error}</p> : loading ? <p className={styles.emptyState}>Loading conversations…</p> : !items.length ? <p className={styles.emptyState}>No conversations match this view yet.</p> :
        <div className={styles.tableWrap}><table><thead><tr><th>Visitor</th><th>Need</th><th>Stage</th><th>Progress</th><th>Last activity</th><th /></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id} onClick={() => openConversation(item.id)}>
            <td><strong>{item.contact_name || item.company_type || "Anonymous visitor"}</strong><small>{item.contact_email || `${item.channel.replaceAll("_", " ")} conversation`}</small></td>
            <td><strong>{displayInterest(item.offer_interest)}</strong><small>{item.need_summary || "Discovery has not started"}</small></td>
            <td><span className={styles.stage} data-stage={item.lead_stage}>{stageLabels[item.lead_stage] || item.lead_stage}</span></td>
            <td><div className={styles.progress}><i style={{ width: `${item.progress_score}%` }} /></div><small>{item.progress_score}%</small></td>
            <td>{formatDate(item.last_activity_at)}</td><td><ArrowRight size={16} /></td>
          </tr>)}</tbody></table></div>}
    </section>

    {selected && <div className={styles.drawerBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <aside className={styles.drawer} aria-label="Conversation details">
        <header><div><p className={styles.kicker}>{stageLabels[selected.lead_stage]?.toUpperCase()}</p><h2>{selected.contact_name || selected.company_type || "Anonymous visitor"}</h2></div><button onClick={() => setSelected(null)} aria-label="Close details"><X /></button></header>
        <div className={styles.leadFacts}>
          <div><span>Interest</span><strong>{displayInterest(selected.offer_interest)}</strong></div>
          <div><span>Contact</span><strong>{selected.contact_email || "Not collected"}</strong></div>
          <div><span>Volume</span><strong>{selected.inquiry_volume || "Not discussed"}</strong></div>
          <div><span>Appointment</span><strong>{formatDate(selected.appointment_start)}</strong></div>
        </div>
        <section className={styles.summary}><p className={styles.kicker}>LEAD SUMMARY</p><p>{selected.need_summary || "No business need was captured."}</p>{selected.qualification_reason && <small>{selected.qualification_reason}</small>}</section>
        <section className={styles.transcript}><p className={styles.kicker}>TRANSCRIPT · {selected.message_count} MESSAGES</p>
          {selected.messages?.map((message) => <article key={message.id} data-role={message.role}><span>{message.role === "assistant" ? "STUDIO ASSISTANT" : "VISITOR"}<time>{formatDate(message.created_at)}</time></span><p>{message.text}</p></article>)}
        </section>
      </aside>
    </div>}
  </main>;
}
