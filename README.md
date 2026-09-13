# Xiao Tang's homepage

A static GitHub Pages site. The homepage includes a locally bundled Three.js
profile card with a black helical spring driven by Rapier. Existing project pages and research
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
- `js/home/card-textures.js`: 2048 × 2880 front/back card artwork.
- `js/home/entrance.js`: connected initial pendulum pose and progressive settling.
- `js/home/lanyard.js`: shared suspension attachment position.
- `js/home/spring-ribbon.js`: six damped spring segments that stretch, compress, and carry recoil along the suspension.
- `js/home/spring-coil.js`: an 11-turn black round-wire helix with fixed wire thickness, transported along the bending spring chain. Geometry and normal buffers update in place.
- `js/home/hardware.js`: independent strap-side D-ring, swivel, through-hole spring hook, and card eyelet.
- `tests/badge-hardware.test.mjs`: aperture clearance, swivel isolation, and ribbon attachment regressions.
- `images/home/`: the badge's vector field study and the homepage's charcoal flower illustration.
- `images/home/flower-noir-v2.jpg`: charcoal artwork with the cropped hand and wrist completed, with its imagegen prompt in the adjacent Markdown file. The previous v1 asset remains available.
- `lib/kozuka gothic/kozuka gothic.otf`: original Chinese typeface, loaded before baking card text.
- `images/avatar-400.jpg`: original portrait, rendered as a separate sRGB photo layer on the back. Its neutral print tint and unlit material keep studio lights and ACES from washing out skin tones.

The first screen has a plain charcoal background. The biography illustration
extends to the left edge of the viewport, opposite the separate body copy.
The light "Biography." title overlaps its upper third, leaving more of the
flower visible below. The hand's upper contour and knuckles are fully visible;
its wrist enters naturally from the left. The image is raised slightly relative
to the title. The enlarged 4:3 image uses crisp edges without fades or
blur. On narrow screens the image remains flush left above the body copy, with
its size limited on short screens to preserve the full text. The decorative
image never intercepts input.

On entry the card swings in from the right with slight depth and pitch,
counter-swings, and settles. Drag releases add restrained depth and twist;
the card turns slightly with its momentum before returning to its resting yaw.
Dragging, flipping, or resetting immediately takes over from the entrance.
Matte card faces preserve text contrast; the renderer uses 2×–3× sampling based on display density and refreshes it when the viewport changes.

The card has no visible toolbar or interaction instructions. On each page load,
it briefly turns just past edge-on to reveal a sliver
of the reverse after settling, then returns to the front. Clicking, dragging,
or a keyboard action takes over immediately. This cue runs once per load, replays
after refresh, and respects
reduced motion. `js/home/flip-peek.js` controls its timing and cancellation.
Drag to move it;
release to let it settle. Click the card to see the reverse. Enter/Space also
flip a focused card, and R restores its position. Additional pointers, cancelled gestures, and tab
visibility changes release an active drag. Rendering pauses offscreen and in
hidden tabs. Reduced-motion mode disables automatic swinging and animated flips.
A static profile stays available when JavaScript or WebGL cannot load.

The lower hook rotates with the card around the swivel; the D-ring and coil
follow its swing without inheriting its twist. A black eye terminal connects the
coil to the D-ring's horizontal bar. The continuous hook passes through the
eyelet and clears both card faces. The spring chain is preloaded for the badge's
weight so its resting height stays consistent. Pulling it opens the helix pitch
and stores spring energy; release produces a short, damped rebound.
Run `npm test` to check these constraints and the spring recovery.

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
