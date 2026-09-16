import artwork from '../../images/home/field-lines.svg';
import { createLineWake } from './line-wake.js';

const pointer = matchMedia('(hover: hover) and (pointer: fine)');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let dispose = null;

function mountBackground() {
  const parsed = new DOMParser().parseFromString(artwork, 'image/svg+xml');
  const svg = document.importNode(parsed.documentElement, true);
  svg.classList.add('field-background');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  document.body.prepend(svg);

  const box = svg.viewBox.baseVal;
  const paths = [...svg.querySelectorAll('path')].map(element => ({
    element, original: element.getAttribute('d'), length: element.getTotalLength(),
    bounds: element.getBBox(), points: [], changed: false,
  }));
  const wake = createLineWake();
  let frame = 0, previousFrame = 0;
  let width = 0, height = 0, scale = 1, offsetX = 0, offsetY = 0;

  function restore() {
    for (const path of paths) {
      if (path.changed) path.element.setAttribute('d', path.original);
      path.changed = false;
    }
  }

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousFrame = 0;
    wake.clear();
    restore();
  }

  function resize() {
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height || (width === rect.width && height === rect.height)) return;
    reset();
    width = rect.width;
    height = rect.height;
    scale = Math.max(width / box.width, height / box.height);
    offsetX = (width - box.width * scale) / 2 - box.x * scale;
    offsetY = (height - box.height * scale) / 2 - box.y * scale;
    for (const path of paths) {
      path.points = [];
      const top = path.bounds.y * scale + offsetY;
      const bottom = (path.bounds.y + path.bounds.height) * scale + offsetY;
      if (bottom < -4 || top > height + 4) continue;
      const count = Math.min(480, Math.ceil(path.length * scale / 8));
      for (let i = 0; i <= count; i++) {
        const point = path.element.getPointAtLength(path.length * i / count);
        path.points.push([point.x, point.y]);
      }
    }
  }

  function draw(time) {
    for (const path of paths) {
      if (!path.points.length) continue;
      let changed = false;
      const d = path.points.map(([x, y], i) => {
        const displacement = wake.offset(x * scale + offsetX, y * scale + offsetY, time);
        changed ||= Math.abs(displacement) > .015;
        return `${i ? 'L' : 'M'}${x.toFixed(2)} ${(y + displacement / scale).toFixed(2)}`;
      }).join(' ');
      if (changed) path.element.setAttribute('d', d);
      else if (path.changed) path.element.setAttribute('d', path.original);
      path.changed = changed;
    }
  }

  function tick(now) {
    frame = 0;
    if (document.hidden) { reset(); return; }
    if (!wake.advance(now / 1000)) { restore(); previousFrame = 0; return; }
    if (!previousFrame || now - previousFrame >= 1000 / 30) {
      previousFrame = now;
      draw(now / 1000);
    }
    frame = requestAnimationFrame(tick);
  }

  function move(event) {
    if (event.pointerType !== 'mouse' || document.hidden) return;
    if (wake.move(event.clientX, event.clientY, performance.now() / 1000) && !frame) {
      frame = requestAnimationFrame(tick);
    }
  }
  function leave(event) { if (!event.relatedTarget) wake.leave(); }
  function visibility() { if (document.hidden) reset(); }

  resize();
  document.body.classList.add('has-line-wake');
  const observer = new ResizeObserver(resize);
  observer.observe(svg);
  // Observe mouse movement without owning input, including a captured badge drag.
  document.addEventListener('pointermove', move, { passive: true, capture: true });
  document.addEventListener('pointerout', leave, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', reset);
  return () => {
    reset();
    observer.disconnect();
    document.removeEventListener('pointermove', move, true);
    document.removeEventListener('pointerout', leave);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('blur', reset);
    document.body.classList.remove('has-line-wake');
    svg.remove();
  };
}

function sync() {
  if (pointer.matches && !motion.matches) dispose ||= mountBackground();
  else { dispose?.(); dispose = null; }
}
pointer.addEventListener('change', sync);
motion.addEventListener('change', sync);
sync();
