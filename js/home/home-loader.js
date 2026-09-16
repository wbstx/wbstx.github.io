import { createPrismScene, drawPrism, PRISM_CYCLE_DURATION, PRISM_STILL_TIME } from './halftone.js';

function mountLoader() {
  const root = document.documentElement;
  const stage = document.querySelector('#home-loader');
  const main = document.querySelector('#main');
  const canvas = document.querySelector('#home-loader-canvas');
  // A late download must not cover a page already released by the watchdog.
  if (!root.classList.contains('is-loading') || !stage || !main) return;

  const preview = ['localhost', '127.0.0.1'].includes(location.hostname)
    && new URLSearchParams(location.search).get('preview') === 'loader';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, last = null, elapsed = 0, finished = false;
  let assetsReady = false, minimumPlayed = motion.matches;
  let observer, assetTimer, context, scene;
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
    main.inert = false;
    stage.setAttribute('aria-busy', 'false');
    stage.setAttribute('aria-hidden', 'true');
    root.classList.remove('is-loading');
  }

  function maybeReveal() {
    if (!preview && minimumPlayed && assetsReady) reveal();
  }

  function draw() {
    if (context) drawPrism(context, scene, motion.matches ? PRISM_STILL_TIME : elapsed);
  }

  function tick(now) {
    frame = 0;
    if (finished || document.hidden || motion.matches) return;
    try {
      if (last === null) last = now;
      if (now - last >= 1000 / 30) {
        // Count rendered foreground time, not time spent in a background tab.
        elapsed += Math.min((now - last) / 1000, .1);
        last = now;
        draw();
        if (elapsed >= PRISM_CYCLE_DURATION) minimumPlayed = true;
        maybeReveal();
      }
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
    if (motion.matches) minimumPlayed = true;
    draw();
    maybeReveal();
    sync();
  }

  function resize() {
    const resolution = Math.max(1, Math.min(3, devicePixelRatio || 1));
    canvas.width = scene.width * resolution;
    canvas.height = scene.height * resolution;
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    draw();
  }

  try {
    main.inert = true;
    for (const type of blockedEvents) document.addEventListener(type, blockInput, { capture: true, passive: false });
    context = canvas?.getContext('2d');
    if (context) {
      scene = createPrismScene();
      resize();
      canvas.parentElement.classList.add('has-canvas');
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
      document.addEventListener('visibilitychange', sync);
      motion.addEventListener('change', changeMotion);
      sync();
    } else minimumPlayed = true;

    // Decode only the profile artwork; lazy paper thumbnails must not hold up entry.
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
