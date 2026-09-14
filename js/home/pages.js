import { createWheelRouter, swipeDirection } from './page-input.js';

const main = document.querySelector('#main');
const pages = [...main.querySelectorAll('.page')];
const status = document.querySelector('#page-status');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const routeWheel = createWheelRouter();
let current = 0;
let animation = 0;
let turning = false;
let scrollTimer;
let touch = null;

const pageTop = index => pages[index].getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
const hashPage = () => {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return 0; }
  const target = document.getElementById(id);
  const index = pages.indexOf(target?.closest('.page'));
  return Math.max(0, index);
};

function updatePage(index, writeHash = true) {
  current = index;
  status.textContent = `${index + 1} / ${pages.length} — ${pages[index].dataset.pageLabel}`;
  pages.forEach((page, i) => page.toggleAttribute('data-current-page', i === index));
  if (writeHash && location.hash !== `#${pages[index].id}`) {
    history.replaceState(null, '', `#${pages[index].id}`);
  }
}

function goTo(index, instant = false, writeHash = true) {
  index = Math.max(0, Math.min(pages.length - 1, index));
  cancelAnimationFrame(animation);
  const from = main.scrollTop;
  const to = pageTop(index);
  const focusedPage = document.activeElement?.closest('.page');
  updatePage(index, writeHash);
  if (focusedPage && focusedPage !== pages[index]) pages[index].focus({ preventScroll: true });
  turning = true;
  main.style.scrollSnapType = 'none';
  const finish = () => {
    main.scrollTop = to;
    main.style.scrollSnapType = '';
    turning = false;
  };
  if (instant || motion.matches || Math.abs(to - from) < 1) { finish(); return; }
  const start = performance.now();
  function frame(time) {
    const t = Math.min(1, (time - start) / 460);
    main.scrollTop = from + (to - from) * (1 - (1 - t) ** 3);
    if (t < 1) animation = requestAnimationFrame(frame);
    else finish();
  }
  animation = requestAnimationFrame(frame);
}

// The paper list is the only inner scroll area. All other visible surfaces
// route to full-page navigation through wheel, touch, or scroll keys.
function publicationArea(target) {
  return target.closest('.publication-list');
}

document.addEventListener('wheel', event => {
  if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? main.clientHeight : 1);
  const region = publicationArea(event.target) ? 'papers' : 'page';
  const { preventDefault, direction } = routeWheel(delta, performance.now(), region, !!main.querySelector('.is-dragging'));
  if (preventDefault) event.preventDefault();
  if (direction) goTo(current + direction);
}, { passive: false });

document.addEventListener('touchstart', event => {
  if (event.touches.length !== 1 || event.defaultPrevented || main.querySelector('.is-dragging') || publicationArea(event.target)) { touch = null; return; }
  const point = event.touches[0];
  touch = { x: point.clientX, y: point.clientY };
}, { passive: true });
document.addEventListener('touchmove', event => {
  if (!touch) return;
  if (event.touches.length !== 1 || event.defaultPrevented || main.querySelector('.is-dragging')) { touch = null; return; }
  const point = event.touches[0];
  if (Math.abs(touch.y - point.clientY) > Math.abs(touch.x - point.clientX) && event.cancelable) event.preventDefault();
}, { passive: false });
document.addEventListener('touchend', event => {
  const gesture = touch;
  touch = null;
  if (!gesture || event.defaultPrevented || !event.changedTouches.length) return;
  const point = event.changedTouches[0];
  const direction = swipeDirection(gesture.x - point.clientX, gesture.y - point.clientY);
  if (direction) goTo(current + direction);
});
document.addEventListener('touchcancel', () => { touch = null; });

document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  // Space/Enter on a link, button, or the badge keep their original behavior.
  if ((event.key === ' ' || event.key === 'Enter') && event.target.closest('a, button, canvas')) return;
  const direction = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1, ' ': event.shiftKey ? -1 : 1 }[event.key];
  if (!direction && event.key !== 'Home' && event.key !== 'End') return;
  event.preventDefault();
  if (turning || event.repeat) return;
  const readingArea = publicationArea(event.target);
  if (readingArea) {
    if (event.key === 'Home' || event.key === 'End') readingArea.scrollTop = event.key === 'Home' ? 0 : readingArea.scrollHeight;
    else readingArea.scrollTop += direction * readingArea.clientHeight * .7;
    return;
  }
  goTo(event.key === 'Home' ? 0 : event.key === 'End' ? pages.length - 1 : current + direction);
});
document.addEventListener('click', event => {
  const anchor = event.target.closest('a[href^="#"]');
  if (!anchor || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = document.getElementById(anchor.hash.slice(1));
  const index = target === main ? 0 : pages.indexOf(target?.closest('.page'));
  if (index < 0) return;
  event.preventDefault();
  goTo(index);
});
main.addEventListener('focusin', event => {
  const index = pages.indexOf(event.target.closest('.page'));
  if (index >= 0 && index !== current) goTo(index, true);
});
main.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    if (turning) return;
    const nearest = pages.reduce((best, _, i) => Math.abs(pageTop(i) - main.scrollTop) < Math.abs(pageTop(best) - main.scrollTop) ? i : best, 0);
    updatePage(nearest);
  }, 140);
}, { passive: true });
function followHash() {
  goTo(hashPage(), true, false);
  const target = document.getElementById(location.hash.slice(1));
  const area = target?.closest('[data-page-overflow]');
  if (area && target !== area) area.scrollTop = target.offsetTop - area.offsetTop;
}
window.addEventListener('hashchange', followHash);
window.addEventListener('resize', () => goTo(current, true));
window.addEventListener('pageshow', followHash);
window.addEventListener('blur', () => { touch = null; });
motion.addEventListener('change', () => goTo(current, true));

pages.forEach(page => page.tabIndex = -1);
document.documentElement.classList.add('is-paged');
followHash();
