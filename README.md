# Xiao Tang's homepage

A static GitHub Pages site. The homepage includes a locally bundled Three.js
profile card with a Rapier physics lanyard. Existing project pages and research
assets remain ordinary static files.

## Local development

Use Node.js 22 or later, then run from this repository:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. JavaScript changes are rebuilt automatically;
refresh the browser to see edits. Set `PORT` to use another port.

To preview the checked-in build without installing packages:

```sh
npm run preview
```

## Editing the first screen

- `index.html`: compact profile, links, accessible fallback, and existing publications.
- `css/home.css`: the charcoal, silver, and blue-gray theme across the whole homepage.
- `js/home/badge.js`: geometry, lighting, physics, dragging, and flip controls.
- `js/home/card-textures.js`: 2048 × 2880 front/back card artwork and woven strap texture.
- `js/home/entrance.js`: connected initial pendulum pose and progressive settling.
- `js/home/lanyard.js`: shared attachment geometry and ribbon orientation.
- `js/home/hardware.js`: independent strap-side D-ring, swivel, through-hole spring hook, and card eyelet.
- `tests/badge-hardware.test.mjs`: aperture clearance, swivel isolation, and ribbon attachment regressions.
- `images/home/`: original vector field study and background curves.
- `lib/kozuka gothic/kozuka gothic.otf`: original Chinese typeface, loaded before baking card text.
- `images/avatar-400.jpg`: original portrait, rendered as a separate sRGB photo layer on the back. Its neutral print tint and unlit material keep studio lights and ACES from washing out skin tones.

On entry the card swings in from the right, counter-swings, and settles.
Dragging, flipping, or resetting immediately takes over from the entrance.
Matte card faces preserve text contrast; the renderer uses 2×–3× sampling based on display density and refreshes it when the viewport changes.

The card has no visible toolbar or interaction instructions. Drag to move it;
release to let it settle. Click the card to see the reverse. Enter/Space also
flip a focused card, and R restores its position. Additional pointers, cancelled gestures, and tab
visibility changes release an active drag. Rendering pauses offscreen and in
hidden tabs. Reduced-motion mode disables automatic swinging and animated flips.
A static profile stays available when JavaScript or WebGL cannot load.

The lower hook rotates with the card around the swivel; the D-ring and strap
follow its swing without inheriting its twist. The continuous hook passes through
the eyelet and clears both card faces. Run `npm test` to check these constraints.

## Static build

```sh
npm run build
```

Commit the generated `js/home/generated/` files with source changes when ready
to publish. GitHub Pages can serve them directly; no server-side runtime, CDN,
or change to the existing deployment method is required. This command only
builds locally and does not publish anything.

The original site was built with [Hexo](https://hexo.io/) and
[Cactus](https://github.com/probberechts/hexo-theme-cactus).

## Full-page navigation

The homepage is divided into three full-screen chapters: profile, biography,
and publications. The publication chapter has a fixed research summary on the
left and an independently scrolling list of all 12 papers on the right. Scroll
over the summary to change chapters; the paper list stays within its own bounds.
On narrow screens the fixed summary sits above the scrolling list.
`js/home/pages.js` handles wheel, touch, keyboard, and direct hash links;
`js/home/page-input.js` keeps trackpad momentum within one page per gesture.
A 460 ms page transition respects reduced motion. Only the publication list
scrolls internally; the biography, margins, and fixed summary all accept page-turn
gestures. There are no visible page navigation bars, counters, or jump links.
Profile links sit with the contact details. A screen-reader status announces each
chapter, and keyboard scrolling remains available. Renewed trackpad pushes and reversals can turn the
next page without waiting for all momentum to stop. Dragging the badge keeps its
own gesture, and short screens use a compact biography layout. Without JavaScript the same sections remain a
normal readable document. Run `npm test` for gesture and badge regressions.
