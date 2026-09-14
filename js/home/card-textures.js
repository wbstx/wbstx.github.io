import { CanvasTexture, Texture, SRGBColorSpace, RepeatWrapping } from 'three';
import { CARD_TEXTURE_WIDTH as W, CARD_TEXTURE_HEIGHT as H } from './card-dimensions.js';

const TEXTURE_SCALE = 2;
const sans = '"Helvetica Neue", Arial, sans-serif';
const chinese = '"kozuka gothic", "PingFang SC", sans-serif';
const mono = '"SFMono-Regular", Consolas, monospace';
const white = '#e8e9e4';
const blue = '#93aab6';

function surface() {
  const canvas = document.createElement('canvas');
  canvas.width = W * TEXTURE_SCALE;
  canvas.height = H * TEXTURE_SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(TEXTURE_SCALE, TEXTURE_SCALE);
  ctx.imageSmoothingQuality = 'high';
  return [canvas, ctx];
}

function text(ctx, value, x, y, size, color = white, weight = 400, font = sans) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function rule(ctx, y) {
  ctx.fillStyle = '#636b6c';
  ctx.fillRect(96, y, W - 192, 1);
}

function base(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, '#323536');
  gradient.addColorStop(.55, '#202425');
  gradient.addColorStop(1, '#141718');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

// An original ruled-surface study: each family of lines joins two curves.
// It is drawn at texture resolution, so the fine printed lines stay crisp.
function fieldStudy(ctx) {
  ctx.save();
  ctx.translate(46, 152);
  ctx.scale(820, 644);
  ctx.lineWidth = .001;
  for (let i = -5; i < 31; i++) {
    const y = i * .045;
    ctx.beginPath();
    ctx.moveTo(-.1, y + .08);
    ctx.bezierCurveTo(.32, y + .04, .55, y - .23, 1.1, y - .02);
    ctx.strokeStyle = '#080c0f66';
    ctx.lineWidth = .003;
    ctx.stroke();
  }

  const sail = new Path2D();
  sail.moveTo(.57, .0);
  sail.bezierCurveTo(.47, .36, .64, .55, .80, .81);
  sail.bezierCurveTo(.57, .72, .45, .80, .33, .98);
  sail.bezierCurveTo(.36, .64, .36, .35, .57, .0);
  let shade = ctx.createLinearGradient(.32, .98, .63, .03);
  shade.addColorStop(0, '#84929b');
  shade.addColorStop(.48, '#252d2e');
  shade.addColorStop(1, '#506d6b');
  ctx.fillStyle = shade;
  ctx.fill(sail);
  ctx.strokeStyle = '#84989566';
  ctx.lineWidth = .0008;
  ctx.stroke(sail);

  const wing = new Path2D();
  wing.moveTo(.04, .28);
  wing.bezierCurveTo(.31, .20, .49, .37, .73, .50);
  wing.bezierCurveTo(.65, .69, .48, .74, .33, .98);
  wing.bezierCurveTo(.38, .70, .22, .41, .04, .28);
  shade = ctx.createLinearGradient(.14, .28, .55, .86);
  shade.addColorStop(0, '#6a6d69');
  shade.addColorStop(.45, '#323939');
  shade.addColorStop(1, '#8a9599');
  ctx.fillStyle = shade;
  ctx.fill(wing);
  ctx.save();
  ctx.clip(wing);
  ctx.lineWidth = .0007;
  for (let i = 0; i < 130; i++) {
    const t = i / 129;
    ctx.beginPath();
    ctx.moveTo(.04 + t * .69, .28 + .22 * t * t);
    ctx.quadraticCurveTo(.36 + t * .06, .58, .33, .98);
    ctx.strokeStyle = '#ced6cf20';
    ctx.stroke();
  }
  ctx.restore();

  const silver = new Path2D();
  silver.moveTo(.44, .32);
  silver.bezierCurveTo(.56, .38, .63, .47, .81, .49);
  silver.bezierCurveTo(.71, .56, .66, .69, .59, .76);
  silver.bezierCurveTo(.48, .66, .43, .50, .44, .32);
  shade = ctx.createLinearGradient(.43, .38, .72, .67);
  shade.addColorStop(0, '#d6d9d3');
  shade.addColorStop(.45, '#a3aaa6');
  shade.addColorStop(1, '#ebeee7');
  ctx.fillStyle = shade;
  ctx.fill(silver);
  ctx.save();
  ctx.clip(silver);
  ctx.lineWidth = .0008;
  for (let i = 0; i < 175; i++) {
    const t = i / 174;
    ctx.beginPath();
    ctx.moveTo(.44, .32 + t * .45);
    ctx.quadraticCurveTo(.49 + t * .1, .48 + t * .1, .81, .49);
    ctx.strokeStyle = i % 3 ? '#252e3152' : '#f5f8eeb0';
    ctx.stroke();
  }
  ctx.restore();

  // The crossing fan gives the composition its thin, bright horizon.
  for (let i = 0; i < 25; i++) {
    const t = i / 24;
    ctx.beginPath();
    ctx.moveTo(.0, .59 + .017 * t);
    ctx.bezierCurveTo(.34, .43 + t * .08, .66, .46 + t * .075, .99, .53);
    ctx.strokeStyle = '#e8ece5d6';
    ctx.lineWidth = .001;
    ctx.stroke();
  }
  ctx.restore();
}

