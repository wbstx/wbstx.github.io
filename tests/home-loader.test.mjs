import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { PRISM_CYCLE_DURATION, PRISM_STILL_TIME } from '../js/home/halftone.js';

const source = (await readFile(new URL('../js/home/home-loader.js', import.meta.url), 'utf8'))
  .replace(/^import .*?;\n/, '');

async function harness({ slow = false, reduced = false, canvasAvailable = true, preview = false, late = false, drawFailure = false } = {}) {
  let now = 0, nextId = 0, releaseAssets, lastDraw = null, disconnected = false;
  const frames = new Map(), timers = new Map();
  const classes = new Set(late ? [] : ['is-loading']);
  function eventTarget(value = {}) {
    const listeners = new Map();
    return Object.assign(value, {
      addEventListener(type, callback) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(callback);
      },
      removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
      emit(type, values = {}) {
        const event = { type, cancelable: true, prevented: false, stopped: false,
          preventDefault() { this.prevented = true; },
          stopImmediatePropagation() { this.stopped = true; }, ...values };
        for (const callback of listeners.get(type) || []) callback(event);
        return event;
      },
    });
  }
  const assets = slow ? new Promise(resolve => { releaseAssets = resolve; }) : Promise.resolve();
  const main = { inert: false, querySelectorAll: () => [{ decode: () => assets }] };
  const stage = { setAttribute() {} };
  const canvas = { getContext: () => canvasAvailable ? { setTransform() {} } : null,
    parentElement: { classList: { add() {} } } };
  const document = eventTarget({
    hidden: false,
    fonts: { ready: Promise.resolve() },
    documentElement: { classList: { contains: value => classes.has(value), remove: value => classes.delete(value) } },
    querySelector: selector => ({ '#home-loader': stage, '#home-loader-canvas': canvas, '#main': main })[selector],
  });
  const motion = eventTarget({ matches: reduced });
  runInNewContext(source, {
    document, window: { homeLoaderWatchdog: -1 }, matchMedia: () => motion,
    location: { hostname: 'localhost', search: preview ? '?preview=loader' : '' },
    devicePixelRatio: 1, URLSearchParams, PRISM_CYCLE_DURATION, PRISM_STILL_TIME,
    createPrismScene: () => ({ width: 600, height: 420 }),
    drawPrism: (context, scene, elapsed) => { if (drawFailure) throw Error('No renderer'); lastDraw = elapsed; },
    requestAnimationFrame: callback => { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (callback, delay) => { timers.set(++nextId, { callback, at: now + delay }); return nextId; },
    clearTimeout: id => timers.delete(id),
    ResizeObserver: class { observe() {} disconnect() { disconnected = true; } },
    console: { error() {} },
  });
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  await flush();
  return {
    main, document,
    get loading() { return classes.has('is-loading'); },
    get lastDraw() { return lastDraw; },
    get pendingFrames() { return frames.size; },
    get disconnected() { return disconnected; },
    async advance(milliseconds) {
      for (let left = milliseconds; left > 0; left -= 20) {
        now += Math.min(20, left);
        const pending = [...frames.values()];
        frames.clear();
        for (const callback of pending) callback(now);
        for (const [id, timer] of [...timers]) {
          if (timer.at <= now) { timers.delete(id); timer.callback(); }
        }
        await flush();
      }
    },
    hidden(value) { document.hidden = value; document.emit('visibilitychange'); },
    async finishAssets() { releaseAssets(); await flush(); },
    async reduceMotion() { motion.matches = true; motion.emit('change'); await flush(); },
  };
}

test('the homepage waits for a complete visible prism cycle even with cached assets', async () => {
  const app = await harness();
  assert.equal(app.main.inert, true);
  assert.equal(app.document.emit('wheel').prevented, true);
  await app.advance(3800);
  assert.equal(app.loading, true);
  await app.advance(160);
  assert.equal(app.loading, false);
  assert.ok(app.lastDraw >= PRISM_CYCLE_DURATION);
  assert.equal(app.main.inert, false);
  assert.equal(app.document.emit('wheel').stopped, false);
  assert.equal(app.pendingFrames, 0);
  assert.equal(app.disconnected, true);
});

test('time in a hidden tab does not satisfy minimum playback', async () => {
  const app = await harness();
  await app.advance(2000);
  app.hidden(true);
  const lastDraw = app.lastDraw;
  await app.advance(12000);
  assert.equal(app.lastDraw, lastDraw);
  assert.equal(app.loading, true);
  app.hidden(false);
  await app.advance(1800);
  assert.equal(app.loading, true);
  await app.advance(240);
  assert.equal(app.loading, false);
});

test('essential artwork must be ready, but a stalled asset cannot trap the homepage', async () => {
  const app = await harness({ slow: true });
  await app.advance(5000);
  assert.equal(app.loading, true);
  await app.finishAssets();
  assert.equal(app.loading, false);
  const stalled = await harness({ slow: true });
  await stalled.advance(8200);
  assert.equal(stalled.loading, false);
  assert.equal(stalled.main.inert, false);
});

test('reduced motion and canvas failures leave the homepage accessible', async () => {
  const reduced = await harness({ reduced: true });
  assert.equal(reduced.loading, false);
  assert.equal(reduced.lastDraw, PRISM_STILL_TIME);
  assert.equal((await harness({ canvasAvailable: false })).loading, false);
  assert.equal((await harness({ drawFailure: true })).loading, false);
  const app = await harness();
  await app.advance(500);
  await app.reduceMotion();
  assert.equal(app.loading, false);
  assert.equal(app.pendingFrames, 0);
});

test('local preview keeps playing, and a late module never covers an already visible page', async () => {
  const preview = await harness({ preview: true });
  await preview.advance(9000);
  assert.equal(preview.loading, true);
  assert.ok(preview.pendingFrames > 0);
  const late = await harness({ late: true });
  assert.equal(late.loading, false);
  assert.equal(late.main.inert, false);
  assert.equal(late.pendingFrames, 0);
});
