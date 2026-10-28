import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compile = (path) => ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const component = compile('src/components/studio/VoiceAssistant.tsx');
const watchdog = compile('src/lib/voice-session-watchdog.ts');
function harness({ failFirst = false, delayedSession = false, refused = false, withAudio = false, niche } = {}) {
  const hooks = [], clients = [], requests = [], timers = new Set(), timeouts = new Map();
  let cursor = 0, sessionResolve;
  const window = new EventTarget(); Object.assign(window, { isSecureContext: true, location: { search: '' } });
  const document = new EventTarget(), navigator = { onLine: true };
  const timeout = (fn, ms) => { const id = setTimeout(fn, ms); id.unref(); timers.add(id); timeouts.set(id, { fn, ms }); return id; };
  const clear = (id) => { clearTimeout(id); clearInterval(id); timers.delete(id); timeouts.delete(id); };
  const interval = (fn, ms) => { const id = setInterval(fn, ms); id.unref(); timers.add(id); return id; };
  const environment = { window, document, navigator, AbortController, AbortSignal, URLSearchParams, crypto: webcrypto, setTimeout: timeout, clearTimeout: clear, setInterval: interval, clearInterval: clear };
  const wd = {}; vm.runInNewContext(watchdog, { ...environment, exports: wd });
  class Client {
    constructor(options) { this.callbacks = options.callbacks; this.track = { enabled: true, stop() {} }; clients.push(this); }
    tracks() { return { local: { audio: this.track } }; }
    enableMic(enabled) { this.track.enabled = enabled; }
    async disconnect() { this.callbacks.onDisconnected(); }
    async connect(options) {
      this.offer = options.webrtcRequestParams.requestData;
      if (refused) {
        this.callbacks.onDisconnected();
        const error = new Error('Offer refused'); error.status = 429; throw error;
      }
      if (failFirst && clients.length === 1) throw new Error('signaling failed');
      this.callbacks.onBotReady();
    }
  }
  class Transport { peerConnection() { return undefined; } }
  const jsx = (type, props) => ({ type, props });
  const react = {
    useRef: (initial) => { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useState: (initial) => { const index = cursor++; if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], (value) => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }]; },
    useEffect() {},
  };
  const exports = {};
  const fetch = async (url, options) => {
    const body = JSON.parse(options.body); requests.push({ url, body });
    if (url === '/api/voice/session' && delayedSession) return new Promise((resolve) => { sessionResolve = resolve; });
    return { ok: true, json: async () => url === '/api/voice/session' ? { conversationId: 'conversation', sessionToken: 'token', iceServers: [] } : url === '/api/voice/demo-email' ? { subject: '[SAMPLE / DEMO] Appointment request', text: 'No appointment has been booked.', delivery: 'not_sent' } : { ok: true } };
  };
  vm.runInNewContext(component, { ...environment, exports, fetch, require: (name) => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'lucide-react') return {};
    if (name.endsWith('.css')) return { default: {} };
    if (name === '@/lib/voice-session-watchdog') return wd;
    if (name === '@pipecat-ai/client-js') return { PipecatClient: Client };
    if (name === '@/lib/reliable-small-webrtc') return { ReliableSmallWebRTCTransport: Transport };
    if (name === '@daily-co/daily-js') return { default: { getCallInstance: () => undefined } };
    throw new Error(name);
  } });
  const render = () => {
    cursor = 0;
    const tree = exports.VoiceAssistant({ niche });
    if (withAudio && !hooks[1].current) hooks[1].current = { play: async () => {}, pause() {}, load() {}, removeAttribute() {} };
    return tree;
  };
  const nodes = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const text = (node) => node == null ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
  const button = (label) => nodes(render()).find((n) => n.type === 'button' && text(n).includes(label));
  return { clients, requests, window, navigator, button, text: () => text(render()),
    elements: () => nodes(render()),
    fireIdle: () => { const [id, timer] = [...timeouts].find(([, t]) => t.ms === 60000); clear(id); timer.fn(); },
    completeSession: () => sessionResolve({ ok: true, json: async () => ({ conversationId: 'late', sessionToken: 'late-token' }) }),
    dispose: () => timers.forEach(clear),
  };
}
async function settle() { for (let i = 0; i < 8; i++) await new Promise(setImmediate); }
test('failed handshake retries with greeting eligible, observed opening is suppressed on later recovery', async () => {
  const h = harness({ failFirst: true });
  try {
    h.button('Start talking').props.onClick(); await settle();
    assert.equal(h.clients.length, 2);
    assert.equal(h.clients[0].offer.greet, true);
    assert.equal(h.clients[1].offer.greet, true);
    const ready = h.clients[1].callbacks;
    ready.onServerMessage({ type: 'voice-opening', committed: true });
    ready.onBotLlmStarted(); ready.onBotStartedSpeaking(); ready.onBotLlmText({ text: 'Hello' });
    ready.onBotLlmStopped(); ready.onBotStoppedSpeaking();
    ready.onDisconnected(); await settle();
    assert.equal(h.clients.length, 3);
    assert.equal(h.clients[2].offer.greet, false);
    ready.onDisconnected(); ready.onBotStartedSpeaking(); await settle();
    assert.equal(h.clients.length, 3); assert.match(h.text(), /Hold|Listening/);
    h.button('End').props.onClick(); await settle();
  } finally { h.dispose(); }
});
test('End before delayed session response cannot adopt or connect the late session', async () => {
  const h = harness({ delayedSession: true });
  try {
    h.button('Start talking').props.onClick(); await settle();
    h.button('Cancel').props.onClick(); await settle();
    h.completeSession(); await settle();
    assert.equal(h.clients.length, 0);
    assert.match(h.text(), /Conversation ended/);
    assert.ok(h.requests.some((r) => r.url.endsWith('/end') && r.body.conversationId === 'late'));
  } finally { h.dispose(); }
});
test('offline recovery cancelled by End does not restart when online returns', async () => {
  const h = harness();
  try {
    h.button('Start talking').props.onClick(); await settle();
    h.navigator.onLine = false; h.window.dispatchEvent(new Event('offline')); await settle();
    assert.match(h.text(), /offline/);
    h.button('End').props.onClick(); await settle();
    h.navigator.onLine = true; h.window.dispatchEvent(new Event('online')); await settle();
    assert.equal(h.clients.length, 1); assert.match(h.text(), /Conversation ended/);
  } finally { h.dispose(); }
});
test('recovery is bounded and leaves working Reconnect and End controls', async () => {
  const h = harness();
  try {
    h.button('Start talking').props.onClick(); await settle();
    h.clients[0].callbacks.onServerMessage({ type: 'voice-opening', committed: true });
    h.clients[0].callbacks.onDisconnected(); await settle();
    assert.equal(h.clients.length, 2);
    h.clients[1].callbacks.onDisconnected(); await settle();
    assert.equal(h.clients.length, 2);
    assert.ok(h.button('Reconnect')); assert.ok(h.button('End'));
    h.button('Reconnect').props.onClick(); await settle();
    assert.equal(h.clients.length, 3); assert.equal(h.clients[2].offer.greet, false);
    h.button('End').props.onClick(); await settle();
  } finally { h.dispose(); }
});
test('generation finishing does not report listening until audio playback stops', async () => {
  const h = harness();
  try {
    h.button('Start talking').props.onClick(); await settle();
    const bot = h.clients[0].callbacks;
    bot.onBotLlmStarted(); bot.onBotStartedSpeaking(); bot.onBotLlmText({ text: 'Some reply' });
    bot.onBotLlmStopped(); assert.match(h.text(), /representative is speaking/);
    bot.onBotStoppedSpeaking(); assert.match(h.text(), /Listening to you/);
    bot.onBotLlmStarted(); bot.onBotStartedSpeaking(); bot.onBotLlmText({ text: 'A partial reply' });
    bot.onDisconnected(); await settle();
    assert.match(h.text(), /Reply interrupted/);
    assert.ok(h.requests.some((r) => r.url.endsWith('/transcript') && r.body.interrupted && r.body.text === 'A partial reply'));
    h.button('End').props.onClick(); await settle();
  } finally { h.dispose(); }
});

