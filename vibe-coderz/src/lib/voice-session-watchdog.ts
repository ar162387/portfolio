export type VoiceWait = "reply" | "transcript";

/** Bounds silent stalls while allowing a reply to keep streaming normally. */
export class VoiceSessionWatchdog {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private deadline = 0;
  private waiting: VoiceWait | undefined;
  constructor(private readonly stalled: (waiting: VoiceWait) => void) {}

  wait(waiting: VoiceWait) {
    this.stop();
    this.waiting = waiting;
    this.deadline = Date.now() + 120_000;
    this.progress();
  }

  progress() {
    if (!this.waiting) return;
    clearTimeout(this.timer);
    const remaining = this.deadline - Date.now();
    this.timer = setTimeout(() => {
      const waiting = this.waiting;
      this.stop();
      if (waiting) this.stalled(waiting);
    }, Math.max(0, Math.min(this.waiting === "transcript" ? 20_000 : 30_000, remaining)));
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.waiting = undefined;
  }
}

/** Cleanup must not keep cancellation/reconnection waiting forever. */
export async function boundedCleanup(operation: Promise<unknown>, timeoutMs = 3000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      operation.catch(() => {}),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function waitUntilOnline(signal: AbortSignal, timeoutMs = 45_000): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason);
  if (navigator.onLine) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const finish = (cause?: unknown) => {
      clearTimeout(timer);
      window.removeEventListener("online", online);
      signal.removeEventListener("abort", aborted);
      if (cause) reject(cause); else resolve();
    };
    const online = () => finish();
    const aborted = () => finish(signal.reason);
    const timer = setTimeout(() => finish(new Error("Network is still offline")), timeoutMs);
    window.addEventListener("online", online, { once: true });
    signal.addEventListener("abort", aborted, { once: true });
  });
}
