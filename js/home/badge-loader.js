import { createPrismScene, drawPrism, PRISM_CYCLE_DURATION, PRISM_STILL_TIME } from './halftone.js';

const stage = document.querySelector('#badge-stage');
const canvas = document.querySelector('#badge-loader');
const context = canvas?.getContext('2d');
let finishMinimumPlayback;
const minimumPlayback = new Promise(resolve => { finishMinimumPlayback = resolve; });

if (stage && context) {
  const scene = createPrismScene();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, last = 0, elapsed = 0, visible = true;
  const loading = () => stage.getAttribute('aria-busy') === 'true' && !stage.classList.contains('is-ready');
  const active = () => loading() && visible && !document.hidden && !motion.matches;

  function draw() { drawPrism(context, scene, motion.matches ? PRISM_STILL_TIME : elapsed); }
  function tick(now) {
    frame = 0;
    if (!active()) return;
    // Sample the stepped light at 30 fps while leaving time for badge startup.
    if (!last || now - last >= 1000 / 30) {
      if (last) elapsed += Math.min((now - last) / 1000, .1);
      last = now;
      draw();
      if (elapsed >= PRISM_CYCLE_DURATION) finishMinimumPlayback();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (active()) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const resolution = Math.max(1, Math.min(3, devicePixelRatio || 1));
    canvas.width = scene.width * resolution;
    canvas.height = scene.height * resolution;
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    draw();
  }

  resize();
  canvas.parentElement.classList.add('has-canvas');
  new ResizeObserver(resize).observe(canvas);
  new MutationObserver(sync).observe(stage, { attributes: true, attributeFilter: ['class', 'aria-busy'] });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(stage);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', () => {
    if (motion.matches) finishMinimumPlayback();
    draw();
    sync();
  });
  // A still fallback or reduced-motion setting must never trap badge startup.
  if (motion.matches) finishMinimumPlayback();
  sync();
} else finishMinimumPlayback();

// Local art direction preview; production always starts the interactive badge.
const preview = ['localhost', '127.0.0.1'].includes(location.hostname)
  && new URLSearchParams(location.search).get('preview') === 'loader';
if (!preview) {
  import(new URL('./badge.js', import.meta.url).href)
    .then(({ initBadge }) => initBadge(minimumPlayback))
    .catch(error => {
      console.error('The interactive card could not load:', error);
      stage?.setAttribute('aria-busy', 'false');
      const status = document.querySelector('#card-side');
      if (status) status.textContent = 'The interactive card is unavailable. Profile information is shown alongside it.';
    });
}
