import {
  SmallWebRTCTransport,
  type SmallWebRTCTransportConstructorOptions,
  type SmallWebRTCTransportConnectionOptions,
} from "@pipecat-ai/small-webrtc-transport";
import { TransportStartError, type RTVIEventCallbacks } from "@pipecat-ai/client-js";

type SmallWebRTCInternals = {
  createPeerConnection: () => RTCPeerConnection;
  maxReconnectionAttempts: number;
  pc?: RTCPeerConnection;
  dc?: RTCDataChannel;
  pc_id?: string;
  _abortController?: AbortController;
  _webrtcRequest?: SmallWebRTCTransportConnectionOptions["webrtcRequestParams"];
  _callbacks: RTVIEventCallbacks;
  _connectResolved: (() => void) | null;
  _connectFailed: ((cause: unknown) => void) | null;
  mediaManager: { connect: () => Promise<void>; disconnect: () => Promise<void> };
  startNewPeerConnection: () => Promise<void>;
};

export type ReliableSmallWebRTCOptions = SmallWebRTCTransportConstructorOptions & {
  relayOnly?: boolean;
};

/** Pins the production behaviors that the upstream public options do not expose. */
export class ReliableSmallWebRTCTransport extends SmallWebRTCTransport {
  private readonly relayOnly: boolean;

  constructor(options: ReliableSmallWebRTCOptions = {}) {
    super(options);
    this.relayOnly = options.relayOnly === true;
    (this as unknown as SmallWebRTCInternals).maxReconnectionAttempts = 1;
  }

  createPeerConnection(): RTCPeerConnection {
    const parent = SmallWebRTCTransport.prototype as unknown as SmallWebRTCInternals;
    const connection = parent.createPeerConnection.call(this);
    if (this.relayOnly) {
      connection.setConfiguration({
        ...connection.getConfiguration(),
        iceTransportPolicy: "relay",
      });
    }
    return connection;
  }

  async _connect(options?: SmallWebRTCTransportConnectionOptions): Promise<void> {
    const internal = this as unknown as SmallWebRTCInternals;
    if (internal._abortController?.signal.aborted) return;
    this.state = "connecting";
    if (options?.iceConfig?.iceServers) this.iceServers = options.iceConfig.iceServers;
    internal._webrtcRequest = options?.webrtcRequestParams ?? internal._webrtcRequest;
    if (!internal._webrtcRequest) {
      this.state = "error";
      throw new TransportStartError();
    }
    await internal.mediaManager.connect();
    // Permission/media initialization may finish after Cancel, before a peer
    // exists for upstream stop() to close. Release those late microphone tracks.
    if (internal._abortController?.signal.aborted) {
      await internal.mediaManager.disconnect();
      return;
    }
    // stop() can reject this while ICE/signaling is still awaited. Observe the
    // rejection immediately, then propagate it through the awaited connect call.
    const connected = new Promise<void>((resolve, reject) => {
      internal._connectResolved = resolve;
      internal._connectFailed = reject;
    });
    void connected.catch(() => {});
    await internal.startNewPeerConnection();
    if (internal._abortController?.signal.aborted) return;
    if (internal.dc?.readyState !== "open") await connected;
    this.state = "connected";
    internal._callbacks.onConnected?.();
    internal._callbacks.onBotConnected?.({ id: internal.pc_id || "bot", name: "bot", local: false });
  }

  peerConnection(): RTCPeerConnection | undefined {
    return (this as unknown as SmallWebRTCInternals).pc;
  }
}
