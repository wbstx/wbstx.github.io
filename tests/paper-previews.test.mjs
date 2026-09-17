import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../js/home/paper-previews.js', import.meta.url), 'utf8');

function harness({ reduced = false, observerAvailable = true } = {}) {
  const requests = [], observed = [];
  let intersect, visibilityChange, motionChange;
  const images = ['first', 'second'].map(name => ({
    src: `/posters/${name}.jpg`,
    dataset: { animatedSrc: `/${name}.webp` },
    getAttribute() { return this.src; },
  }));
  const document = {
    hidden: false, querySelectorAll: () => images,
    addEventListener(type, callback) { visibilityChange = callback; },
  };
  const motion = {
    matches: reduced,
    addEventListener(type, callback) { motionChange = callback; },
  };
  runInNewContext(source, {
    document, matchMedia: () => motion,
    Image: class { constructor() { requests.push(this); } },
    IntersectionObserver: observerAvailable ? class {
      constructor(callback) { intersect = callback; }
      observe(image) { observed.push(image); }
    } : undefined,
  });
  return {
    images, requests, observed,
    visible(index, value) {
      intersect([{ target: images[index], isIntersecting: value, intersectionRatio: value ? .5 : 0 }]);
    },
    hide(value) { document.hidden = value; visibilityChange(); },
    reduce(value) { motion.matches = value; motionChange(); },
  };
}

test('the homepage includes the paper playback module without loading the badge', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<script type="module" src="\/js\/home\/generated\/paper-previews\.js"><\/script>/);
  assert.doesNotMatch(html, /<script[^>]+src="[^"]*badge[^"/]*\.js"/);
});

test('only visible papers load, and their posters remain until animation is ready', () => {
  const app = harness();
  assert.equal(app.observed.length, 2);
  assert.equal(app.requests.length, 0);
  app.visible(0, true);
  app.visible(0, true);
  assert.equal(app.requests.length, 1);
  assert.equal(app.images[0].src, '/posters/first.jpg');
  app.requests[0].onload();
  assert.equal(app.images[0].src, '/first.webp');
  assert.equal(app.images[1].src, '/posters/second.jpg');
  app.visible(0, false);
  assert.equal(app.images[0].src, '/posters/first.jpg');
  app.visible(0, true);
  assert.equal(app.images[0].src, '/first.webp');
  assert.equal(app.requests.length, 1);
});

test('a late load cannot start a hidden preview; returning to the tab resumes visible papers', () => {
  const app = harness();
  app.visible(0, true);
  app.hide(true);
  app.requests[0].onload();
  assert.equal(app.images[0].src, '/posters/first.jpg');
  app.hide(false);
  assert.equal(app.images[0].src, '/first.webp');
  app.visible(1, true);
  app.visible(1, false);
  app.requests[1].onload();
  assert.equal(app.images[1].src, '/posters/second.jpg');
});

test('reduced motion keeps posters and can be changed without reloading', () => {
  const app = harness({ reduced: true });
  app.visible(0, true);
  assert.equal(app.requests.length, 0);
  app.reduce(false);
  app.requests[0].onload();
  assert.equal(app.images[0].src, '/first.webp');
  app.reduce(true);
  assert.equal(app.images[0].src, '/posters/first.jpg');
});

test('failed downloads retain the poster and retry when the paper re-enters', () => {
  const app = harness();
  app.visible(0, true);
  app.requests[0].onerror();
  assert.equal(app.images[0].src, '/posters/first.jpg');
  app.visible(0, false);
  app.visible(0, true);
  assert.equal(app.requests.length, 2);
  app.requests[1].onload();
  assert.equal(app.images[0].src, '/first.webp');
});

test('previews also load when IntersectionObserver is unavailable', () => {
  const app = harness({ observerAvailable: false });
  assert.equal(app.requests.length, 2);
  app.requests[0].onload();
  assert.equal(app.images[0].src, '/first.webp');
});
