import { createPrismScene, PRISM_CYCLE_DURATION, PRISM_STILL_TIME } from './halftone.js';
import { drawPrismFlow, easeFlow, FLOW_START, FLOW_DURATION } from './prism-flow.js';
import { prismFieldTargets, setPrismField } from './field-lines.js';

const PLAYBACK_RATE = 1.6;

function mountLoader() {
  const root = document.documentElement;
  const stage = document.querySelector('#home-loader');
  const main = document.querySelector('#main');
  const canvas = document.querySelector('#home-loader-canvas');
  const visual = document.querySelector('.home-loader-visual');
  // A late download must not cover a page already released by the watchdog.
  if (!root.classList.contains('is-loading') || !stage || !main) return;

  const preview = ['localhost', '127.0.0.1'].includes(location.hostname)
    && new URLSearchParams(location.search).get('preview') === 'loader';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, last = null, elapsed = 0, finished = false;
  let assetsReady = false, transitionStart = null, progress = 0;
  let observer, assetTimer, context, scene, viewport, targets;
  const blockedEvents = ['wheel', 'touchstart', 'touchmove', 'touchend', 'keydown'];

  function blockInput(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.touches?.length > 1) return;
    if (event.type === 'keydown' && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab'].includes(event.key)) return;
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  }

  function reveal() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    clearTimeout(assetTimer);
    clearTimeout(window.homeLoaderWatchdog);
    observer?.disconnect();
    document.removeEventListener('visibilitychange', sync);
    motion.removeEventListener('change', changeMotion);
    for (const type of blockedEvents) document.removeEventListener(type, blockInput, true);
    // These are the same curves, colors, and widths as the final canvas frame.
    setPrismField(1, progress >= 1 || motion.matches);
    main.style.removeProperty('--entry-opacity');
    main.inert = false;
    stage.setAttribute('aria-busy', 'false');
    stage.setAttribute('aria-hidden', 'true');
    root.classList.remove('is-loading');
    root.classList.remove('is-entering');
  }

  function maybeReveal() {
    if (!preview && assetsReady && (!context || motion.matches
      || (progress >= 1 && elapsed * PLAYBACK_RATE >= PRISM_CYCLE_DURATION))) reveal();
  }

  function draw() {
    if (!preview && assetsReady && transitionStart === null && elapsed >= FLOW_START) transitionStart = elapsed;
    progress = motion.matches ? 1 : transitionStart === null ? 0 : Math.min(1, (elapsed - transitionStart) / FLOW_DURATION);
    const seconds = motion.matches ? PRISM_STILL_TIME
      : preview ? elapsed * PLAYBACK_RATE : Math.min(elapsed * PLAYBACK_RATE, PRISM_STILL_TIME);
    stage.dataset.progress = progress.toFixed(3);
    if (progress > 0) root.classList.add('is-entering');
    // Reveal content while light is still unfolding, without a second page entrance.
    main.style.setProperty('--entry-opacity', String(easeFlow((progress - .12) / .65)));
    setPrismField(easeFlow((progress + .05) / .9));
    if (context) drawPrismFlow(context, scene, viewport, seconds, progress, targets);
  }

  function tick(now) {
    frame = 0;
    if (finished || document.hidden || motion.matches) return;
    try {
      // Count visible animation time; returning to a tab cannot skip the transition.
      if (last !== null) elapsed += Math.min((now - last) / 1000, .1);
      last = now;
      draw();
      maybeReveal();
      if (!finished) frame = requestAnimationFrame(tick);
    } catch (error) {
      console.error('The homepage loading animation could not render:', error);
      reveal();
    }
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
    if (!finished && context && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
  }

  function changeMotion() {
    draw();
    maybeReveal();
    sync();
  }

  function resize() {
    const bounds = stage.getBoundingClientRect(), art = visual.getBoundingClientRect();
    const resolution = Math.max(1, Math.min(2, devicePixelRatio || 1));
    viewport = { width: bounds.width, height: bounds.height, scale: art.width / scene.width,
      origin: [art.left - bounds.left, art.top - bounds.top] };
    canvas.width = Math.round(bounds.width * resolution);
    canvas.height = Math.round(bounds.height * resolution);
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    targets = prismFieldTargets();
    draw();
  }

  try {
    main.inert = true;
    for (const type of blockedEvents) document.addEventListener(type, blockInput, { capture: true, passive: false });
    context = canvas?.getContext('2d');
    if (context) {
      scene = createPrismScene();
      resize();
      stage.classList.add('has-canvas');
      observer = new ResizeObserver(resize);
      observer.observe(stage);
      document.addEventListener('visibilitychange', sync);
      motion.addEventListener('change', changeMotion);
      sync();
    }

    // Lazy paper thumbnails never delay entry. A stalled image gets a bounded wait.
    const images = [...main.querySelectorAll('img[fetchpriority="high"], .publication-art img')];
    const ready = () => {
      clearTimeout(assetTimer);
      assetsReady = true;
      maybeReveal();
    };
    assetTimer = setTimeout(ready, 8000);
    Promise.allSettled([...images.map(image => image.decode()), document.fonts?.ready]).then(ready);
    clearTimeout(window.homeLoaderWatchdog);
  } catch (error) {
    console.error('The homepage loading animation could not start:', error);
    reveal();
  }
}

mountLoader();
