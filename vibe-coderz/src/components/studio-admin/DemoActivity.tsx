"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { nicheDemos } from "@/lib/niche-demos";
import styles from "./dashboard.module.css";

type Demo = {
  id: string; niche: keyof typeof nicheDemos; visitor: { name?: string; business?: string; email?: string; phone?: string; source?: string } | null;
  sample_appointment: { sample_name: string; service: string; preferred_time: string; request_details?: string } | null;
  sample_email_recipient: string | null; email_delivery: string; started_at: string; last_activity_at: string; message_count: number;
  messages?: { id: number; role: string; text: string; created_at: string }[];
};
const date = (value: string) => new Date(value).toLocaleString();

export function DemoActivity() {
  const [items, setItems] = useState<Demo[]>([]), [selected, setSelected] = useState<Demo | null>(null);
  const [niche, setNiche] = useState(""), [search, setSearch] = useState("");
  const [error, setError] = useState(""), [loading, setLoading] = useState(true), [revision, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      const params = new URLSearchParams({ niche, search });
      void fetch(`/api/studio-admin/demo-activity?${params}`, { cache: "no-store", signal: controller.signal })
        .then(async response => { if (response.status === 401) { window.location.assign("/studio-admin/login"); return; } if (!response.ok) throw new Error(); setItems(await response.json()); })
        .catch(() => { if (!controller.signal.aborted) setError("Demo activity could not be loaded."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [niche, search, revision]);
  async function open(id: string) {
    try {
      const response = await fetch(`/api/studio-admin/demo-activity/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setSelected(await response.json());
    } catch { setError("This demo could not be opened."); }
  }
  return <>
    <section className={styles.leadsSection} aria-label="Niche demo interactions">
      <div className={styles.sectionHeading}><div><p className={styles.kicker}>OUTREACH / DEMO ACTIVITY</p><h2>Who tried each demo</h2></div><button className={styles.signOut} onClick={() => refresh(value => value + 1)}>Refresh activity</button></div>
      <p>Visitor-provided business details, generated demo cards and transcripts. Sample customer names are labelled separately. These sessions do not count as real bookings.</p>
      <div className={styles.demoFilters}><label>Niche<select value={niche} onChange={event => setNiche(event.target.value)}><option value="">All niches</option>{Object.entries(nicheDemos).map(([key, demo]) => <option key={key} value={key}>{demo.title}</option>)}</select></label><label>Search<input value={search} maxLength={100} onChange={event => setSearch(event.target.value)} placeholder="Name, business, email or card details" /></label></div>
      {error ? <p role="alert">{error}</p> : loading ? <p>Loading demo activity…</p> : !items.length ? <p>No demo interactions match this view yet.</p> : <div className={styles.tableWrap}><table><thead><tr><th>Visitor / business</th><th>Niche</th><th>Demo card</th><th>Contact provided</th><th>Activity</th><th /></tr></thead><tbody>{items.map(item => <tr key={item.id}>
        <td><strong>{item.visitor?.name || item.visitor?.business || "Anonymous visitor"}</strong><small>{item.visitor?.business || "Business details not shared"}</small></td>
        <td>{nicheDemos[item.niche]?.title || item.niche}</td><td><strong>{item.sample_appointment?.service || "No card generated yet"}</strong><small>{item.sample_appointment ? `Sample customer: ${item.sample_appointment.sample_name}` : `${item.message_count} messages`}</small></td>
        <td>{item.visitor?.email || item.visitor?.phone || (item.sample_email_recipient ? "Sample-email address supplied" : "Not shared")}</td><td>{date(item.last_activity_at)}</td><td><button className={styles.signOut} onClick={() => void open(item.id)}>View demo</button></td>
      </tr>)}</tbody></table></div>}
      <p className={styles.kicker}>LATEST 200 MATCHING SESSIONS · ANONYMOUS VISITORS STAY ANONYMOUS UNTIL THEY SHARE DETAILS</p>
    </section>
    {selected && <div className={styles.drawerBackdrop} onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}><aside className={styles.drawer} aria-label="Niche demo details">
      <header><div><p className={styles.kicker}>{nicheDemos[selected.niche]?.title}</p><h2>{selected.visitor?.name || selected.visitor?.business || "Anonymous visitor"}</h2></div><button onClick={() => setSelected(null)} aria-label="Close demo details"><X /></button></header>
      <div className={styles.leadFacts}><div><span>Business</span><strong>{selected.visitor?.business || "Not shared"}</strong></div><div><span>Visitor contact</span><strong>{selected.visitor?.email || "Email not shared"}<br />{selected.visitor?.phone || "Phone not shared"}</strong></div><div><span>Started</span><strong>{date(selected.started_at)}</strong></div><div><span>Sample email</span><strong>{selected.sample_email_recipient || "Not requested"}<br />{selected.email_delivery.replaceAll("_", " ")}</strong></div></div>
      <section className={styles.summary}><p className={styles.kicker}>SAVED DEMO CARD · NO REAL BOOKING</p>{selected.sample_appointment ? <><p>Sample customer: {selected.sample_appointment.sample_name}</p><p>{selected.sample_appointment.service} · {selected.sample_appointment.preferred_time}</p><p>{selected.sample_appointment.request_details}</p></> : <p>No confirmed demo card was generated.</p>}</section>
      <section className={styles.transcript}><p className={styles.kicker}>TRANSCRIPT · {selected.message_count} MESSAGES</p>{selected.messages?.map(message => <article key={message.id} data-role={message.role}><span>{message.role === "assistant" ? "DEMO RECEPTIONIST" : "VISITOR"}<time>{date(message.created_at)}</time></span><p>{message.text}</p></article>)}</section>
    </aside></div>}
  </>;
}
