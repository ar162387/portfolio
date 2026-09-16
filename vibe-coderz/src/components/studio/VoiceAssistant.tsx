"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Keyboard, Mic, MicOff, PhoneOff, Send, Volume2, VolumeX, X } from "lucide-react";
import type { PipecatClient } from "@pipecat-ai/client-js";
import styles from "./voice-assistant.module.css";

type Status = "idle" | "connecting" | "listening" | "speaking" | "ended" | "error";
type Mode = "talk" | "hold" | "text";
type Message = { id: number; role: "user" | "assistant"; text: string; spoken: number; time: string };
const labels: Record<Status, string> = {
  idle: "A conversation starts here", connecting: "Connecting…", listening: "Listening to you",
  speaking: "Your assistant is speaking", ended: "Conversation ended", error: "Let’s try that again",
};
const VOICE_IDLE_MS = 60_000;
const VOICE_SESSION_MS = 300_000;
const FAREWELL_TEXT = "Let me know if you want to discuss anything else. Thanks for visiting Vibecoderzz.";

function isSuccessfulBookingResult(value: unknown): boolean {
  if (typeof value === "string") {
    try { return isSuccessfulBookingResult(JSON.parse(value)); } catch { return false; }
  }
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  if (result.status === "success" && typeof result.booking_uid === "string" && result.booking_uid) return true;
  return "result" in result && isSuccessfulBookingResult(result.result);
}

