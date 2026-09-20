import { paintPrismBody, prismBeams } from './halftone.js';

export const FLOW_DURATION = 1.55;
export const FLOW_START = 1.26;
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const pointMix = (a, b, t) => a.map((value, i) => mix(value, b[i], t));
export const easeFlow = value => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const rgb = color => `rgb(${color.map(Math.round).join(',')})`;

export function morphBeam(start, end, destination, progress) {
  const source = [start, pointMix(start, end, 1 / 3), pointMix(start, end, 2 / 3), end];
  return source.map((point, i) => pointMix(point, destination[i], easeFlow(progress)));
}

function prefix(points, t) {
  const a = pointMix(points[0], points[1], t), b = pointMix(points[1], points[2], t), c = pointMix(points[2], points[3], t);
  const d = pointMix(a, b, t), e = pointMix(b, c, t);
  return [points[0], a, d, pointMix(d, e, t)];
}

export function drawPrismFlow(context, scene, viewport, seconds, progress, targets) {
  const { width, height, scale, origin } = viewport;
  context.clearRect(0, 0, width, height);
  const bodyAlpha = 1 - easeFlow((progress - .12) / .63);
  const project = point => [origin[0] + point[0] * scale, origin[1] + point[1] * scale];
  context.globalAlpha = bodyAlpha;
  if (bodyAlpha > 0) paintPrismBody(scene, seconds, (x, y, radius, color) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(...project([x, y]), radius * scale, 0, Math.PI * 2);
    context.fill();
  });

  const move = easeFlow(progress);
  prismBeams(scene, seconds).forEach((beam, i) => {
    if (beam.head <= 0) return;
    const target = targets[i];
    const curve = morphBeam(project(beam.start), project(beam.end), target.curve, progress);
    const points = prefix(curve, beam.head);
    context.strokeStyle = rgb(pointMix(beam.rgb, target.rgb, move));
    context.globalAlpha = mix(1, target.opacity, easeFlow((progress - .28) / .72));
    context.lineWidth = mix((i ? 2 : 1.7) * scale, target.width, move);
    context.lineCap = 'round';
    // Round dots close their own gaps. No separate particle-to-line crossfade.
    const gap = mix(3.5 * scale, .01, easeFlow((progress - .16) / .84));
    context.setLineDash(gap <= context.lineWidth * .8 ? [] : [.01, gap]);
    context.beginPath();
    context.moveTo(...points[0]);
    context.bezierCurveTo(...points[1], ...points[2], ...points[3]);
    context.stroke();
  });
  context.setLineDash([]);
  context.globalAlpha = 1;
}
