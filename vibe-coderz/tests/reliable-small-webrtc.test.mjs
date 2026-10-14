import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

class TransportStartError extends Error {}
class SmallWebRTCTransport {
  constructor() {
    this._callbacks = {};
    this.mediaManager = { connect: async () => {}, disconnect: async () => {} };
  }
}
const source = readFileSync(new URL("../src/lib/reliable-small-webrtc.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, {
  exports: moduleExports,
  require: (name) => name === "@pipecat-ai/client-js" ? { TransportStartError } : { SmallWebRTCTransport },
});
const { ReliableSmallWebRTCTransport } = moduleExports;

test("disconnect during negotiation rejects connect without an unhandled promise", async () => {
  const transport = new ReliableSmallWebRTCTransport();
  const failure = new TransportStartError("signaling unavailable");
  transport.startNewPeerConnection = async () => {
    transport._connectFailed(failure);
    // Negotiation is still pending when stop() rejects the connection promise.
    await new Promise((resolve) => setTimeout(resolve, 10));
  };
  await assert.rejects(transport._connect({ webrtcRequestParams: { endpoint: "/api/voice" } }), (error) => error === failure);
});

test("open data channel emits connected callbacks once", async () => {
  const transport = new ReliableSmallWebRTCTransport();
  const events = [];
  transport._callbacks = { onConnected: () => events.push("connected"), onBotConnected: (bot) => events.push(bot.id) };
  transport.startNewPeerConnection = async () => {
    transport.pc_id = "peer";
    transport.dc = { readyState: "open" };
    transport._connectResolved();
  };
  await transport._connect({ webrtcRequestParams: { endpoint: "/api/voice" } });
  assert.equal(transport.state, "connected");
  assert.deepEqual(events, ["connected", "peer"]);
});

test("cancelled negotiation does not report a successful connection", async () => {
  const transport = new ReliableSmallWebRTCTransport();
  const controller = new AbortController();
  transport._abortController = controller;
  transport.startNewPeerConnection = async () => {
    controller.abort();
    transport._connectFailed(new TransportStartError());
    await new Promise((resolve) => setTimeout(resolve, 10));
  };
  await transport._connect({ webrtcRequestParams: { endpoint: "/api/voice" } });
  assert.equal(transport.state, "connecting");
});

test("cancel during microphone initialization releases late media without opening a peer", async () => {
  const transport = new ReliableSmallWebRTCTransport();
  const controller = new AbortController();
  transport._abortController = controller;
  let released = false, opened = false;
  transport.mediaManager.connect = async () => { controller.abort(); };
  transport.mediaManager.disconnect = async () => { released = true; };
  transport.startNewPeerConnection = async () => { opened = true; };
  await transport._connect({ webrtcRequestParams: { endpoint: "/api/voice" } });
  assert.equal(released, true); assert.equal(opened, false);
});
