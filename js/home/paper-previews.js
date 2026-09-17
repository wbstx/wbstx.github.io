// Paper previews belong to the publication list, independently of the badge.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const previews = new Map([...document.querySelectorAll('.publication-list img[data-animated-src]')]
  .map(image => [image, {
    image, poster: image.getAttribute('src'), animation: image.dataset.animatedSrc,
    visible: false, ready: false, loading: false, failed: false,
  }]));

function sync(preview) {
  const playing = preview.visible && !document.hidden && !motion.matches;
  const source = playing && preview.ready ? preview.animation : preview.poster;
  if (preview.image.getAttribute('src') !== source) preview.image.src = source;
  if (!playing || preview.ready || preview.loading || preview.failed) return;

  preview.loading = true;
  const animation = new Image();
  animation.decoding = 'async';
  animation.fetchPriority = 'low';
  animation.onload = () => {
    preview.loading = false;
    preview.ready = true;
    sync(preview);
  };
  animation.onerror = () => {
    preview.loading = false;
    preview.failed = true;
  };
  animation.src = preview.animation;
}

if (typeof IntersectionObserver === 'function') {
  // The viewport root includes clipping by both the page and the inner list.
  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting, intersectionRatio } of entries) {
      const preview = previews.get(target);
      preview.visible = isIntersecting && intersectionRatio > 0;
      if (!preview.visible) preview.failed = false;
      sync(preview);
    }
  }, { threshold: 0 });
  for (const image of previews.keys()) observer.observe(image);
} else {
  for (const preview of previews.values()) { preview.visible = true; sync(preview); }
}

const syncAll = () => previews.forEach(sync);
document.addEventListener('visibilitychange', syncAll);
motion.addEventListener('change', syncAll);
