"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, AudioLines, Check, Download, FileCode2, History, Play, Save, ShieldCheck, Upload, Wrench } from "lucide-react";
import styles from "./playground.module.css";

type Config = {
  schema_version: 1; company_name: string; pronunciation: string; model: string; voice: string;
  accent: string; custom_accent: string; opener: string; conversation_flow: string;
  business_facts: string; delivery_notes: string;
};
type Tool = { name: string; description: string; parameters: unknown };
type State = {
  version: number; draft: Config; published: Config; voices: string[]; models: string[];
  accents: Record<string, string>; tools: Tool[]; booking_enabled: boolean;
  revisions: { id: number; author: string; created_at: string; config: Config }[];
};

async function request(path: string, body?: unknown) {
  const response = await fetch(`/api/studio-admin/${path}`, {
    method: body ? "POST" : "GET", cache: "no-store",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401) { window.location.assign("/studio-admin/login"); throw new Error("Please sign in."); }
  const data = await response.json();
  if (!response.ok) {
    const message = typeof data.detail === "string" ? data.detail : Array.isArray(data.detail)
      ? data.detail.map((item: { msg: string }) => item.msg).join(". ") : data.error;
    throw new Error(message || "The request could not be completed.");
  }
  return data;
}

export function AgentPlayground() {
  const [state, setState] = useState<State | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [prompt, setPrompt] = useState("");
  const [audio, setAudio] = useState("");
  const [transcript, setTranscript] = useState("");
  const audioUrl = useRef("");
  const upload = useRef<HTMLInputElement>(null);

  async function load() {
    setBusy("load"); setError("");
    try { const data = await request("agent"); setState(data); setConfig(data.draft); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(""); }
  }
  useEffect(() => { void load(); return () => { if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); }; }, []);

  function clearPreview() {
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = ""; setAudio(""); setTranscript(""); setPrompt(""); setNotice("");
  }
  function edit(key: keyof Config, value: string) {
    clearPreview(); setConfig((current) => current ? { ...current, [key]: value } : current);
  }
  async function save(publish: boolean) {
    if (!config || !state) return;
    setBusy(publish ? "publish" : "save"); setError(""); setNotice("");
    try {
      const data = await request("agent", { config, version: state.version, publish });
      setState(data); setConfig(data.draft);
      setNotice(publish ? "Published. New conversations will use these settings; existing conversations keep their configuration." : "Draft saved. Visitors still use the published settings.");
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(""); }
  }
  async function preview(kind: "prompt" | "audition") {
    setBusy(kind); setError(""); setNotice("");
    try {
      const data = await request(`agent-${kind}`, { config });
      if (kind === "prompt") setPrompt(data.prompt);
      else {
        if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
        const bytes = Uint8Array.from(atob(data.audio), (char) => char.charCodeAt(0));
        audioUrl.current = URL.createObjectURL(new Blob([bytes], { type: data.mime_type }));
        setAudio(audioUrl.current); setTranscript(data.transcript);
      }
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(""); }
  }
  function exportTemplate() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "receptionist-template.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importTemplate(file?: File) {
    if (!file) return;
    setBusy("import"); setError("");
    try {
      if (file.size > 24_000) throw new Error("Choose a template smaller than 24 KB.");
      const imported = JSON.parse(await file.text());
      // Validate with the same schema used for publication before rendering it.
      const validated = await request("agent-prompt", { config: imported });
      clearPreview(); setConfig(validated.config);
      setNotice("Template loaded into the editor. Save a draft or publish when ready.");
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(""); if (upload.current) upload.current.value = ""; }
  }

  if (!state || !config) return <main className={styles.shell}><a href="/studio-admin">← Back to dashboard</a><h1>Agent playground</h1><p role="status">{error || "Loading your agent…"}</p>{error && <button onClick={() => void load()}>Retry</button>}</main>;
  const differs = JSON.stringify(config) !== JSON.stringify(state.published);
  const unsaved = JSON.stringify(config) !== JSON.stringify(state.draft);
  return <main className={styles.shell}>
    <header className={styles.header}>
      <div><a className={styles.back} href="/studio-admin"><ArrowLeft size={14} /> Conversation dashboard</a><p className={styles.eyebrow}>VOICE STUDIO / CONFIGURATION</p><h1>Make it <em>sound like you.</em></h1><p className={styles.intro}>Shape the voice. Refine the welcome. Keep the booking flow intact.</p></div>
      <div className={styles.live}><span /> Published voice<strong>{state.published.voice} · {state.published.accent}</strong><small>{state.published.model}</small></div>
    </header>
    <div className={styles.toolbar}>
      <span>{unsaved ? "Unsaved edits" : differs ? "Saved draft · unpublished" : "Matches published settings"} <small> / version {state.version}</small></span>
      <div><button disabled={!!busy} onClick={() => void load()}>Reload</button><button disabled={!!busy} onClick={() => void save(false)}><Save size={15} />{busy === "save" ? "Saving…" : "Save draft"}</button><button className={styles.primary} disabled={!!busy || !differs} onClick={() => void save(true)}><Check size={16} />{busy === "publish" ? "Publishing…" : "Publish for new calls"}</button></div>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.layout}>
      <fieldset className={styles.editor} disabled={!!busy}>
        <section className={styles.card}><div className={styles.sectionTitle}><span>01</span><div><h2>Voice & delivery</h2><p>Your voice identity, wherever the conversation goes.</p></div><AudioLines size={23} /></div>
          <div className={styles.grid}>
            <label>Voice<select value={config.voice} onChange={(e) => edit("voice", e.target.value)}>{state.voices.map((voice) => <option key={voice}>{voice}</option>)}</select></label>
            <label>Accent direction<select value={config.accent} onChange={(e) => edit("accent", e.target.value)}>{Object.entries(state.accents).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          </div>
          {config.accent === "custom" && <label>Custom accent direction<input maxLength={500} value={config.custom_accent} onChange={(e) => edit("custom_accent", e.target.value)} placeholder="e.g. a mild, contemporary London English accent" /></label>}
          <label>Delivery notes<textarea maxLength={1000} rows={3} value={config.delivery_notes} onChange={(e) => edit("delivery_notes", e.target.value)} placeholder="Optional: warm and relaxed, with a little space between questions." /></label>
          <label>Live model<select value={config.model} onChange={(e) => edit("model", e.target.value)}>{state.models.map((model) => <option key={model}>{model}</option>)}</select></label>
          <p className={styles.hint}>Sulafat is a warm voice. Cardiff is an accent instruction, not a guaranteed regional recording. Listen before publishing. Only operator-enabled models appear here.</p>
        </section>
        <section className={styles.card}><div className={styles.sectionTitle}><span>02</span><div><h2>Identity & script</h2><p>Reusable variables, with the core rules kept in place.</p></div><FileCode2 size={22} /></div>
          <div className={styles.grid}><label>Spoken business name<input maxLength={100} value={config.company_name} onChange={(e) => edit("company_name", e.target.value)} /></label><label>Pronunciation<input maxLength={100} value={config.pronunciation} onChange={(e) => edit("pronunciation", e.target.value)} /></label></div>
          <label>Opening message<textarea maxLength={1200} rows={4} value={config.opener} onChange={(e) => edit("opener", e.target.value)} /></label>
          <p className={styles.hint}>Variables: <code>{"{{company_name}}"}</code> and <code>{"{{pronunciation}}"}</code>. The welcome is still spoken only once per conversation.</p>
          <label>Conversation flow<textarea maxLength={5000} rows={7} value={config.conversation_flow} onChange={(e) => edit("conversation_flow", e.target.value)} placeholder="Leave empty to keep the existing qualification script. Or describe how to discover needs and invite a consultation." /></label>
          <label>Additional approved business facts<textarea maxLength={5000} rows={5} value={config.business_facts} onChange={(e) => edit("business_facts", e.target.value)} placeholder="Verified facts the agent may use. Do not include passwords or API keys." /></label>
          <p className={styles.hint}>Service scope remains AI voice agents and custom CRM. Booking confirmation, tool handlers, closing behaviour, privacy and interruption handling stay managed by the application.</p>
        </section>
      </fieldset>
      <aside className={styles.sidebar}>
        <section className={`${styles.card} ${styles.audition}`}><p className={styles.eyebrow}>LISTEN BEFORE YOU LAUNCH</p><div className={styles.wave} aria-hidden="true">{[18,34,25,48,65,38,55,78,42,62,31,48,22,35,16].map((height,i) => <i key={i} style={{height}} />)}</div><h2>Try the welcome.</h2><p>Generate the opener with this draft’s Live model, voice and delivery instructions. No microphone needed.</p>
          <button className={styles.primary} disabled={!!busy} onClick={() => void preview("audition")}><Play size={16} />{busy === "audition" ? "Generating voice…" : "Generate audio audition"}</button>
          {audio && <div className={styles.player}><audio controls src={audio} aria-label="Draft voice audition" /><p>{transcript}</p><a href={audio} download="agent-audition.wav">Download audition</a></div>}
          <small>This is an opener audition, not a full call test. No calendar or lead tools are executed. Provider usage applies.</small>
        </section>
        <section className={styles.card}><div className={styles.sectionTitle}><Wrench size={20} /><div><h2>Connected tools</h2><p>{state.tools.length} registered in the live agent</p></div></div>
          {state.tools.map((tool) => <details className={styles.tool} key={tool.name}><summary><span className={styles.dot} />{tool.name}</summary><p>{tool.description}</p><pre>{JSON.stringify(tool.parameters, null, 2)}</pre></details>)}
          {!state.booking_enabled && <p className={styles.error}>Calendar tools are unavailable. Configure the calendar integration on the backend.</p>}
          <p className={styles.hint}>These are the registered capabilities, not a real-time tool activity log. New tools require a backend handler and schema.</p>
        </section>
        <section className={styles.card}><div className={styles.sectionTitle}><ShieldCheck size={20} /><h2>Inspect & reuse</h2></div><button disabled={!!busy} onClick={() => void preview("prompt")}>View assembled prompt</button>
          <div className={styles.actions}><button disabled={!!busy} onClick={exportTemplate}><Download size={14} />Export template</button><button disabled={!!busy} onClick={() => upload.current?.click()}><Upload size={14} />Import</button></div>
          <input ref={upload} hidden type="file" accept=".json,application/json" onChange={(e) => void importTemplate(e.target.files?.[0])} />
          <p className={styles.hint}>Templates contain settings only. Client credentials, calendar integration and database are configured separately.</p>
        </section>
        <section className={styles.card}><div className={styles.sectionTitle}><History size={20} /><h2>Published history</h2></div><p className={styles.hint}>Load a previous version into the editor, audition it, then publish to restore it.</p>
          <div className={styles.history}>{state.revisions.map((revision) => <button key={revision.id} disabled={!!busy} onClick={() => { clearPreview(); setConfig(revision.config); setNotice(`Revision ${revision.id} loaded into the editor. Publish to restore it for new calls.`); }}><strong>Revision {revision.id} · {revision.config.voice}</strong><span>{new Date(revision.created_at).toLocaleString()}</span><small>{revision.author}</small></button>)}</div>
        </section>
      </aside>
    </div>
    {prompt && <section className={styles.card}><div className={styles.sectionTitle}><FileCode2 size={20} /><h2>Assembled prompt</h2><button onClick={() => setPrompt("")}>Close</button></div><p className={styles.hint}>The website’s approved business facts are added at call time. This preview includes your configured additions.</p><pre className={styles.prompt}>{prompt}</pre></section>}
  </main>;
}