test('refused offer does not start a retry from its disconnected callback', async () => {
  const h = harness({ refused: true });
  try {
    h.button('Start talking').props.onClick(); await settle();
    assert.equal(h.clients.length, 1); assert.match(h.text(), /assistant is busy/);
    assert.ok(h.button('Reconnect')); h.button('End').props.onClick(); await settle();
  } finally { h.dispose(); }
});

test('farewell mutes input and rejects new turns and late SDK callbacks until End', async () => {
  const h = harness({ withAudio: true });
  try {
    h.button('Start talking').props.onClick(); await settle();
    const bot = h.clients[0].callbacks;
    bot.onBotLlmStarted(); bot.onBotStartedSpeaking(); bot.onBotLlmText({ text: 'Hello' });
    bot.onBotLlmStopped(); bot.onBotStoppedSpeaking();
    h.elements().find(n => n.type === 'input').props.onChange({ target: { value: 'A late message' } });
    assert.equal(h.elements().find(n => n.props?.['aria-label'] === 'Send message').props.disabled, false);
    h.fireIdle(); await settle();
    assert.equal(h.clients[0].track.enabled, false);
    assert.equal(h.elements().find(n => n.props?.['aria-label'] === 'Send message').props.disabled, true);
    await h.elements().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(h.requests.filter(r => r.url.endsWith('/input')).length, 0);
    bot.onBotLlmStarted(); bot.onDisconnected(); await settle();
    assert.equal(h.clients.length, 1);
    assert.match(h.text(), /one minute without visitor input/);
    h.button('End').props.onClick(); await settle();
  } finally { h.dispose(); }
});


