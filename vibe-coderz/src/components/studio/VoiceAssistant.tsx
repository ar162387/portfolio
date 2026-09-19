"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Mic, MicOff, PhoneOff, Send, Volume2, VolumeX, X } from "lucide-react";
import type { PipecatClient } from "@pipecat-ai/client-js";
import styles from "./voice-assistant.module.css";

type Status = "idle" | "connecting" | "listening" | "processing" | "responding" | "recovering" | "speaking" | "ended" | "error";
type Mode = "talk" | "hold";
type Message = { id: number; role: "user" | "assistant"; text: string; spoken: number; time: string };
const labels: Record<Status, string> = {
  idle: "A conversation starts here", connecting: "Connecting…", listening: "Listening to you",
  processing: "Working on your reply…", recovering: "Restoring the conversation…",
  responding: "Writing your reply…",
  speaking: "Your assistant is speaking", ended: "Conversation ended", error: "Let’s try that again",
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

export function VoiceAssistant({ email }: { email: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
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

  function mic(enabled: boolean) {
    wantedMic.current = enabled;
    const track = client.current?.tracks().local.audio;
    if (track) track.enabled = enabled;
    client.current?.enableMic(enabled);
    setMuted(!enabled);
  }

  async function release(preserveSession = false) {
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
    if (dispose) closing.current = dispose();
    await closing.current;
  }

  async function end(reason = "client_ended") {
    setStatus("ended"); setInterim(""); setSpeechPending(null); setHolding(false); setMuted(false); setNeedsPlayback(false);
    if (conversationId.current && sessionToken.current) {
      void fetch("/api/voice/session/end", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId.current, sessionToken: sessionToken.current, reason,
        }), keepalive: true,
      }).catch(() => {});
    }
    await release();
    conversationId.current = ""; sessionToken.current = "";
    sessionIceServers.current = [];
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

  async function createSession(channel: "voice" | "push_to_talk") {
    if (conversationId.current && sessionToken.current) {
      return { iceServers: sessionIceServers.current };
    }
    const response = await fetch("/api/voice/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }), signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    if (!response.ok) throw new Error("Session unavailable");
    const payload = await response.json() as {
      conversationId: string; sessionToken: string; iceServers?: RTCIceServer[];
    };
    conversationId.current = payload.conversationId;
    sessionToken.current = payload.sessionToken;
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
    clearResponseTimers();
    if (!client.current || !conversationId.current || !sessionToken.current) {
      throw new Error("Voice session unavailable");
    }
    const pending = typedTurn.current?.text === text
      ? typedTurn.current
      : { id: `voice-user:${crypto.randomUUID()}`, text, appended: false };
    typedTurn.current = pending;
    if (!pending.appended) {
      appendUser(text, false, true);
      pending.appended = true;
    }
    setStatus("processing"); setSpeechPending(null); setInterim("");
    delayTimer.current = setTimeout(() => setError("This is taking a little longer than usual."), 8000);
    recoveryTimer.current = setTimeout(() => {
      setError("The voice reply stalled. Please try saying or sending that once more.");
      // Keep the active call usable. The previous error state exposed a start
      // button whose handler could not run while the existing client remained.
      setStatus("listening");
    }, 15000);
    const response = await fetch("/api/voice/input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversationId.current,
        sessionToken: sessionToken.current,
        messageId: pending.id,
        text,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Typed message was not acknowledged");
  }

  async function recoverVoice(message: string) {
    if (voiceRecoveryInProgress.current) return;
    voiceRecoveryInProgress.current = true;
    const nextAttempt = voiceRecoveryAttempt.current + 1;
    try {
      if (nextAttempt > 1) {
        setError("The voice connection is unavailable right now. Please end this call and try again shortly.");
        setStatus("error");
        await release(true);
        return;
      }
      setStatus("recovering"); setError(message); setSpeechPending(null); setInterim("");
      await release(true);
      voiceRecoveryAttempt.current = nextAttempt;
      await start(modeRef.current, undefined, nextAttempt);
    } finally {
      voiceRecoveryInProgress.current = false;
    }
  }

  async function start(startMode: Mode = modeRef.current, firstText?: string, recoveryAttempt = 0) {
    if (client.current || status === "connecting") return;
    if (recoveryAttempt === 0) voiceRecoveryAttempt.current = 0;
    const attempt = ++generation.current;
    const isCurrent = () => generation.current === attempt;
    const continuing = Boolean(conversationId.current);
    modeRef.current = startMode; setMode(startMode);
    wantedMic.current = startMode === "talk";
    setStatus("connecting"); setError("");
    if (!continuing) setMessages([]);
    setInterim(""); setSpeechPending(null);
    setMuted(startMode !== "talk"); setHolding(false); setNeedsPlayback(false);
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
      const voiceConfig = await createSession(startMode === "talk" ? "voice" : "push_to_talk");
      const [{ PipecatClient }, { ReliableSmallWebRTCTransport }, { default: Daily }] = await Promise.all([
        import("@pipecat-ai/client-js"), import("@/lib/reliable-small-webrtc"), import("@daily-co/daily-js"),
      ]);
      if (!isCurrent()) return;
      const transport = new ReliableSmallWebRTCTransport({
        iceServers: voiceConfig.iceServers || [],
        waitForICEGathering: true,
        relayOnly: new URLSearchParams(window.location.search).get("voiceRelay") === "1",
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
            void reportConnection(recoveryAttempt ? "recovered" : "connected", statsTransport);
            if (startMode !== "talk") mic(false);
          },
          onBotStartedSpeaking: () => {
            if (!isCurrent()) return;
            clearResponseTimers();
            setError("");
            if (bookingComplete.current) bookingConfirmationStarted.current = true;
            setStatus("speaking");
          },
          onBotStoppedSpeaking: () => {
            if (!isCurrent()) return;
            setStatus("listening");
            if (bookingComplete.current) {
              if (bookingConfirmationStarted.current) {
                clearVoiceTimers();
                shutdownTimer.current = setTimeout(() => { void end("booking_completed"); }, 600);
              }
              return;
            }
            if (autoClosing.current) {
              if (shutdownTimer.current) clearTimeout(shutdownTimer.current);
              shutdownTimer.current = setTimeout(() => { void end("inactivity_timeout"); }, 900);
            } else armIdleTimer();
          },
          onUserStartedSpeaking: () => {
            if (!isCurrent()) return;
            clearResponseTimers();
            setSpeechPending("listening");
          },
          onUserStoppedSpeaking: () => {
            if (!isCurrent()) return;
            setSpeechPending("transcribing");
          },
          onBotLlmStarted: () => {
            if (!isCurrent()) return;
            persistAssistantTurn(true);
            clearResponseTimers();
            setError("");
            replyId.current = null;
            assistantTurnId.current = `voice-assistant:${crypto.randomUUID()}`;
            assistantTurnText.current = "";
            typedTurn.current = null;
          },
          onBotLlmStopped: () => {
            if (!isCurrent()) return;
            persistAssistantTurn(false);
            replyId.current = null;
          },
          // Model text arrives first. Playback-aligned TTS events advance the highlight.
          onBotLlmText: (data) => {
            if (!isCurrent() || !data.text) return;
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
            clearResponseTimers();
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
            shutdownTimer.current = setTimeout(() => { void end("booking_completed"); }, 30_000);
          },
          onDisconnected: () => {
            if (!isCurrent()) return;
            persistAssistantTurn(true);
            clearTimeout(timeout);
            void reportConnection("disconnected", statsTransport);
            void recoverVoice(connected
              ? "Voice disconnected. Restoring the same voice conversation…"
              : "The first voice path did not connect. Trying the backup voice path…");
          },
          onError: () => {
            if (!isCurrent()) return;
            persistAssistantTurn(true);
            clearTimeout(timeout);
            void reportConnection("degraded", statsTransport);
            void recoverVoice("Voice was interrupted. Restoring the same voice conversation…");
          },
          onDeviceError: () => {
            if (!isCurrent()) return;
            setError("Microphone access is unavailable. Allow microphone access and try the voice call again.");
            setStatus("error"); void release(true);
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
              setStatus("processing");
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
        await pc.disconnect().catch(() => {});
        await callObject?.destroy().catch(() => {});
      };
      timeout = setTimeout(() => {
        if (!isCurrent()) return;
        void recoverVoice("Voice could not connect in time. Trying the backup voice path…");
      }, 20000);
      recoveryTimer.current = setTimeout(() => {
        if (isCurrent()) setStatus("recovering");
      }, 10000);
      await pc.connect({ webrtcRequestParams: { endpoint: "/api/voice", requestData: {
        greet: !continuing && !firstText,
        channel: startMode === "talk" ? "voice" : "push_to_talk",
        conversation_id: conversationId.current,
        session_token: sessionToken.current,
        recovery_attempt: recoveryAttempt,
      } } });
      if (!isCurrent()) return;
      if (firstText) { await sendText(firstText); setDraft(""); }
    } catch (cause) {
      if (!isCurrent()) return;
      clearTimeout(timeout);
      if (!(cause instanceof Error && cause.name === "NotAllowedError") && recoveryAttempt === 0) {
        await recoverVoice("The first voice path failed. Trying the backup voice path…");
      } else {
        setError(cause instanceof Error && cause.name === "NotAllowedError"
          ? "Microphone access was declined. Allow it in your browser and try the voice call again."
          : "The voice connection is unavailable right now. Please try the call again shortly.");
        setStatus("error"); await release(true);
      }
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || status === "connecting") return;
    setSending(true); setError("");
    try {
      if (client.current) { await sendText(text); setDraft(""); }
      else await start(modeRef.current, text);
    } catch {
      clearResponseTimers();
      setStatus(client.current ? "listening" : "error");
      setError("Your message couldn’t be sent through the voice agent. Please try again.");
    }
    finally { setSending(false); }
  }

  function switchMode(next: Mode) {
    modeRef.current = next; setMode(next); setHolding(false); setError("");
    if (active && client.current) mic(next === "talk");
    else if (conversationId.current) void start(next);
  }

  function hold(down: boolean) {
    if (!active || modeRef.current !== "hold") return;
    setHolding(down); mic(down);
  }

  function close() { void end("client_ended"); dialog.current?.close(); }
  const statusLabel = status === "listening"
    ? mode === "hold" && !holding ? "Hold the button to speak or type below" : muted ? "Microphone muted — you can still type" : labels[status]
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
        </div>
        <div className={styles.status} role="status"><span data-active={active} />{statusLabel}<button className={styles.sound} aria-label={sound ? "Mute assistant audio" : "Enable assistant audio"} aria-pressed={!sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={15} /> : <VolumeX size={15} />}</button></div>
        <div className={styles.transcript} ref={transcript} role="log" aria-label="Conversation transcript" aria-live="polite" aria-relevant="additions text">
          {!messages.length && !interim ? <div className={styles.empty}><span>ROOM FOR YOUR NEXT IDEA</span><p>“Could AI help with my customer enquiries?”</p><p>“I’m looking to build a website.”</p></div> : messages.map((message) => <div className={styles.message} data-role={message.role} key={message.id}><span>{message.role === "user" ? "YOU" : "STUDIO ASSISTANT"}<time>{message.time}</time></span><p>{message.role === "assistant" ? <><span className={styles.spoken}>{message.text.slice(0, message.spoken)}</span><span className={styles.pending}>{message.text.slice(message.spoken)}</span></> : message.text}</p></div>)}
          {(interim || speechPending) && <div className={styles.message} data-role="user"><span>YOU · {speechPending === "transcribing" ? "TRANSCRIBING" : "SPEAKING"}</span><p>{interim || (speechPending === "transcribing" ? "Transcribing…" : "Listening…")}</p></div>}
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {needsPlayback && <button className={styles.playback} onClick={() => { void audio.current?.play().then(() => setNeedsPlayback(false)).catch(() => {}); }}><Volume2 size={16} /> Tap to hear the assistant</button>}
        <form className={styles.composer} onSubmit={submit}><label className={styles.srOnly} htmlFor="studio-message">Your message</label><input id="studio-message" value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message…" autoComplete="off" /><button aria-label="Send message" disabled={!draft.trim() || sending || status === "connecting"} type="submit"><Send size={18} /></button></form>
        {active && <div className={styles.devices}><label htmlFor="studio-mic">Microphone</label><select id="studio-mic" value={selectedMic} onChange={(event) => { setSelectedMic(event.target.value); client.current?.updateMic(event.target.value); }}><option value="">System default</option>{mics.filter((device) => device.deviceId).map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Microphone"}</option>)}</select></div>}
        <div className={styles.controls}>
          {active ? <>{mode === "talk" && <button className={styles.mute} aria-pressed={muted} onClick={() => mic(muted)}>{muted ? <MicOff size={18} /> : <Mic size={18} />}{muted ? "Unmute mic" : "Mute mic"}</button>}{mode === "hold" && <button className={styles.hold} aria-pressed={holding} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); hold(true); }} onPointerUp={() => hold(false)} onPointerCancel={() => hold(false)} onLostPointerCapture={() => hold(false)} onBlur={() => hold(false)} onKeyDown={(event) => { if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); hold(true); } }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); hold(false); } }}><Mic size={18} />{holding ? "Listening…" : "Hold to talk"}</button>}<button className={styles.end} onClick={() => void end("client_ended")}><PhoneOff size={18} /> End</button></> : status === "connecting" ? <button className={styles.start} onClick={() => void end("connection_cancelled")}>Connecting… Cancel</button> : <button className={styles.start} onClick={() => void start()}><Mic size={18} />Start talking<ArrowUpRight size={18} /></button>}
        </div>
        <footer className={styles.footer}><p>Starting shares your messages and enabled microphone audio with Google Gemini. We save text transcripts and lead progress for studio follow-up, but never raw audio. If you book, confirmed contact and appointment details are sent to Cal.com.</p><a href={`mailto:${email}`}>Prefer email? Talk to a person <ArrowUpRight size={12} /></a></footer>
        <audio ref={audio} autoPlay playsInline muted={!sound} />
      </dialog>
    </>
  );
}
