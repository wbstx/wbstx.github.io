import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createWheelRouter, swipeDirection } from '../js/home/page-input.js';

const source = (await readFile(process.env.PAGES_SOURCE || new URL('../js/home/pages.js', import.meta.url), 'utf8'))
  .replace(/^import .*?;\n/, '');

// Run the real page entrypoint with browser events and a deterministic clock.
// Scrollport movement and layout changes can be injected independently, as
// happens when mobile browser chrome or a restored viewport changes position.
function harness({ hash = '#about', reduced = false } = {}) {
  let now = 0, nextId = 0, resize;
  const timers = new Map(), frames = new Map();
  function eventTarget(target = {}) {
    const listeners = new Map();
    return Object.assign(target, {
      addEventListener(name, callback) {
        const callbacks = listeners.get(name) || [];
        callbacks.push(callback);
        listeners.set(name, callbacks);
      },
      emit(name, data = {}) {
        const event = { target, defaultPrevented: false, cancelable: true,
          preventDefault() { this.defaultPrevented = true; }, ...data };
        for (const callback of listeners.get(name) || []) callback(event);
        return event;
      },
    });
  }
  const location = { hash };
  const status = { textContent: '' };
  let document;
  const main = eventTarget({
    scrollTop: 0, clientHeight: 844, clientWidth: 390, style: {},
    getBoundingClientRect: () => ({ top: 0 }),
    querySelector: () => null,
    querySelectorAll: () => pages,
  });
  const pages = ['about', 'Biography', 'Publications'].map((id, index) => ({
    id, dataset: { pageLabel: id },
    getBoundingClientRect: () => ({ top: index * main.clientHeight - main.scrollTop }),
    closest: selector => selector === '.page' ? pages[index] : null,
    toggleAttribute() {},
    focus() { document.activeElement = this; main.emit('focusin', { target: this }); },
  }));
  const papers = {
    scrollTop: 0, clientHeight: 500, scrollHeight: 4500,
    closest: selector => selector === '.publication-list' ? papers : selector === '.page' ? pages[2] : null,
  };
  document = eventTarget({
    activeElement: null,
    documentElement: { classList: { add() {} } },
    querySelector: selector => ({ '#main': main, '#page-status': status })[selector],
    getElementById: id => id === 'main' ? main : pages.find(page => page.id === id),
  });
  const window = eventTarget();
  runInNewContext(source, {
    document, window, location, performance: { now: () => now },
    history: { replaceState: (_, __, value) => { location.hash = value; } },
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    createWheelRouter, swipeDirection,
    requestAnimationFrame: callback => { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (callback, delay) => { const id = ++nextId; timers.set(id, { at: now + delay, callback }); return id; },
    clearTimeout: id => timers.delete(id),
    ResizeObserver: class {
      constructor(callback) { resize = callback; }
      observe() {}
    },
  });
  const app = {
    main, pages, papers, document, window, location, status,
    advance(milliseconds) {
      const end = now + milliseconds;
      while (now < end) {
        now = Math.min(end, now + 16);
        const pending = [...frames.values()];
        frames.clear();
        for (const callback of pending) callback(now);
        for (const [id, timer] of [...timers]) {
          if (timer.at <= now) { timers.delete(id); timer.callback(); }
        }
      }
    },
    nativeScroll(top) { main.scrollTop = top; main.emit('scroll'); },
    layout(height) { main.clientHeight = height; resize?.(); },
    swipe(delta, target = pages[0]) {
      document.emit('touchstart', { target, touches: [{ clientX: 190, clientY: 400 }] });
      const move = document.emit('touchmove', { target, touches: [{ clientX: 190, clientY: 400 - delta }] });
      document.emit('touchend', { target, changedTouches: [{ clientX: 190, clientY: 400 - delta }] });
      return move;
    },
  };
  return app;
}

test('an unexpected mobile scroll reset cannot rewrite Biography as the homepage', () => {
  const app = harness({ hash: '#Biography' });
  app.nativeScroll(0);
  app.advance(160);
  assert.equal(app.location.hash, '#Biography');
  assert.equal(app.main.scrollTop, app.main.clientHeight);
  assert.match(app.status.textContent, /^2 \/ 3/);
});

test('viewport layout changes stay on the selected chapter without a window resize', () => {
  const app = harness({ hash: '#Publications' });
  app.papers.scrollTop = 420;
  for (const height of [700, 760, 844, 390]) {
    app.layout(height);
    assert.equal(app.main.scrollTop, height * 2);
    assert.equal(app.location.hash, '#Publications');
    assert.equal(app.papers.scrollTop, 420);
  }
});

test('a viewport resize during a swipe preserves its destination and the next swipe', () => {
  const app = harness();
  assert.equal(app.swipe(100).defaultPrevented, true);
  app.advance(100);
  app.window.emit('resize'); // A browser event may precede the final layout.
  app.layout(740);
  app.nativeScroll(0);
  app.advance(500);
  assert.equal(app.location.hash, '#Biography');
  assert.equal(app.main.scrollTop, 740);
  app.swipe(100, app.pages[1]);
  app.advance(500);
  assert.equal(app.location.hash, '#Publications');
  assert.equal(app.main.scrollTop, 1480);
});

test('a fresh downward swipe exits the paper top once, without skipping Biography', () => {
  const app = harness({ hash: '#Publications' });
  assert.equal(app.swipe(-80, app.papers).defaultPrevented, true);
  app.advance(500);
  app.nativeScroll(0);
  app.advance(160);
  assert.equal(app.location.hash, '#Biography');
  assert.equal(app.main.scrollTop, app.main.clientHeight);
});

test('paper reading remains native and never changes the selected chapter', () => {
  const app = harness({ hash: '#Publications' });
  assert.equal(app.swipe(100, app.papers).defaultPrevented, false);
  app.papers.scrollTop = 200;
  assert.equal(app.swipe(-100, app.papers).defaultPrevented, false);
  app.advance(500);
  assert.equal(app.location.hash, '#Publications');
  assert.equal(app.papers.scrollTop, 200);
});

test('explicit hashes and keyboard focus still navigate between chapters', () => {
  const app = harness();
  app.location.hash = '#Publications';
  app.window.emit('hashchange');
  assert.equal(app.main.scrollTop, 1688);
  app.pages[1].focus();
  assert.equal(app.location.hash, '#Biography');
  assert.equal(app.main.scrollTop, 844);
});

test('reduced motion paging lands immediately and survives a restored scroll offset', () => {
  const app = harness({ reduced: true });
  app.swipe(100);
  assert.equal(app.main.scrollTop, 844);
  app.nativeScroll(0);
  app.advance(160);
  assert.equal(app.location.hash, '#Biography');
  assert.equal(app.main.scrollTop, 844);
});
