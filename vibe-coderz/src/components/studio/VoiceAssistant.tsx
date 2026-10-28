"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Mic, MicOff, PhoneOff, Send, Volume2, VolumeX, X } from "lucide-react";
import type { PipecatClient } from "@pipecat-ai/client-js";
import styles from "./voice-assistant.module.css";
import { boundedCleanup, VoiceSessionWatchdog, waitUntilOnline } from "@/lib/voice-session-watchdog";
import type { NicheKey } from "@/lib/niche-demos";

type Status = "idle" | "connecting" | "listening" | "processing" | "responding" | "recovering" | "speaking" | "ended" | "error";
type Mode = "talk" | "hold";
type Message = { id: number; role: "user" | "assistant"; text: string; spoken: number; time: string; interrupted?: boolean };
const labels: Record<Status, string> = {
  idle: "A conversation starts here", connecting: "Connecting…", listening: "Listening to you",
  processing: "Working on your reply…", recovering: "Restoring the conversation…",
  responding: "Writing your reply…",
  speaking: "Your representative is speaking", ended: "Conversation ended", error: "Let’s try that again",
};
const VOICE_IDLE_MS = 60_000;
const VOICE_SESSION_MS = 14 * 60_000;
const farewellText = (reason: "inactivity_timeout" | "session_limit") => reason === "session_limit"
  ? "This call has reached its 14-minute limit. Start a new conversation to continue."
  : "I haven't heard anything for a minute, so I'll end this call. You can start another conversation anytime.";

function isSuccessfulBookingResult(value: unknown): boolean {
  if (typeof value === "string") {
    try { return isSuccessfulBookingResult(JSON.parse(value)); } catch { return false; }
  }
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  if (result.status === "success" && typeof result.booking_uid === "string" && result.booking_uid) return true;
  return "result" in result && isSuccessfulBookingResult(result.result);
}

type StatsTransport = { peerConnection: () => RTCPeerConnection | undefined };

async function collectConnectionStats(transport: StatsTransport) {
  const pc = transport.peerConnection();
  if (!pc) return null;
  const reports = await pc.getStats();
  let pair: RTCStats | undefined;
  let packetsLost = 0;
  let jitterMs = 0;
  reports.forEach((report) => {
    const item = report as RTCStats & Record<string, unknown>;
    if (item.type === "candidate-pair" && item.state === "succeeded" && (item.nominated || !pair)) pair = item;
    if (item.type === "inbound-rtp" && item.kind === "audio") {
      packetsLost += typeof item.packetsLost === "number" ? item.packetsLost : 0;
      jitterMs = Math.max(jitterMs, typeof item.jitter === "number" ? item.jitter * 1000 : 0);
    }
  });
  const selected = pair as (RTCStats & Record<string, unknown>) | undefined;
  const local = selected?.localCandidateId ? reports.get(String(selected.localCandidateId)) as RTCStats & Record<string, unknown> : undefined;
  const remote = selected?.remoteCandidateId ? reports.get(String(selected.remoteCandidateId)) as RTCStats & Record<string, unknown> : undefined;
  const protocol = String(local?.relayProtocol || local?.protocol || "unknown").toLowerCase();
  return {
    connectionState: pc.connectionState,
    iceTransport: ["udp", "tcp", "tls"].includes(protocol) ? protocol : "unknown",
    localCandidateType: String(local?.candidateType || "unknown"),
    remoteCandidateType: String(remote?.candidateType || "unknown"),
    roundTripMs: typeof selected?.currentRoundTripTime === "number" ? selected.currentRoundTripTime * 1000 : null,
    packetsLost,
    jitterMs,
  };
}

