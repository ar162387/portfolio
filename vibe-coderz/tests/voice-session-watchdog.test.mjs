import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync('src/lib/voice-session-watchdog.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function harness() {
  let now = 0, id = 0;
  const timers = new Map();
  const exports = {};
  const window = new EventTarget();
  const navigator = { onLine: false };
  vm.runInNewContext(compiled, { exports, window, navigator, Date: { now: () => now },
    setTimeout: (fn, delay) => { timers.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout: (id) => timers.delete(id) });
  function advance(ms) {
    const target = now + ms;
    for (;;) {
      const next = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    now = target;
  }
  return { ...exports, advance, timers, window, navigator };
}
test('silent reply and stalled transcription have finite deadlines', () => {
  const h = harness(), stalled = [];
  const watch = new h.VoiceSessionWatchdog((kind) => stalled.push(kind));
  watch.wait('reply'); h.advance(29999); assert.equal(stalled.length, 0);
  h.advance(1); assert.deepEqual(stalled, ['reply']); h.advance(60000); assert.equal(stalled.length, 1);
  watch.wait('transcript'); h.advance(20000); assert.deepEqual(stalled, ['reply', 'transcript']);
});
test('streaming progress extends quiet timeout but cannot conceal an endless reply', () => {
  const h = harness(); let stalled = 0;
  const watch = new h.VoiceSessionWatchdog(() => stalled++);
  watch.wait('reply');
  for (let i = 0; i < 11; i++) { h.advance(10000); watch.progress(); }
  assert.equal(stalled, 0); h.advance(10000); assert.equal(stalled, 1);
});
test('completed or cancelled turn cancels watchdog', () => {
  const h = harness(); let stalled = 0;
  const watch = new h.VoiceSessionWatchdog(() => stalled++);
  watch.wait('reply'); watch.stop(); h.advance(120000); assert.equal(stalled, 0);
  assert.equal(h.timers.size, 0);
});
test('offline wait resumes on online and cleans its deadline', async () => {
  const h = harness(), controller = new AbortController();
  const waiting = h.waitUntilOnline(controller.signal);
  h.advance(20000); h.navigator.onLine = true; h.window.dispatchEvent(new Event('online'));
  await waiting; assert.equal(h.timers.size, 0);
});
test('offline wait is cancelled by End and eventually fails for prolonged outage', async () => {
  const h = harness(), controller = new AbortController();
  const waiting = h.waitUntilOnline(controller.signal);
  controller.abort(); await assert.rejects(waiting); assert.equal(h.timers.size, 0);
  const timeout = h.waitUntilOnline(new AbortController().signal);
  h.advance(45000); await assert.rejects(timeout, /offline/); assert.equal(h.timers.size, 0);
});
test('hung cleanup is bounded and late rejection stays observed', async () => {
  const h = harness(); let reject;
  const operation = new Promise((_, r) => { reject = r; });
  const cleanup = h.boundedCleanup(operation);
  h.advance(3000); await cleanup; reject(new Error('late cleanup error'));
  await Promise.resolve(); assert.equal(h.timers.size, 0);
});
