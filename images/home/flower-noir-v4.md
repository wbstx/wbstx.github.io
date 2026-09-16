# Biography artwork — native transparency

Mode: built-in imagegen, background-extraction edit.

Input: `images/home/flower-noir-v3.jpg`.
Website asset: `images/home/flower-noir-v4.png`.
Output: 1448 × 1086 RGBA PNG, copied without re-encoding from the generated output.

The image has a real alpha channel: 1,031,947 pixels are fully transparent,
including all four corners. Foreground samples are nearly opaque (alpha 253).
The image is rendered with normal alpha compositing. The previous opaque
container background and both CSS `mix-blend-mode: lighten` rules are removed.
The existing illustration layout and 4:3 aspect ratio remain unchanged.
The earlier source assets are preserved.

## Final prompt

Use case: background-extraction. Image 1 is the exact edit target, a website biography illustration. Remove only the solid black background and output a PNG with actual transparent alpha (zero alpha outside the hand, leaves, stem and flower, including the spaces between them). This must be real RGBA transparency, NOT a painted checkerboard, black matte, white matte or simulated transparency. Preserve the foreground exactly: hand and wrist entering from left, grip, two leaves, thin stem, violet flower, interior dark shadows and ink contours, muted gray colors, subtle paper grain. Keep the same 4:3 canvas, framing, size and placement of every element. Do not redesign, recolor, brighten or recompose anything. Preserve the dark interior linework as opaque foreground. Crisp silhouette with natural antialiased edge, no glow, drop shadow, feathered rectangle or blur. The delivered asset will be displayed with normal alpha compositing over a charcoal webpage with visible background lines. Output the transparent cutout alone.