export function VoiceAssistant({ niche, inline = false }: { niche?: NicheKey; inline?: boolean } = {}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const open = () => { if (!dialog.current?.open) dialog.current?.showModal(); };
    window.addEventListener("studio:open-assistant", open);
    return () => window.removeEventListener("studio:open-assistant", open);
  }, []);
  const audio = useRef<HTMLAudioElement>(null);
  const client = useRef<PipecatClient | null>(null);
  const cleanup = useRef<(() => Promise<void>) | null>(null);
  const closing = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const messageId = useRef(0);
  const replyId = useRef<number | null>(null);
  const assistantTurnId = useRef("");
  const assistantTurnText = useRef("");
  const typedTurn = useRef<{ id: string; text: string; appended: boolean } | null>(null);
  const lastUserWasTyped = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const wantedMic = useRef(false);
  const modeRef = useRef<Mode>("talk");
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionWarningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shutdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationId = useRef("");
  const sessionToken = useRef("");
  const sessionIceServers = useRef<RTCIceServer[]>([]);
  const voiceRecoveryAttempt = useRef(0);
  const voiceRecoveryInProgress = useRef(false);
  const openingPending = useRef(true);
  const startInProgress = useRef(false);
  const responseWatchdog = useRef<VoiceSessionWatchdog | null>(null);
  const networkCleanup = useRef<(() => void) | null>(null);
  const assistantSpeaking = useRef(false);
  const assistantGenerated = useRef(false);
  const assistantPlaybackFinished = useRef(false);
  const recoveryMic = useRef<boolean | null>(null);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRequests = useRef(new Set<AbortController>());
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
  const [sampleEmail, setSampleEmail] = useState<{ subject: string; text: string; delivery: string; sending_available?: boolean } | null>(null);
  const [email, setEmail] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  // Keep the completed demo credentials for its one email after End releases audio.
  const completedDemo = useRef<{ conversationId: string; sessionToken: string } | null>(null);
  const [demoIdentity, setDemoIdentity] = useState<{ conversationId: string; sessionToken: string } | null>(null);
  const [visitor, setVisitor] = useState({ name: "", business: "", email: "", phone: "", owner_details_confirmed: false });
  const [visitorBusy, setVisitorBusy] = useState(false), [visitorMessage, setVisitorMessage] = useState("");

  async function saveVisitor(event: React.FormEvent) {
    event.preventDefault();
    if (!demoIdentity || visitorBusy) return;
    setVisitorBusy(true); setVisitorMessage("");
    try {
      const response = await fetch("/api/voice/demo-visitor", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...demoIdentity, details: visitor }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Your details could not be saved.");
      setVisitorMessage("Your details are saved with this demo. The studio can follow up with you.");
    } catch (cause) { setVisitorMessage(cause instanceof Error ? cause.message : "Your details could not be saved."); }
    finally { setVisitorBusy(false); }
  }

  async function loadSampleEmail(send = false) {
    if (emailBusy) return;
    const credentials = completedDemo.current || { conversationId: conversationId.current, sessionToken: sessionToken.current };
    if (!credentials.conversationId) return;
    setEmailBusy(true); setEmailMessage("");
    try {
      const response = await fetch("/api/voice/demo-email", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ ...credentials, ...(send ? { consent: { email, own_address_confirmed: emailConsent } } : {}) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Sample email unavailable.");
      completedDemo.current = credentials;
      setSampleEmail(payload);
      if (send) setEmailMessage("Resend accepted your sample email. Delivery may take a moment.");
    } catch (cause) {
      setEmailMessage(cause instanceof Error ? cause.message : "Sample email unavailable.");
    } finally { setEmailBusy(false); }
  }
  const active = ["listening", "speaking", "processing", "responding", "recovering"].includes(status);

  function clearVoiceTimers() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    if (sessionWarningTimer.current) clearTimeout(sessionWarningTimer.current);
    if (shutdownTimer.current) clearTimeout(shutdownTimer.current);
    if (delayTimer.current) clearTimeout(delayTimer.current);
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    idleTimer.current = null; sessionTimer.current = null; sessionWarningTimer.current = null; shutdownTimer.current = null;
    delayTimer.current = null; recoveryTimer.current = null;
  }

  function clearResponseTimers() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (shutdownTimer.current) clearTimeout(shutdownTimer.current);
    if (delayTimer.current) clearTimeout(delayTimer.current);
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    idleTimer.current = null; shutdownTimer.current = null;
    delayTimer.current = null; recoveryTimer.current = null;
  }

  async function requestFarewell(reason: "inactivity_timeout" | "session_limit" = "inactivity_timeout") {
    if (autoClosing.current || farewellPlayed.current) return;
    autoClosing.current = true;
    farewellPlayed.current = true;
    clearVoiceTimers();
    responseWatchdog.current?.stop();
    mic(false);
    setStatus("speaking");
    setError(reason === "session_limit"
      ? "The 14-minute call limit was reached. Start a new conversation to continue."
      : "The call ended after one minute without visitor input.");
    const closingText = farewellText(reason);
    setMessages((previous) => [...previous, {
      id: ++messageId.current,
      role: "assistant",
      text: closingText,
      spoken: closingText.length,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    shutdownTimer.current = setTimeout(() => { void end(reason); }, 12_000);
    const farewellAudio = audio.current;
    if (!farewellAudio) { await end(reason); return; }
    farewellAudio.srcObject = null;
    farewellAudio.src = "/audio/session-farewell.wav";
    farewellAudio.currentTime = 0;
    const finish = () => {
      farewellAudio.onended = null; farewellAudio.onerror = null;
      void end(reason);
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
    idleTimer.current = setTimeout(() => { void requestFarewell("inactivity_timeout"); }, VOICE_IDLE_MS);
  }

  function finishAssistantReply() {
    responseWatchdog.current?.stop();
    persistAssistantTurn(false);
    replyId.current = null;
    voiceRecoveryAttempt.current = 0;
    typedTurn.current = null;
    setStatus("listening");
    if (bookingComplete.current && bookingConfirmationStarted.current) {
      clearVoiceTimers();
      shutdownTimer.current = setTimeout(() => { void end("booking_completed"); }, 600);
    } else if (!bookingComplete.current) armIdleTimer();
  }

  function mic(enabled: boolean) {
    wantedMic.current = enabled;
    const track = client.current?.tracks().local.audio;
    if (track) track.enabled = enabled;
    client.current?.enableMic(enabled);
    setMuted(!enabled);
  }

  async function release(preserveSession = false) {
    if (connectTimer.current) clearTimeout(connectTimer.current);
    connectTimer.current = null;
    responseWatchdog.current?.stop();
    networkCleanup.current?.(); networkCleanup.current = null;
    startInProgress.current = false;
    assistantSpeaking.current = false;
    for (const controller of pendingRequests.current) controller.abort();
    pendingRequests.current.clear();
    if (preserveSession) clearResponseTimers(); else clearVoiceTimers();
    autoClosing.current = false;
    if (!preserveSession) typedTurn.current = null;
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
    if (dispose) closing.current = boundedCleanup(dispose(), 6500);
    await closing.current;
  }

  async function end(reason = "client_ended") {
    persistAssistantTurn(true);
    setStatus("ended"); setInterim(""); setSpeechPending(null); setHolding(false); setMuted(false); setNeedsPlayback(false);
    if (conversationId.current && sessionToken.current) {
      void fetch("/api/voice/session/end", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId.current, sessionToken: sessionToken.current, reason,
        }), keepalive: true,
      }).catch(() => {});
    }
    conversationId.current = ""; sessionToken.current = "";
    openingPending.current = true;
    recoveryMic.current = null;
    sessionIceServers.current = [];
    await release();
  }

  useEffect(() => {
    const requests = pendingRequests.current;
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
      clearVoiceTimers();
      responseWatchdog.current?.stop();
      if (connectTimer.current) clearTimeout(connectTimer.current);
      networkCleanup.current?.();
      for (const controller of requests) controller.abort();
      const current = client.current;
      current?.tracks().local.audio?.stop();
      void cleanup.current?.();
    };
  }, []);

  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "instant" });
  }, [messages, interim]);

  function appendUser(text: string, mergeSpeech = false, typed = false) {
    const id = ++messageId.current;
    const previousWasTyped = lastUserWasTyped.current;
    lastUserWasTyped.current = typed;
    setMessages((previous) => {
      const last = previous.at(-1);
      if (mergeSpeech && !previousWasTyped && last?.role === "user") {
        const separator = /^[.,!?;:]/.test(text) || /\s$/.test(last.text) || /^\s/.test(text) ? "" : " ";
        return [...previous.slice(0, -1), { ...last, text: last.text + separator + text }];
      }
      return [...previous, {
      id, role: "user", text, spoken: text.length,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }];
    });
  }

  async function createSession(channel: "voice" | "push_to_talk", attempt: number) {
    if (conversationId.current && sessionToken.current) {
      return { iceServers: sessionIceServers.current };
    }
    const controller = new AbortController();
    pendingRequests.current.add(controller);
    let response: Response;
    try { response = await fetch("/api/voice/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, niche }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]), cache: "no-store",
    }); } finally { pendingRequests.current.delete(controller); }
    if (!response.ok) throw new Error(niche ? "This sample demo is currently switched off or unavailable. Please contact the studio." : "Session unavailable");
    const payload = await response.json() as {
      conversationId: string; sessionToken: string; iceServers?: RTCIceServer[];
    };
    if (generation.current !== attempt) {
      void fetch("/api/voice/session/end", {
        method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ conversationId: payload.conversationId, sessionToken: payload.sessionToken, reason: "connection_cancelled" }),
      }).catch(() => {});
      throw new Error("Connection cancelled");
    }
    conversationId.current = payload.conversationId;
    sessionToken.current = payload.sessionToken;
    if (niche) setDemoIdentity({ conversationId: payload.conversationId, sessionToken: payload.sessionToken });
    sessionIceServers.current = payload.iceServers || [];
    sessionWarningTimer.current = setTimeout(() => {
      setError("This call will reach its 14-minute limit in 30 seconds. You can start a new conversation afterward.");
    }, VOICE_SESSION_MS - 30_000);
    sessionTimer.current = setTimeout(() => { void requestFarewell("session_limit"); }, VOICE_SESSION_MS);
    return { iceServers: sessionIceServers.current };
  }

  async function reportConnection(event: "connected" | "degraded" | "disconnected" | "recovered", transport: StatsTransport) {
    if (!conversationId.current || !sessionToken.current) return;
    const stats = await collectConnectionStats(transport).catch(() => null);
    void fetch("/api/voice/diagnostic", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({
        conversationId: conversationId.current, sessionToken: sessionToken.current, event,
        ...(stats || {}),
      }),
    }).catch(() => {});
  }

  function persistAssistantTurn(interrupted = false) {
    if (interrupted && replyId.current !== null) {
      const id = replyId.current;
      setMessages((previous) => previous.map((message) => message.id === id ? { ...message, interrupted: true } : message));
    }
    const text = assistantTurnText.current.trim();
    const messageId = assistantTurnId.current;
    assistantTurnText.current = "";
    assistantTurnId.current = "";
    if (!text || !messageId || !conversationId.current || !sessionToken.current) return;
    void fetch("/api/voice/transcript", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({
        conversationId: conversationId.current,
        sessionToken: sessionToken.current,
        messageId,
        text,
        interrupted,
      }),
    }).catch(() => {});
  }

  async function sendText(text: string) {
    const attempt = generation.current;
    clearResponseTimers();
    if (!client.current || !conversationId.current || !sessionToken.current) {
      throw new Error("Voice session unavailable");
    }
    const pending = typedTurn.current?.text === text
      ? typedTurn.current
      : { id: `voice-user:${crypto.randomUUID()}`, text, appended: false };
    typedTurn.current = pending;
    if (!pending.appended) {
      persistAssistantTurn(true);
      appendUser(text, false, true);
      pending.appended = true;
    }
    setStatus("processing"); setSpeechPending(null); setInterim("");
    delayTimer.current = setTimeout(() => setError("This is taking a little longer than usual."), 8000);
    responseWatchdog.current?.wait("reply");
    const controller = new AbortController();
    pendingRequests.current.add(controller);
    try {
      const response = await fetch("/api/voice/input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversationId.current,
        sessionToken: sessionToken.current,
        messageId: pending.id,
        text,
      }),
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
      cache: "no-store",
    });
      if (generation.current !== attempt) return;
      if (!response.ok) throw new Error("Typed message was not acknowledged");
      const acknowledgement = await response.json() as { accepted?: boolean };
      if (generation.current !== attempt) return;
      if (acknowledgement.accepted === false) {
        typedTurn.current = null;
        responseWatchdog.current?.stop();
        clearResponseTimers();
        setStatus("listening");
        setError("That message was already delivered. If its reply was interrupted, please ask again.");
        armIdleTimer();
      }
    } finally {
      pendingRequests.current.delete(controller);
    }
  }

  async function recoverVoice(message: string) {
    if (voiceRecoveryInProgress.current) return;
    voiceRecoveryInProgress.current = true;
    const nextAttempt = voiceRecoveryAttempt.current + 1;
    let recoveryGeneration: number | undefined;
    recoveryMic.current = wantedMic.current;
    try {
      if (nextAttempt > 1) {
        await failVoice("The connection could not recover. Your conversation is saved here. Use Reconnect to try again.");
        return;
      }
      setStatus("recovering"); setError(message); setSpeechPending(null); setInterim("");
      persistAssistantTurn(true);
      setSending(false);
      recoveryGeneration = generation.current + 1;
      await release(true);
      if (generation.current !== recoveryGeneration) return;
      const controller = new AbortController();
      pendingRequests.current.add(controller);
      try {
        if (!navigator.onLine) setError("You are offline. Your conversation is kept here. Waiting for the network…");
        await waitUntilOnline(controller.signal);
      } finally { pendingRequests.current.delete(controller); }
      if (generation.current !== recoveryGeneration) return;
      voiceRecoveryAttempt.current = nextAttempt;
      await start(modeRef.current, undefined, nextAttempt);
    } catch {
      if (generation.current === recoveryGeneration && !client.current && conversationId.current) {
        await failVoice("The network is still unavailable. Your conversation is kept here. Reconnect when you are online.");
      }
    } finally {
      voiceRecoveryInProgress.current = false;
    }
  }

  async function start(startMode: Mode = modeRef.current, firstText?: string, recoveryAttempt = 0) {
    if (client.current || startInProgress.current) return;
    startInProgress.current = true;
    if (recoveryAttempt === 0) voiceRecoveryAttempt.current = 0;
    const attempt = ++generation.current;
    const isCurrent = () => generation.current === attempt && !autoClosing.current;
    const continuing = Boolean(conversationId.current);
    if (firstText) openingPending.current = false;
    modeRef.current = startMode; setMode(startMode);
    wantedMic.current = continuing && recoveryMic.current !== null ? recoveryMic.current : startMode === "talk";
    setStatus("connecting"); setError("");
    if (!continuing) {
      setMessages([]);
      setSampleEmail(null); setEmailMessage(""); setEmailConsent(false); setEmail(""); completedDemo.current = null;
      setDemoIdentity(null); setVisitor({ name: "", business: "", email: "", phone: "", owner_details_confirmed: false }); setVisitorMessage("");
    }
    setInterim(""); setSpeechPending(null);
    setMuted(!wantedMic.current); setHolding(false); setNeedsPlayback(false);
    assistantGenerated.current = false;
    replyId.current = null;
    autoClosing.current = false; farewellPlayed.current = false; bookingComplete.current = false;
    bookingConfirmationStarted.current = false;
    if (continuing) clearResponseTimers(); else clearVoiceTimers();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let connected = false;
    try {
      await closing.current;
      if (!isCurrent()) return;
      if (!window.isSecureContext) throw new Error("Voice needs HTTPS or localhost.");
      const voiceConfig = await createSession(startMode === "talk" ? "voice" : "push_to_talk", attempt);
      const [{ PipecatClient }, { ReliableSmallWebRTCTransport }, { default: Daily }] = await Promise.all([
        import("@pipecat-ai/client-js"), import("@/lib/reliable-small-webrtc"), import("@daily-co/daily-js"),
      ]);
      if (!isCurrent()) return;
      const transport = new ReliableSmallWebRTCTransport({
        iceServers: voiceConfig.iceServers || [],
        waitForICEGathering: true,
        relayOnly: recoveryAttempt > 0 || new URLSearchParams(window.location.search).get("voiceRelay") === "1",
      });
      responseWatchdog.current = new VoiceSessionWatchdog(() => {
        if (isCurrent()) void recoverVoice("The reply stopped arriving. Reconnecting… Please repeat your last message once connected.");
      });
      const statsTransport: StatsTransport = transport;
      const pc = new PipecatClient({
        // Include the TURN relay candidate in the initial offer. The hosted
        // backend can then connect even when a visitor's direct candidate is
        // unreachable, without relying on a later trickle-ICE PATCH.
        transport,
        enableMic: true, enableCam: false,
        callbacks: {
          onBotReady: () => {
            if (!isCurrent()) return;
            connected = true; clearTimeout(timeout); clearResponseTimers(); setStatus("listening");
            startInProgress.current = false;
            if (openingPending.current) responseWatchdog.current?.wait("reply");
            else {
              armIdleTimer();
              if (recoveryAttempt) setError("Reconnected. Please repeat your last message if its reply was interrupted.");
            }
            void reportConnection(recoveryAttempt ? "recovered" : "connected", statsTransport);
            mic(wantedMic.current);
          },
          onBotStartedSpeaking: () => {
            if (!isCurrent()) return;
            clearResponseTimers();
            assistantSpeaking.current = true;
            assistantPlaybackFinished.current = false;
            openingPending.current = false;
            responseWatchdog.current?.progress();
            setError("");
            if (bookingComplete.current) bookingConfirmationStarted.current = true;
            setStatus("speaking");
          },
          onBotStoppedSpeaking: () => {
            if (!isCurrent()) return;
            assistantSpeaking.current = false;
            assistantPlaybackFinished.current = true;
            if (assistantGenerated.current) {
              finishAssistantReply();
            } else { responseWatchdog.current?.progress(); setStatus("processing"); }

          },
          onUserStartedSpeaking: () => {
            if (!isCurrent()) return;
            clearResponseTimers();
            responseWatchdog.current?.stop();
            persistAssistantTurn(true);
            setSpeechPending("listening");
          },
          onUserStoppedSpeaking: () => {
            if (!isCurrent()) return;
            setSpeechPending("transcribing");
            responseWatchdog.current?.wait("transcript");
          },
          onBotLlmStarted: () => {
            if (!isCurrent()) return;
            persistAssistantTurn(true);
            clearResponseTimers();
            assistantGenerated.current = false;
            assistantPlaybackFinished.current = false;
            responseWatchdog.current?.wait("reply");
            setError("");
            replyId.current = null;
            assistantTurnId.current = `voice-assistant:${crypto.randomUUID()}`;
            assistantTurnText.current = "";
          },
          onBotLlmStopped: () => {
            if (!isCurrent()) return;
            assistantGenerated.current = true;
            responseWatchdog.current?.progress();
            if (assistantPlaybackFinished.current) finishAssistantReply();
            else if (!assistantSpeaking.current) {
              // Inference ending is not proof that buffered audio finished.
              // Wait for the speech completion event or the progress deadline.
              setStatus("responding");
            }
          },
          // Model text arrives first. Playback-aligned TTS events advance the highlight.
          onBotLlmText: (data) => {
            if (!isCurrent() || !data.text) return;
            openingPending.current = false;
            responseWatchdog.current?.progress();
            clearResponseTimers();
            assistantTurnText.current += data.text;
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
            responseWatchdog.current?.progress();
            clearResponseTimers();
            const id = replyId.current;
            setMessages((previous) => previous.map((m) => m.id === id
              ? { ...m, spoken: Math.min(m.text.length, m.spoken + data.text.length) } : m));
          },
          onRemoteAudioLevel: (level) => {
            if (isCurrent() && level > 0.001 && assistantSpeaking.current) responseWatchdog.current?.progress();
          },
          onLLMFunctionCallStopped: (data) => {
            if (isCurrent() && niche && data.function_name === "complete_sample_appointment" && !data.cancelled) {
              void loadSampleEmail();
              return;
            }
            if (!isCurrent() || data.function_name !== "create_appointment" || data.cancelled) return;
            if (!isSuccessfulBookingResult(data.result)) return;
            bookingComplete.current = true; bookingConfirmationStarted.current = false;
            clearVoiceTimers();
            // If Gemini fails to deliver its confirmation turn, still release the call.
            shutdownTimer.current = setTimeout(() => { void end("booking_completed"); }, 30_000);
          },
          onDisconnected: () => {
            // During negotiation, connect() owns error classification and retry.
            if (!isCurrent() || !connected) return;
            persistAssistantTurn(true);
            clearTimeout(timeout);
            void reportConnection("disconnected", statsTransport);
            void recoverVoice(connected
              ? "Voice disconnected. Restoring the same voice conversation…"
              : "The first voice path did not connect. Trying the backup voice path…");
          },
          onError: (message) => {
            if (!isCurrent() || !connected) return;
            if (!(message.data as { fatal?: boolean } | undefined)?.fatal) {
              setError("The assistant encountered a temporary issue. Waiting for it to recover…");
              return;
            }
            persistAssistantTurn(true);
            clearTimeout(timeout);
            void reportConnection("degraded", statsTransport);
            void recoverVoice(connected
              ? "Voice was interrupted. Restoring the same voice conversation…"
              : "The first voice path did not connect. Trying again…");
          },
          onServerMessage: (message) => {
            if (!isCurrent() || !message || typeof message !== "object") return;
            if (message.type === "demo-complete" && niche) {
              void loadSampleEmail();
              return;
            }
            if (message.type === "demo-disabled" && niche) {
              void end("demo_disabled").then(() => setError("The studio has switched this sample demo off."));
              return;
            }
            if (message.type === "voice-opening") {
              openingPending.current = false;
              if (message.committed) responseWatchdog.current?.wait("reply");
              else if (!typedTurn.current) { responseWatchdog.current?.stop(); armIdleTimer(); }
            }
            if (message.type === "voice-service-unusable") {
              if (["authentication", "authorization", "invalid_request"].includes(message.category)) {
                void failVoice("The voice provider rejected this session. Please try again later or contact the studio.");
              } else void recoverVoice("The voice provider stopped responding. Reconnecting…");
            }
          },
          onDeviceError: () => {
            if (!isCurrent()) return;
            void failVoice("Microphone access is unavailable. Allow microphone access and try the voice call again.");
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
          onTrackStopped: (track, participant) => {
            if (isCurrent() && connected && !participant?.local && track.kind === "audio") {
              void recoverVoice("The assistant's audio connection ended. Reconnecting…");
            }
          },
          onUserTranscript: (data) => {
            if (!isCurrent()) return;
            if (data.final) {
              if (data.text.trim()) appendUser(data.text, true);
              setInterim(""); setSpeechPending(null);
              setStatus("processing");
              responseWatchdog.current?.wait("reply");
              delayTimer.current = setTimeout(() => setError("This is taking a little longer than usual."), 8000);
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
        await boundedCleanup(pc.disconnect());
        await boundedCleanup(callObject?.destroy() || Promise.resolve());
      };
      let disconnectedAt = 0;
      const offline = () => {
        if (isCurrent()) void recoverVoice("Your network disconnected. Reconnecting…");
      };
      const checkNetwork = () => {
        if (!isCurrent() || !connected) return;
        const state = transport.peerConnection()?.connectionState;
        if (state === "failed" || state === "closed") { offline(); return; }
        if (state === "disconnected") {
          disconnectedAt ||= Date.now();
          if (Date.now() - disconnectedAt >= 10_000) offline();
        } else disconnectedAt = 0;
      };
      const networkTimer = setInterval(checkNetwork, 2000);
      window.addEventListener("offline", offline);
      window.addEventListener("online", checkNetwork);
      document.addEventListener("visibilitychange", checkNetwork);
      networkCleanup.current = () => {
        clearInterval(networkTimer);
        window.removeEventListener("offline", offline);
        window.removeEventListener("online", checkNetwork);
        document.removeEventListener("visibilitychange", checkNetwork);
      };
      timeout = setTimeout(() => {
        if (!isCurrent()) return;
        if (recoveryAttempt) void failVoice("Voice could not reconnect in time. Your conversation is kept here. Try Reconnect.");
        else void recoverVoice("Voice could not connect in time. Trying the relay connection…");
      }, 45_000);
      connectTimer.current = timeout;
      recoveryTimer.current = setTimeout(() => {
        if (isCurrent()) setError("Connecting is taking longer than usual…");
      }, 10000);
      await pc.connect({ webrtcRequestParams: { endpoint: "/api/voice", timeout: 32_000, requestData: {
        greet: openingPending.current,
        channel: startMode === "talk" ? "voice" : "push_to_talk",
        conversation_id: conversationId.current,
        session_token: sessionToken.current,
        recovery_attempt: recoveryAttempt,
        niche,
      } } });
      if (!isCurrent()) return;
      if (firstText) { await sendText(firstText); if (isCurrent()) setDraft(""); }
    } catch (cause) {
      if (!isCurrent()) return;
      clearTimeout(timeout);
      const httpStatus = cause && typeof cause === "object" && "status" in cause ? Number(cause.status) : 0;
      if (httpStatus >= 400 && httpStatus < 500) {
        await failVoice(httpStatus === 429 ? "The assistant is busy. Wait a moment, then use Reconnect." : "The call could not be started. Please end this session and try again.");
      } else if (!(cause instanceof Error && cause.name === "NotAllowedError") && recoveryAttempt === 0) {
        await recoverVoice("The first voice path failed. Trying the backup voice path…");
      } else {
        await failVoice(cause instanceof Error && cause.name === "NotAllowedError"
          ? "Microphone access was declined. Allow it in your browser and try the voice call again."
          : niche ? "This sample demo is switched off or could not connect. Please try again later or contact the studio."
          : "The voice connection is unavailable right now. Use Reconnect to try again shortly.");
      }
    } finally {
      if (isCurrent()) startInProgress.current = false;
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || autoClosing.current || status === "connecting" || status === "recovering") return;
    const attempt = generation.current;
    setSending(true); setError("");
    try {
      if (client.current) { await sendText(text); if (generation.current === attempt) setDraft(""); }
      else await start(modeRef.current, text);
    } catch {
      if (generation.current !== attempt) return;
      clearResponseTimers();
      await recoverVoice("Your message was not acknowledged. Reconnecting… Your typed message is still in the box.");
    }
    finally { setSending(false); }
  }

  function switchMode(next: Mode) {
    if (autoClosing.current) return;
    modeRef.current = next; setMode(next); setHolding(false); setError("");
    if (active && client.current) mic(next === "talk");
    else if (conversationId.current) void start(next);
  }

  function hold(down: boolean) {
    if (!active || autoClosing.current || status === "recovering" || modeRef.current !== "hold") return;
    setHolding(down); mic(down);
  }

  function close() { void end("client_ended"); dialog.current?.close(); }
  async function reconnect() {
    if (startInProgress.current || voiceRecoveryInProgress.current) return;
    if (client.current) recoveryMic.current = wantedMic.current;
    persistAssistantTurn(true);
    const nextGeneration = generation.current + 1;
    await release(true);
    if (generation.current === nextGeneration) await start(modeRef.current);
  }
  async function failVoice(message: string) {
    if (client.current) recoveryMic.current = wantedMic.current;
    persistAssistantTurn(true);
    setSending(false); setStatus("error"); setError(message);
    setSpeechPending(null); setInterim("");
    await release(true);
  }
  const statusLabel = status === "recovering" && openingPending.current
    ? "Retrying the voice connection…"
    : status === "listening"
    ? mode === "hold" && !holding ? "Hold the button to speak or type below" : muted ? "Microphone muted — you can still type" : labels[status]
    : labels[status];

  return (
    <>
      {!inline && <button className={styles.launcher} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        <span className={styles.launcherVisual} aria-hidden="true"><span className={styles.launcherWave}>{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ animationDelay: `${i * -0.17}s` }} />)}</span></span>
        <span className={styles.launcherCopy}>Talk with our sales representative<small>Let’s talk · Book an appointment</small></span><ArrowUpRight size={18} aria-hidden="true" />
      </button>}
      <dialog ref={dialog} open={inline || undefined} className={`${styles.dialog} ${inline ? styles.inlineDialog : ""}`} aria-labelledby="voice-title" onCancel={(event) => { event.preventDefault(); close(); }}>
        <header className={styles.header}><h2 id="voice-title">{niche ? "Sample receptionist" : "Sales Representative"}</h2><div className={styles.headerActions}>{active && <button className={styles.sound} aria-label={sound ? "Mute representative audio" : "Enable representative audio"} aria-pressed={!sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>}{!inline && <button onClick={close} className={styles.iconButton} aria-label="Close and end conversation"><X size={20} /></button>}</div></header>
        <div className={styles.callVisual} data-state={status}>
          <div className={styles.waveform} aria-hidden="true">{Array.from({ length: 27 }, (_, i) => <i key={i} style={{ animationDelay: `${i * -0.13}s`, height: `${12 + (1 - Math.abs(i - 13) / 13) * 34}px` }} />)}</div>
          <p role="status">{status === "idle" ? niche ? "Play the customer. Start a sample call below." : "Your next step starts with a conversation." : statusLabel}</p>
        </div>
        <div className={styles.modes} role="group" aria-label="Conversation input">
          <button aria-pressed={mode === "talk"} disabled={autoClosing.current || status === "connecting" || status === "recovering"} onClick={() => switchMode("talk")}><Mic size={15} /> Open mic</button>
          <button aria-pressed={mode === "hold"} disabled={autoClosing.current || status === "connecting" || status === "recovering"} onClick={() => switchMode("hold")}><MicOff size={15} /> Push to talk</button>
        </div>
        {(active || messages.length > 0 || interim) && <div className={styles.transcript} ref={transcript} role="log" aria-label="Conversation transcript" aria-live="polite" aria-relevant="additions text">
          {!messages.length && !interim ? <div className={styles.empty}><p>You’re connected. Say hello or type below.</p></div> : messages.map((message) => <div className={styles.message} data-role={message.role} key={message.id}><span>{message.role === "user" ? "YOU" : niche ? "SAMPLE RECEPTIONIST" : "SALES REPRESENTATIVE"}<time>{message.time}</time></span><p>{message.role === "assistant" ? <><span className={styles.spoken}>{message.text.slice(0, message.spoken)}</span><span className={styles.pending}>{message.text.slice(message.spoken)}</span></> : message.text}</p>{message.interrupted && <small>Reply interrupted by the connection.</small>}</div>)}
          {(interim || speechPending) && <div className={styles.message} data-role="user"><span>YOU · {speechPending === "transcribing" ? "TRANSCRIBING" : "SPEAKING"}</span><p>{interim || (speechPending === "transcribing" ? "Transcribing…" : "Listening…")}</p></div>}
        </div>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {niche && (active || sampleEmail) && <section className={styles.emailPreview} aria-label="Sample owner email">
          {!sampleEmail && <button disabled={emailBusy} onClick={() => void loadSampleEmail()}>View sample owner email</button>}
          {sampleEmail && <><h3>What an owner would receive</h3><strong>{sampleEmail.subject}</strong><pre>{sampleEmail.text}</pre>
            {!sampleEmail.sending_available && sampleEmail.delivery === "not_sent" && <p>Sending is off while the studio reviews the demo and configures its verified email sender. You can review the sample here.</p>}
            {sampleEmail.delivery === "not_sent" && sampleEmail.sending_available && <form onSubmit={(event) => { event.preventDefault(); void loadSampleEmail(true); }}>
              <label>Your email<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label><input type="checkbox" required checked={emailConsent} onChange={(event) => setEmailConsent(event.target.checked)} /> This is my email address. Send me one labelled sample appointment email.</label>
              <p>Your address is used for this sample email and abuse prevention. It is not a real booking or an invitation.</p>
              <button disabled={emailBusy || !emailConsent || !email.trim()} type="submit">{emailBusy ? "Preparing…" : "Send sample to my inbox"}</button>
            </form>}</>}
          {emailMessage && <p role="status">{emailMessage}</p>}
        </section>}
        {needsPlayback && <button className={styles.playback} onClick={() => { void audio.current?.play().then(() => setNeedsPlayback(false)).catch(() => {}); }}><Volume2 size={16} /> Tap to hear the assistant</button>}
        {active && status !== "recovering" && <form className={styles.composer} onSubmit={submit}><label className={styles.srOnly} htmlFor="studio-message">Your message</label><input id="studio-message" disabled={autoClosing.current} value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message…" autoComplete="off" /><button aria-label="Send message" disabled={autoClosing.current || !draft.trim() || sending} type="submit"><Send size={18} /></button></form>}
        {active && <details className={styles.devices}><summary>Microphone settings</summary><div><label htmlFor="studio-mic">Microphone</label><select id="studio-mic" disabled={autoClosing.current || status === "recovering"} value={selectedMic} onChange={(event) => { setSelectedMic(event.target.value); client.current?.updateMic(event.target.value); }}><option value="">System default</option>{mics.filter((device) => device.deviceId).map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Microphone"}</option>)}</select></div></details>}
        <div className={styles.controls}>
          {active ? <>{mode === "talk" && <button className={styles.mute} disabled={autoClosing.current || status === "recovering"} aria-pressed={muted} onClick={() => mic(muted)}>{muted ? <MicOff size={18} /> : <Mic size={18} />}{muted ? "Unmute mic" : "Mute mic"}</button>}{mode === "hold" && <button className={styles.hold} disabled={autoClosing.current || status === "recovering"} aria-pressed={holding} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); hold(true); }} onPointerUp={() => hold(false)} onPointerCancel={() => hold(false)} onLostPointerCapture={() => hold(false)} onBlur={() => hold(false)} onKeyDown={(event) => { if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); hold(true); } }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); hold(false); } }}><Mic size={18} />{holding ? "Listening…" : "Hold to talk"}</button>}<button className={styles.end} onClick={() => void end("client_ended")}><PhoneOff size={18} /> End</button></> : status === "connecting" ? <button className={styles.start} onClick={() => void end("connection_cancelled")}>Cancel connection</button> : <><button className={styles.start} onClick={() => void (conversationId.current ? reconnect() : start())}><Mic size={18} />{conversationId.current ? "Reconnect" : "Start talking"}<ArrowUpRight size={18} /></button>{conversationId.current && <button className={styles.end} onClick={() => void end("client_ended")}><PhoneOff size={18} />End</button>}</>}
        </div>
        <audio ref={audio} autoPlay playsInline muted={!sound} />
      </dialog>
      {niche && demoIdentity && <section className={styles.visitorDetails} aria-label="Share your business details">
        <h2>Want this for your business?</h2><p>Share your own details here if you’d like the studio to follow up. We’ll save them with the demo you tried. Your sample customer details stay separate.</p>
        <form onSubmit={saveVisitor}>
          <label>Your name<input autoComplete="name" maxLength={100} value={visitor.name} onChange={event => setVisitor({ ...visitor, name: event.target.value })} /></label>
          <label>Business<input autoComplete="organization" maxLength={150} value={visitor.business} onChange={event => setVisitor({ ...visitor, business: event.target.value })} /></label>
          <label>Email<input type="email" autoComplete="email" maxLength={254} value={visitor.email} onChange={event => setVisitor({ ...visitor, email: event.target.value })} /></label>
          <label>Phone<input type="tel" autoComplete="tel" maxLength={50} value={visitor.phone} onChange={event => setVisitor({ ...visitor, phone: event.target.value })} /></label>
          <label className={styles.visitorConsent}><input type="checkbox" required checked={visitor.owner_details_confirmed} onChange={event => setVisitor({ ...visitor, owner_details_confirmed: event.target.checked })} /> These are my business details. Save them with this demo so Vibecoderzz can follow up.</label>
          <button type="submit" disabled={visitorBusy || !visitor.owner_details_confirmed || !Object.values(visitor).some(value => typeof value === "string" && value.trim())}>{visitorBusy ? "Saving…" : "Save my details"}</button>
        </form>{visitorMessage && <p role="status">{visitorMessage}</p>}
      </section>}
    </>
  );
}
