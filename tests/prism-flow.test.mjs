import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPrismScene, PRISM_STILL_TIME, SPECTRUM } from '../js/home/halftone.js';
import { drawPrismFlow, morphBeam } from '../js/home/prism-flow.js';

const artwork = await readFile(new URL('../images/home/field-lines.svg', import.meta.url), 'utf8');
const curves = [...artwork.matchAll(/<path d="([^"]+)"/g)].slice(19, 24).map(match => {
  const values = match[1].match(/-?\d*\.?\d+/g).map(Number);
  return Array.from({ length: 4 }, (_, i) => values.slice(i * 2, i * 2 + 2));
});

test('the final frame exactly matches the real SVG background at desktop and phone sizes', () => {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const cover = Math.max(width / 1600, height / 1000);
    const targets = curves.map((curve, i) => ({
      curve: curve.map(([x, y]) => [x * cover + (width - 1600 * cover) / 2, y * cover + (height - 1000 * cover) / 2]),
      rgb: i ? SPECTRUM[i - 1] : [120, 133, 138], width: cover, opacity: i ? .22 : .1,
    }));
    const paths = [];
    let path;
    const context = {
      clearRect() {}, setLineDash(dashes) { this.dashes = dashes; },
      beginPath() { path = []; }, moveTo(...point) { path.push(point); },
      bezierCurveTo(...points) { for (let i = 0; i < 6; i += 2) path.push(points.slice(i, i + 2)); },
      stroke() { paths.push({ curve: path, rgb: this.strokeStyle, width: this.lineWidth, opacity: this.globalAlpha, dashes: this.dashes }); },
    };
    drawPrismFlow(context, createPrismScene(), { width, height, scale: .9, origin: [100, 100] }, PRISM_STILL_TIME, 1, targets);
    assert.equal(paths.length, 5);
    paths.forEach((path, i) => {
      path.curve.flat().forEach((value, j) => assert.ok(Math.abs(value - targets[i].curve.flat()[j]) < 1e-9));
      assert.equal(path.rgb, `rgb(${targets[i].rgb.join(',')})`);
      assert.ok(Math.abs(path.width - targets[i].width) < 1e-9);
      assert.ok(Math.abs(path.opacity - targets[i].opacity) < 1e-9);
      assert.deepEqual(path.dashes, []);
    });
  }
});

test('a light path moves continuously and settles without a position jump', () => {
  const start = [300, 300], end = [500, 340], target = curves[1];
  const first = morphBeam(start, end, target, 0);
  assert.deepEqual(first[0], start);
  assert.deepEqual(first[3], end);
  for (const t of [.1, .3, .5, .8, 1]) {
    const before = morphBeam(start, end, target, t - .00001).flat();
    const after = morphBeam(start, end, target, t).flat();
    assert.ok(after.every((value, i) => Number.isFinite(value) && Math.abs(value - before[i]) < .1));
  }
});