function grain(ctx) {
  // Deterministic, neutral ink grain; no animation or image download.
  let seed = 71;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      ctx.fillStyle = seed & 256 ? '#ffffff09' : '#00000010';
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

export async function createCardTextures(anisotropy) {
  // Canvas must wait for the original homepage font before baking Chinese.
  try {
    await document.fonts.load('126px "kozuka gothic"', '唐逍');
  } catch (error) {
    console.warn('The original Chinese font could not load; using the fallback.', error);
  }
  const [front, f] = surface();
  const [back, b] = surface();
  base(f);
  fieldStudy(f);
  grain(f);
  // Keep the front to the artwork, name, and one quiet line of professional info.
  text(f, '唐逍', 964, 487, 152, white, 400, chinese);
  text(f, 'XIAO TANG', 970, 570, 56, white, 400);
  text(f, 'Senior Graphics Engineer', 970, 748, 28, '#b7c9d0');
  text(f, 'HUAWEI', 970, 796, 30, '#b7c9d0');

  base(b);
  grain(b);
  // Identity across the top; two quiet columns for interests and education.
  const portrait = new Image();
  let portraitMap = null;
  portrait.src = '/images/avatar-400.jpg';
  try {
    await portrait.decode();
    // Keep the photograph separate from the card's physically lit artwork.
    // Its original sRGB values should not be relit or tone-mapped a second time.
    portraitMap = new Texture(portrait);
    portraitMap.colorSpace = SRGBColorSpace;
    portraitMap.anisotropy = anisotropy;
    portraitMap.needsUpdate = true;
  } catch {
    text(b, 'xt.', 112, 398, 160);
  }
  text(b, '唐逍', 420, 292, 100, white, 400, chinese);
  text(b, 'XIAO TANG', 424, 360, 52, white, 400);
  text(b, 'Senior Graphics Engineer', 424, 422, 32, '#b7c9d0');

  rule(b, 536);
  text(b, 'INTERESTS', 96, 624, 23, blue, 400, mono);
  ['Computer Graphics', '3D Reconstruction', 'VR / AR & HCI'].forEach((s, i) => text(b, s, 96, 702 + i * 68, 46));

  text(b, 'EDUCATION', 976, 624, 23, blue, 400, mono);
  text(b, 'Ph.D.', 976, 712, 38, '#b7c9d0');
  text(b, 'B.Eng.', 976, 814, 38, '#b7c9d0');
  b.textAlign = 'right';
  text(b, 'CUHK', 1504, 712, 46);
  text(b, 'USTC', 1504, 814, 46);
  b.textAlign = 'left';

  const faces = [front, back].map(canvas => {
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = anisotropy;
    return map;
  });
  return {
    faces,
    portrait: portraitMap ? {
      map: portraitMap,
      // Position and size in the back face's normalized artwork coordinates.
      x: 96 / W, y: 184 / H, width: 272 / W, height: 272 / H,
    } : null,
  };
}

export function createStrapTexture(anisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#151719';
  ctx.fillRect(0, 0, 256, 1024);
  for (let y = 0; y < 1024; y += 4) {
    ctx.fillStyle = y % 8 ? '#00000060' : '#ffffff19';
    ctx.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 4) {
    ctx.fillStyle = '#a9b1b318';
    ctx.fillRect(x, 0, 1, 1024);
  }
  ctx.fillStyle = '#697178';
  ctx.fillRect(9, 0, 2, 1024);
  ctx.fillRect(245, 0, 2, 1024);
  for (const y of [116, 146, 915, 945]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + 90);
    ctx.lineTo(256, y + 106);
    ctx.lineTo(0, y + 16);
    ctx.fillStyle = '#6e8faa';
    ctx.fill();
  }
  ctx.save();
  ctx.translate(128, 810);
  ctx.rotate(-Math.PI / 2);
  text(ctx, 'XIAO TANG / GRAPHICS', 0, -5, 36, '#d8dfdf', 600, sans);
  ctx.restore();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}