export function VoiceAssistant({ email }: { email: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const client = useRef<PipecatClient | null>(null);
  const cleanup = useRef<(() => Promise<void>) | null>(null);
  const closing = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const messageId = useRef(0);
  const replyId = useRef<number | null>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const wantedMic = useRef(false);
  const modeRef = useRef<Mode>("talk");
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shutdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoClosing = useRef(false);
  const farewellPlayed = useRef(false);
  const bookingComplete = useRef(false);
  const bookingConfirmationStarted = useRef(false);
  const [mode, setMode] = useState<Mode>("talk");
  const [status, setStatus] = useState<Status>("idle");
  const [muted, setMuted] = useState(false);
  const [holding, setHolding] = useState(false);
  const [sound, setSound] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [interim, setInterim] = useState("");
  const [speechPending, setSpeechPending] = useState<"listening" | "transcribing" | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [needsPlayback, setNeedsPlayback] = useState(false);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState("");
  const active = status === "listening" || status === "speaking";

  function clearVoiceTimers() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    if (shutdownTimer.current) clearTimeout(shutdownTimer.current);
    idleTimer.current = null; sessionTimer.current = null; shutdownTimer.current = null;
  }

  async function requestFarewell() {
    if (autoClosing.current || farewellPlayed.current) return;
    autoClosing.current = true;
    farewellPlayed.current = true;
    clearVoiceTimers();
    setStatus("speaking");
    setMessages((previous) => [...previous, {
      id: ++messageId.current,
      role: "assistant",
      text: FAREWELL_TEXT,
      spoken: FAREWELL_TEXT.length,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    shutdownTimer.current = setTimeout(() => { void end(); }, 12_000);
    const farewellAudio = audio.current;
    if (!farewellAudio) { await end(); return; }
    farewellAudio.srcObject = null;
    farewellAudio.src = "/audio/session-farewell.wav";
    farewellAudio.currentTime = 0;
    const finish = () => {
      farewellAudio.onended = null; farewellAudio.onerror = null;
      void end();
    };
    farewellAudio.onended = finish; farewellAudio.onerror = finish;
    try {
      await farewellAudio.play();
    } catch {
      finish();
    }
  }

  function armIdleTimer() {
    if (autoClosing.current) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => { void requestFarewell(); }, VOICE_IDLE_MS);
  }

  function mic(enabled: boolean) {
    wantedMic.current = enabled;
    const track = client.current?.tracks().local.audio;
    if (track) track.enabled = enabled;
    client.current?.enableMic(enabled);
    setMuted(!enabled);
  }

  async function release() {
    clearVoiceTimers(); autoClosing.current = false;
    bookingComplete.current = false; bookingConfirmationStarted.current = false;
    generation.current += 1;
    wantedMic.current = false;
    const current = client.current;
    client.current = null;
    const dispose = cleanup.current;
    cleanup.current = null;
    current?.tracks().local.audio?.stop();
    if (audio.current) {
      audio.current.pause();
      audio.current.onended = null; audio.current.onerror = null;
      audio.current.srcObject = null;
      audio.current.removeAttribute("src");
      audio.current.load();
    }
    if (dispose) closing.current = dispose();
    await closing.current;
  }

  async function end() {
    setStatus("ended"); setInterim(""); setSpeechPending(null); setHolding(false); setMuted(false); setNeedsPlayback(false);
    await release();
  }

  useEffect(() => {
    const pauseHold = () => {
      if (modeRef.current !== "hold") return;
      wantedMic.current = false;
      const current = client.current;
      const track = current?.tracks().local.audio;
      if (track) track.enabled = false;
      current?.enableMic(false);
      setHolding(false); setMuted(true);
    };
    window.addEventListener("blur", pauseHold);
    document.addEventListener("visibilitychange", pauseHold);
    return () => {
      window.removeEventListener("blur", pauseHold);
      document.removeEventListener("visibilitychange", pauseHold);
      generation.current += 1;
      const current = client.current;
      current?.tracks().local.audio?.stop();
      void cleanup.current?.();
    };
  }, []);

  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "instant" });
  }, [messages, interim]);

  function appendUser(text: string, mergeSpeech = false) {
    const id = ++messageId.current;
    setMessages((previous) => {
      const last = previous.at(-1);
      if (mergeSpeech && last?.role === "user") {
        const separator = /^[.,!?;:]/.test(text) || /\s$/.test(last.text) || /^\s/.test(text) ? "" : " ";
        return [...previous.slice(0, -1), { ...last, text: last.text + separator + text }];
      }
      return [...previous, {
      id, role: "user", text, spoken: text.length,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }];
    });
  }

  async function send(pc: PipecatClient, text: string) {
    await pc.sendText(text, { run_immediately: true, audio_response: true });
    appendUser(text);
  }

  async function start(startMode: Mode = modeRef.current, firstText?: string) {
    if (client.current || status === "connecting") return;
    const attempt = ++generation.current;
    const isCurrent = () => generation.current === attempt;
    modeRef.current = startMode; setMode(startMode);
    wantedMic.current = startMode === "talk";
    setStatus("connecting"); setError(""); setMessages([]); setInterim(""); setSpeechPending(null);
    setMuted(startMode !== "talk"); setHolding(false); setNeedsPlayback(false);
    replyId.current = null;
    autoClosing.current = false; farewellPlayed.current = false; bookingComplete.current = false;
    bookingConfirmationStarted.current = false; clearVoiceTimers();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let connected = false;
    try {
      await closing.current;
      if (!isCurrent()) return;
      if (!window.isSecureContext) throw new Error("Voice needs HTTPS or localhost.");
      const health = await fetch("/api/voice", { signal: AbortSignal.timeout(6000), cache: "no-store" });
      if (!health.ok) throw new Error("Voice unavailable");
      const voiceConfig = await health.json() as { iceServers?: RTCIceServer[] };
      const [{ PipecatClient }, { SmallWebRTCTransport }, { default: Daily }] = await Promise.all([
        import("@pipecat-ai/client-js"), import("@pipecat-ai/small-webrtc-transport"), import("@daily-co/daily-js"),
      ]);
      if (!isCurrent()) return;
      const pc = new PipecatClient({
        transport: new SmallWebRTCTransport({ iceServers: voiceConfig.iceServers || [] }),
        enableMic: startMode !== "text", enableCam: false,
        callbacks: {
          onBotReady: () => {
            if (!isCurrent()) return;
            connected = true; clearTimeout(timeout); setStatus("listening");
            sessionTimer.current = setTimeout(() => { void requestFarewell(); }, VOICE_SESSION_MS);
            if (startMode !== "talk") mic(false);
          },
          onBotStartedSpeaking: () => {
            if (!isCurrent()) return;
            if (idleTimer.current) clearTimeout(idleTimer.current);
            idleTimer.current = null;
            if (bookingComplete.current) bookingConfirmationStarted.current = true;
            setStatus("speaking");
          },
          onBotStoppedSpeaking: () => {
            if (!isCurrent()) return;
            setStatus("listening");
            if (bookingComplete.current) {
              if (bookingConfirmationStarted.current) {
                clearVoiceTimers();
                shutdownTimer.current = setTimeout(() => { void end(); }, 600);
              }
              return;
            }
            if (autoClosing.current) {
              if (shutdownTimer.current) clearTimeout(shutdownTimer.current);
              shutdownTimer.current = setTimeout(() => { void end(); }, 900);
            } else armIdleTimer();
          },
          onUserStartedSpeaking: () => {
            if (!isCurrent()) return;
            if (idleTimer.current) clearTimeout(idleTimer.current);
            idleTimer.current = null;
            setSpeechPending("listening");
          },
          onUserStoppedSpeaking: () => {
            if (!isCurrent()) return;
            setSpeechPending("transcribing");
          },
          onBotLlmStarted: () => { if (isCurrent()) replyId.current = null; },
          // Model text arrives first. Playback-aligned TTS events advance the highlight.
          onBotLlmText: (data) => {
            if (!isCurrent() || !data.text) return;
            if (bookingComplete.current) bookingConfirmationStarted.current = true;
            const id = replyId.current ?? ++messageId.current;
            replyId.current = id;
            const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            setMessages((previous) => previous.some((m) => m.id === id)
              ? previous.map((m) => m.id === id ? { ...m, text: m.text + data.text } : m)
              : [...previous, { id, role: "assistant", text: data.text, spoken: 0, time }]);
          },
          onBotTtsText: (data) => {
            if (!isCurrent() || !data.text) return;
            const id = replyId.current;
            setMessages((previous) => previous.map((m) => m.id === id
              ? { ...m, spoken: Math.min(m.text.length, m.spoken + data.text.length) } : m));
          },
          onLLMFunctionCallStopped: (data) => {
            if (!isCurrent() || data.function_name !== "create_appointment" || data.cancelled) return;
            if (!isSuccessfulBookingResult(data.result)) return;
            bookingComplete.current = true; bookingConfirmationStarted.current = false;
            clearVoiceTimers();
            // If Gemini fails to deliver its confirmation turn, still release the call.
            shutdownTimer.current = setTimeout(() => { void end(); }, 30_000);
          },
          onDisconnected: () => {
            if (!isCurrent()) return;
            clearTimeout(timeout);
            if (connected) void end();
            else { setError("The conversation couldn’t start. Please try again or email the studio."); setStatus("error"); void release(); }
          },
          onError: () => {
            if (!isCurrent()) return;
            clearTimeout(timeout); setError("The connection was interrupted. Start a new conversation or email us.");
            setStatus("error"); void release();
          },
          onDeviceError: () => {
            if (!isCurrent()) return;
            wantedMic.current = false; setMuted(true); setHolding(false);
            modeRef.current = "text"; setMode("text");
            setError("Microphone access is unavailable. You can type instead, or allow microphone access in your browser.");
          },
          onAvailableMicsUpdated: (devices) => { if (isCurrent()) setMics(devices); },
          onMicUpdated: (device) => {
            if (!isCurrent()) return;
            setSelectedMic(device.deviceId);
            const track = client.current?.tracks().local.audio;
            if (track) track.enabled = wantedMic.current;
          },
          onTrackStarted: (track, participant) => {
            if (!isCurrent()) return;
            if (participant?.local) { if (track.kind === "audio") track.enabled = wantedMic.current; return; }
            // SmallWebRTC omits participant metadata for remote tracks.
            if (track.kind === "audio" && audio.current) {
              audio.current.srcObject = new MediaStream([track]);
              void audio.current.play().catch(() => { if (isCurrent()) setNeedsPlayback(true); });
            }
          },
          onUserTranscript: (data) => {
            if (!isCurrent()) return;
            if (data.final) {
              if (data.text.trim()) appendUser(data.text, true);
              setInterim(""); setSpeechPending(null);
            } else {
              setInterim(data.text); setSpeechPending("transcribing");
            }
          },
        },
      });
      client.current = pc;
      // SmallWebRTC's default media manager leaves its Daily call object alive.
      // Destroy this specific instance so stale listeners cannot affect the next call.
      const callObject = Daily.getCallInstance();
      cleanup.current = async () => {
        await pc.disconnect().catch(() => {});
        await callObject?.destroy().catch(() => {});
      };
      timeout = setTimeout(() => {
        if (!isCurrent()) return;
        setError("We couldn’t connect in time. Check your connection and try again.");
        setStatus("error"); void release();
      }, 30000);
      await pc.connect({ webrtcRequestParams: { endpoint: "/api/voice", requestData: {
        greet: !firstText,
        channel: startMode === "talk" ? "voice" : startMode === "hold" ? "push_to_talk" : "text",
      } } });
      if (!isCurrent()) return;
      if (firstText) { await send(pc, firstText); setDraft(""); }
    } catch (cause) {
      if (!isCurrent()) return;
      clearTimeout(timeout);
      setError(cause instanceof Error && cause.name === "NotAllowedError"
        ? "Microphone access was declined. Choose Type to chat without a microphone, or allow access in your browser."
        : "Our assistant couldn’t connect. Please try again or email the studio.");
      setStatus("error"); await release();
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || status === "connecting") return;
    setSending(true); setError("");
    try {
      if (client.current && active) { await send(client.current, text); setDraft(""); }
      else await start("text", text);
    } catch { setError("Your message couldn’t be sent. Please try again."); }
    finally { setSending(false); }
  }

  function switchMode(next: Mode) {
    modeRef.current = next; setMode(next); setHolding(false); setError("");
    if (active) mic(next === "talk");
  }

  function hold(down: boolean) {
    if (!active || modeRef.current !== "hold") return;
    setHolding(down); mic(down);
  }

  function close() { void end(); dialog.current?.close(); }
  const statusLabel = status === "listening"
    ? mode === "text" ? "Ready for your message" : mode === "hold" && !holding ? "Hold the button to speak" : muted ? "Microphone muted" : labels[status]
    : labels[status];

  return (
    <>
      <button className={styles.launcher} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        <span className={styles.launcherIcon}><Mic size={19} aria-hidden="true" /></span>
        <span>Talk to the studio <small>Voice & chat · AI assistant</small></span><ArrowUpRight size={18} aria-hidden="true" />
      </button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="voice-title" onCancel={(event) => { event.preventDefault(); close(); }}>
        <header className={styles.header}><span className={styles.eyebrow}>VIBECODERZZ / YOUR STUDIO ASSISTANT</span><button onClick={close} className={styles.iconButton} aria-label="Close and end conversation"><X size={20} /></button></header>
        <div className={styles.intro} data-compact={messages.length > 0 || active}>
          <div className={`${styles.orb} ${status === "speaking" || (active && !muted) ? styles.live : ""}`} aria-hidden="true"><Mic size={29} /></div>
          <h2 id="voice-title">Good ideas start<br />with a conversation.</h2>
          {!messages.length && <p>Talk or type. Explore services, ask questions, and find your next step with our AI assistant.</p>}
        </div>
        <div className={styles.modes} role="group" aria-label="Conversation input">
          <button aria-pressed={mode === "talk"} disabled={status === "connecting"} onClick={() => switchMode("talk")}><Mic size={15} /> Open mic</button>
          <button aria-pressed={mode === "hold"} disabled={status === "connecting"} onClick={() => switchMode("hold")}><MicOff size={15} /> Push to talk</button>
          <button aria-pressed={mode === "text"} disabled={status === "connecting"} onClick={() => switchMode("text")}><Keyboard size={15} /> Type</button>
        </div>
        <div className={styles.status} role="status"><span data-active={active} />{statusLabel}<button className={styles.sound} aria-label={sound ? "Mute assistant audio" : "Enable assistant audio"} aria-pressed={!sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={15} /> : <VolumeX size={15} />}</button></div>
        <div className={styles.transcript} ref={transcript} role="log" aria-label="Conversation transcript" aria-live="polite" aria-relevant="additions text">
          {!messages.length && !interim ? <div className={styles.empty}><span>ROOM FOR YOUR NEXT IDEA</span><p>“Could AI help with my customer enquiries?”</p><p>“I’m looking to build a website.”</p></div> : messages.map((message) => <div className={styles.message} data-role={message.role} key={message.id}><span>{message.role === "user" ? "YOU" : "STUDIO ASSISTANT"}<time>{message.time}</time></span><p>{message.role === "assistant" ? <><span className={styles.spoken}>{message.text.slice(0, message.spoken)}</span><span className={styles.pending}>{message.text.slice(message.spoken)}</span></> : message.text}</p></div>)}
          {(interim || speechPending) && <div className={styles.message} data-role="user"><span>YOU · {speechPending === "transcribing" ? "TRANSCRIBING" : "SPEAKING"}</span><p>{interim || (speechPending === "transcribing" ? "Transcribing…" : "Listening…")}</p></div>}
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {needsPlayback && <button className={styles.playback} onClick={() => { void audio.current?.play().then(() => setNeedsPlayback(false)).catch(() => {}); }}><Volume2 size={16} /> Tap to hear the assistant</button>}
        <form className={styles.composer} onSubmit={submit}><label className={styles.srOnly} htmlFor="studio-message">Your message</label><input id="studio-message" value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message…" autoComplete="off" /><button aria-label="Send message" disabled={!draft.trim() || sending || status === "connecting"} type="submit"><Send size={18} /></button></form>
        {mode !== "text" && active && <div className={styles.devices}><label htmlFor="studio-mic">Microphone</label><select id="studio-mic" value={selectedMic} onChange={(event) => { setSelectedMic(event.target.value); client.current?.updateMic(event.target.value); }}><option value="">System default</option>{mics.filter((device) => device.deviceId).map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Microphone"}</option>)}</select></div>}
        <div className={styles.controls}>
          {active ? <>{mode === "talk" && <button className={styles.mute} aria-pressed={muted} onClick={() => mic(muted)}>{muted ? <MicOff size={18} /> : <Mic size={18} />}{muted ? "Unmute mic" : "Mute mic"}</button>}{mode === "hold" && <button className={styles.hold} aria-pressed={holding} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); hold(true); }} onPointerUp={() => hold(false)} onPointerCancel={() => hold(false)} onLostPointerCapture={() => hold(false)} onBlur={() => hold(false)} onKeyDown={(event) => { if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); hold(true); } }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); hold(false); } }}><Mic size={18} />{holding ? "Listening…" : "Hold to talk"}</button>}<button className={styles.end} onClick={() => void end()}><PhoneOff size={18} /> End</button></> : status === "connecting" ? <button className={styles.start} onClick={() => void end()}>Connecting… Cancel</button> : <button className={styles.start} onClick={() => void start()}>{mode === "text" ? <Keyboard size={18} /> : <Mic size={18} />}{mode === "text" ? "Start conversation" : "Start talking"}<ArrowUpRight size={18} /></button>}
        </div>
        <footer className={styles.footer}><p>Starting shares your messages and enabled microphone audio with Google Gemini. We save text transcripts and lead progress for studio follow-up, but never raw audio. If you book, confirmed contact and appointment details are sent to Cal.com.</p><a href={`mailto:${email}`}>Prefer email? Talk to a person <ArrowUpRight size={12} /></a></footer>
        <audio ref={audio} autoPlay playsInline muted={!sound} />
      </dialog>
    </>
  );
}
