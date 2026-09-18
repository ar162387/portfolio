import {
  SmallWebRTCTransport,
  type SmallWebRTCTransportConstructorOptions,
} from "@pipecat-ai/small-webrtc-transport";

type SmallWebRTCInternals = {
  createPeerConnection: () => RTCPeerConnection;
  maxReconnectionAttempts: number;
  pc?: RTCPeerConnection;
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

  peerConnection(): RTCPeerConnection | undefined {
    return (this as unknown as SmallWebRTCInternals).pc;
  }
}
