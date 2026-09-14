# Biography artwork — background compositing

Mode: built-in imagegen, background-extraction edit.

Input: `flower-noir-v2.jpg`, the existing biography illustration.
Output: 1448 × 1086 opaque PNG, encoded as JPEG at quality 90 for the website.
Website asset: `images/home/flower-noir-v3.jpg`.

The initial transparent-background request returned an opaque checkerboard and
was rejected. The final image uses a near-black compositing matte instead of
claiming an alpha channel. CSS `mix-blend-mode: lighten` over the biography's
`#111416` background removes that matte on the webpage. The subject's hand,
leaves, flower, scale and placement are preserved as closely as possible. No
edge blur, feathered rectangular mask, or background shadow is used.
The previous source assets remain unchanged.

## Final prompt

Use case: background-extraction.
Asset type: a dark illustration cutout to be composited using the CSS lighten blend mode.
Input image 1 is the exact EDIT TARGET. Change ONLY its background. Preserve the existing foreground artwork exactly: same hand/wrist, grip, two leaves, stem, flower, every contour, interior shadow, thin ink line, color, scale and placement. Do not redraw or beautify the subjects.
Replace the entire textured dark background and all shadows cast onto it with UNIFORM SOLID PURE BLACK RGB(0,0,0), hex #000000. This is an opaque black compositing matte, NOT transparency. Black must be completely flat everywhere outside the foreground, including every space between leaves, stem and petals. Absolutely no texture, noise, folds, gray gradation, lighting, shadows, checkerboard or white backdrop in the background.
Keep the original subdued gray hand and leaves, smoky desaturated violet flower, fine grain inside the subjects, and crisp black ink contours. Preserve landscape 4:3 canvas and exact source framing. Wrist enters from the left edge exactly as before. No new objects, no typography, no outlines or halo outside the silhouette, no blur or feathering. Do not flatten or erase any interior foreground detail.
One finished opaque PNG with a fully uniform #000000 background, suitable for direct compositing over a charcoal webpage.
