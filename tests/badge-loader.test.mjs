import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { PRISM_CYCLE_DURATION, PRISM_STILL_TIME } from '../js/home/halftone.js';

// Exercise the real entrypoint with a virtual animation clock and asset loader.
const source = (await readFile(new URL('../js/home/badge-loader.js', import.meta.url), 'utf8'))
  .replace(/^import .*?;\n/, '')
  .replace('import.meta.url', JSON.stringify('http://localhost/js/home/generated/badge-loader.js'))
  .replace('import(new URL', 'importBadge(new URL');

async function harness({ reduced = false, canvasAvailable = true, preview = false, fail = false, slow = false } = {}) {
  let now = 0, nextFrame = 0, mutation, intersection, draws = 0, lastDraw = 0;
  let imports = 0, revealedAt = null, releaseAssets;
  const callbacks = new Map(), events = new Map();
  const classes = new Set(), attributes = new Map([['aria-busy', 'true']]);
  const assets = slow ? new Promise(resolve => { releaseAssets = resolve; }) : Promise.resolve();
  const stage = {
    classList: { contains: name => classes.has(name) },
    getAttribute: name => attributes.get(name),
    setAttribute(name, value) { attributes.set(name, value); mutation?.(); },
  };
  const context = { setTransform() {} };
  const canvas = { getContext: () => canvasAvailable ? context : null, parentElement: { classList: { add() {} } } };
  const status = { textContent: '' };
  const document = {
    hidden: false,
    querySelector: selector => ({ '#badge-stage': stage, '#badge-loader': canvas, '#card-side': status })[selector],
    addEventListener: (name, callback) => events.set(name, callback),
  };
  const motion = { matches: reduced, addEventListener: (name, callback) => events.set(`motion:${name}`, callback) };
  runInNewContext(source, {
    document, matchMedia: () => motion, devicePixelRatio: 1, URL, URLSearchParams,
    location: { hostname: 'localhost', search: preview ? '?preview=loader' : '' },
    console: { error() {} }, PRISM_CYCLE_DURATION, PRISM_STILL_TIME,
    createPrismScene: () => ({ width: 600, height: 420 }),
    drawPrism: (context, scene, elapsed) => { draws++; lastDraw = elapsed; },
    requestAnimationFrame: callback => { callbacks.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => callbacks.delete(id),
    ResizeObserver: class { observe() {} },
    MutationObserver: class { constructor(callback) { mutation = callback; } observe() {} },
    IntersectionObserver: class { constructor(callback) { intersection = callback; } observe() {} },
    importBadge: async () => {
      imports++;
      if (fail) throw Error('Asset download failed');
      return { initBadge: async minimum => {
        await assets;
        await minimum;
        revealedAt = now;
        classes.add('is-ready');
        stage.setAttribute('aria-busy', 'false');
      } };
    },
  });
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  await flush();
  return {
    get ready() { return revealedAt !== null; },
    get revealedAt() { return revealedAt; },
    get imports() { return imports; },
    get draws() { return draws; },
    get lastDraw() { return lastDraw; },
    get pendingFrames() { return callbacks.size; },
    stage, status,
    async advance(milliseconds) {
      for (let left = milliseconds; left > 0; left -= 40) {
        now += Math.min(40, left);
        const pending = [...callbacks.values()];
        callbacks.clear();
        for (const callback of pending) callback(now);
        await flush();
      }
    },
    hidden(value) { document.hidden = value; events.get('visibilitychange')(); },
    visible(value) { intersection([{ isIntersecting: value }]); },
    async reduceMotion() { motion.matches = true; events.get('motion:change')(); await flush(); },
    async finishAssets() { releaseAssets(); await flush(); },
  };
}

test('fast assets load immediately but the badge waits for one visible cycle', async () => {
  const loader = await harness();
  assert.equal(loader.imports, 1);
  await loader.advance(PRISM_CYCLE_DURATION * 1000 - 40);
  assert.equal(loader.ready, false);
  await loader.advance(120);
  assert.equal(loader.ready, true);
  assert.ok(loader.lastDraw >= PRISM_CYCLE_DURATION);
  assert.equal(loader.pendingFrames, 0);
});

test('offscreen and background time do not count as played cycles', async () => {
  const loader = await harness();
  await loader.advance(2000);
  const draws = loader.draws;
  loader.hidden(true);
  await loader.advance(12000);
  assert.equal(loader.draws, draws);
  loader.hidden(false);
  loader.visible(false);
  await loader.advance(12000);
  assert.equal(loader.draws, draws);
  assert.equal(loader.ready, false);
  loader.visible(true);
  await loader.advance(PRISM_CYCLE_DURATION * 1000 - 2040);
  assert.equal(loader.ready, false);
  await loader.advance(240);
  assert.equal(loader.ready, true);
});

test('slow assets keep the loader running beyond one cycle', async () => {
  const loader = await harness({ slow: true });
  await loader.advance(5000);
  assert.equal(loader.ready, false);
  assert.ok(loader.lastDraw > PRISM_CYCLE_DURATION);
  await loader.finishAssets();
  assert.equal(loader.ready, true);
});

test('reduced motion and an unavailable canvas cannot block badge startup', async () => {
  assert.equal((await harness({ reduced: true })).ready, true);
  assert.equal((await harness({ canvasAvailable: false })).ready, true);
  const loader = await harness();
  await loader.advance(500);
  await loader.reduceMotion();
  assert.equal(loader.ready, true);
  assert.equal(loader.lastDraw, PRISM_STILL_TIME);
});

test('loader preview keeps looping and never imports the badge', async () => {
  const loader = await harness({ preview: true });
  await loader.advance(9000);
  assert.equal(loader.imports, 0);
  assert.equal(loader.ready, false);
  assert.ok(loader.pendingFrames > 0);
});

test('a failed badge download stops the loader and announces the fallback', async () => {
  const loader = await harness({ fail: true });
  assert.equal(loader.stage.getAttribute('aria-busy'), 'false');
  assert.equal(loader.pendingFrames, 0);
  assert.match(loader.status.textContent, /unavailable/);
});