test('message input is hidden until connected and disappears when the call ends', async () => {
  const h = harness({ delayedSession: true });
  try {
    assert.equal(h.elements().some(n => n.type === 'form'), false);
    h.button('Start talking').props.onClick(); await settle();
    assert.equal(h.elements().some(n => n.type === 'form'), false);
    assert.ok(h.elements().some(n => n.props?.['data-state'] === 'connecting'));
    h.completeSession(); await settle();
    assert.equal(h.elements().some(n => n.type === 'form'), true);
    h.button('End').props.onClick(); await settle();
    assert.equal(h.elements().some(n => n.type === 'form'), false);
  } finally { h.dispose(); }
});

// The niche uses the existing transport/recovery flow with the same allowlisted key.
test('niche remains attached to session creation and every recovered voice offer', async () => {
  const h = harness({ failFirst: true, niche: 'garage-doors' });
  try {
    await h.button('Start talking').props.onClick();
    await settle();
    assert.equal(h.requests.find((request) => request.url === '/api/voice/session').body.niche, 'garage-doors');
    assert.equal(h.clients.length, 2);
    for (const client of h.clients) assert.equal(client.offer.niche, 'garage-doors');
  } finally { h.dispose(); }
});

test('confirmed demo notification opens the labelled email preview without sending', async () => {
  const h = harness({ niche: 'garage-doors' });
  try {
    h.button('Start talking').props.onClick(); await settle();
    h.clients[0].callbacks.onServerMessage({ type: 'demo-complete' }); await settle();
    const request = h.requests.find((request) => request.url === '/api/voice/demo-email');
    assert.equal(request.body.conversationId, 'conversation');
    assert.equal(request.body.consent, undefined);
    assert.match(h.text(), /What an owner would receive/);
    assert.match(h.text(), /SAMPLE \/ DEMO/);
    h.button('End').props.onClick(); await settle();
    assert.match(h.text(), /What an owner would receive/);
  } finally { h.dispose(); }
});
