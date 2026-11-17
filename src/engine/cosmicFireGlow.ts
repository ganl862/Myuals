import { clamp, lerp } from './motionMath';
import { getResolvedFontFamily, hexToRgba, isRtlText } from './typography';

export type CosmicFirePresetId = 'crimson' | 'orange' | 'cosmic-blue' | 'violet' | 'custom';
export type CosmicFireBlendMode = 'normal' | 'screen';

export interface CosmicFireGlowParams {
  spread: number; // default 1.0 (scales R=0.45h)
  upwardBias: number; // default 1.0 (scales y offsets)
  turbulence: number; // default 1.0 (scales 0.16h displacement)
  riseSpeed: number; // default 1.0 (scales 0.55h/s upward scroll)
  edgeSoftness: number; // default 1.0 (scales 0.06h blur)
  rimThickness: number; // default 1.0 (scales 0.10h rim)
  opacity: number; // default 1.0 (E0-E2 multiplier ONLY; never dims E3 face)
  breathing: number; // default 0.08 (±8% oscillation, ~0.8s period)
  introSec: number; // default 0
  outroSec: number; // default 0
  seed: number; // default 1337
  preset: CosmicFirePresetId;
  customHex: string; // used when preset === 'custom'
  textColor: string; // default '#FFFFFF'
  smokeEnabled: boolean; // default true
  holesEnabled: boolean; // default true
  look30fps: boolean; // default false
  blendMode: CosmicFireBlendMode; // default 'normal'
}

export const DEFAULT_COSMIC_FIRE_GLOW_PARAMS: CosmicFireGlowParams = {
  spread: 1.0,
  upwardBias: 1.0,
  turbulence: 1.0,
  riseSpeed: 1.0,
  edgeSoftness: 1.0,
  rimThickness: 1.0,
  opacity: 1.0,
  breathing: 0.08,
  introSec: 0.0,
  outroSec: 0.0,
  seed: 1337,
  preset: 'crimson',
  customHex: '#D81B45',
  textColor: '#FFFFFF',
  smokeEnabled: true,
  holesEnabled: true,
  look30fps: false,
  blendMode: 'normal',
};

export const COSMIC_FIRE_PRESETS: Array<{ id: CosmicFirePresetId; label: string; hex: string }> = [
  { id: 'crimson', label: 'قرمزي (الأصل)', hex: '#D81B45' },
  { id: 'orange', label: 'برتقالي ناري', hex: '#F97316' },
  { id: 'cosmic-blue', label: 'أزرق كوني', hex: '#38BDF8' },
  { id: 'violet', label: 'بنفسجي كوني', hex: '#A855F7' },
];

// --- Seeded Hash + 3D Gradient/Value Noise (100% deterministic, zero Math.random) ---

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + iz * 2147483647 + seed * 1597334677) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function smoothFade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function valueNoise3D(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  const fx = smoothFade(x - ix);
  const fy = smoothFade(y - iy);
  const fz = smoothFade(z - iz);

  const c000 = hash3(ix, iy, iz, seed);
  const c100 = hash3(ix + 1, iy, iz, seed);
  const c010 = hash3(ix, iy + 1, iz, seed);
  const c110 = hash3(ix + 1, iy + 1, iz, seed);
  const c001 = hash3(ix, iy, iz + 1, seed);
  const c101 = hash3(ix + 1, iy, iz + 1, seed);
  const c011 = hash3(ix, iy + 1, iz + 1, seed);
  const c111 = hash3(ix + 1, iy + 1, iz + 1, seed);

  const x00 = c000 + (c100 - c000) * fx;
  const x10 = c010 + (c110 - c010) * fx;
  const x01 = c001 + (c101 - c001) * fx;
  const x11 = c011 + (c111 - c011) * fx;

  const y0 = x00 + (x10 - x00) * fy;
  const y1 = x01 + (x11 - x01) * fy;

  return y0 + (y1 - y0) * fz;
}

export function fbmNoise3D(
  x: number,
  y: number,
  z: number,
  seed: number,
  octaves = 3
): number {
  let sum = 0;
  let amp = 0.54;
  let freq = 1.0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise3D(x * freq, y * freq, z * freq, seed + o * 101) * amp;
    norm += amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum / Math.max(1e-5, norm);
}

// --- Hue-preserving Fire Color Ramp (defaults to exact crimson ramp from spec) ---

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function parseHexRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return { r: 216, g: 27, b: 69 };
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) * 0.5;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(hDeg: number, s: number, l: number): RgbColor {
  const h = (((hDeg % 360) + 360) % 360) / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

function shiftHexHue(baseHex: string, targetHueDeg: number, baseHueDeg: number): RgbColor {
  const delta = targetHueDeg - baseHueDeg;
  const { r, g, b } = parseHexRgb(baseHex);
  if (Math.abs(delta) < 1) return { r, g, b };
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToRgb(h + delta, s, l);
}

export interface CosmicFirePalette {
  outerDark: RgbColor; // #7A1028
  outerMid: RgbColor; // #B3173A
  bodyMid: RgbColor; // #D81B45
  bodyBright: RgbColor; // #E8304F
  core: RgbColor; // #FF4A6A
  hotSpot: RgbColor; // #FF9AAE
  hole: RgbColor; // #3A0A14
}

export function buildFirePalette(
  preset: CosmicFirePresetId,
  customHex: string
): CosmicFirePalette {
  const baseHue = 347; // Crimson #D81B45 base hue
  let targetHex = '#D81B45';
  if (preset === 'orange') targetHex = '#F97316';
  else if (preset === 'cosmic-blue') targetHex = '#38BDF8';
  else if (preset === 'violet') targetHex = '#A855F7';
  else if (preset === 'custom') targetHex = customHex || '#D81B45';

  const rgb = parseHexRgb(targetHex);
  const [targetHue] = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const hueToUse = preset === 'crimson' ? baseHue : targetHue;

  return {
    outerDark: shiftHexHue('#7A1028', hueToUse, baseHue),
    outerMid: shiftHexHue('#B3173A', hueToUse, baseHue),
    bodyMid: shiftHexHue('#D81B45', hueToUse, baseHue),
    bodyBright: shiftHexHue('#E8304F', hueToUse, baseHue),
    core: shiftHexHue('#FF4A6A', hueToUse, baseHue),
    hotSpot: shiftHexHue('#FF9AAE', hueToUse, baseHue),
    hole: shiftHexHue('#3A0A14', hueToUse, baseHue),
  };
}

/**
 * Pure color ramp evaluator for density d in [0, 1] and secondary noise in [0, 1].
 * Matches exact thresholds from the Cosmic Fire Glow specification.
 */
export function evaluateFireColorRamp(
  d: number,
  noiseVal: number,
  palette: CosmicFirePalette,
  holesEnabled: boolean
): { r: number; g: number; b: number; a: number } {
  if (d < 0.15) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;

  if (d < 0.45) {
    const t = (d - 0.15) / 0.3;
    r = lerp(palette.outerDark.r, palette.outerMid.r, t);
    g = lerp(palette.outerDark.g, palette.outerMid.g, t);
    b = lerp(palette.outerDark.b, palette.outerMid.b, t);
    a = lerp(0.55, 0.8, t);
  } else if (d <= 0.8) {
    const t = (d - 0.45) / 0.35;
    r = lerp(palette.bodyMid.r, palette.bodyBright.r, t);
    g = lerp(palette.bodyMid.g, palette.bodyBright.g, t);
    b = lerp(palette.bodyMid.b, palette.bodyBright.b, t);
    a = 0.85;
  } else {
    r = palette.core.r;
    g = palette.core.g;
    b = palette.core.b;
    a = 0.9;
  }

  // Hot spots (noise > 0.78 -> rare small highlight)
  if (noiseVal > 0.78 && d > 0.48) {
    const ht = clamp((noiseVal - 0.78) / 0.22);
    const blend = ht * 0.45;
    r = lerp(r, palette.hotSpot.r, blend);
    g = lerp(g, palette.hotSpot.g, blend);
    b = lerp(b, palette.hotSpot.b, blend);
  }

  // Dark blotch holes (noise < 0.20 -> punch semi-transparent dark hole so background shows through)
  if (holesEnabled && noiseVal < 0.2) {
    const holeStrength = clamp((0.2 - noiseVal) / 0.14);
    r = lerp(r, palette.hole.r, holeStrength * 0.88);
    g = lerp(g, palette.hole.g, holeStrength * 0.88);
    b = lerp(b, palette.hole.b, holeStrength * 0.88);
    a = lerp(a, 0.4 * a, holeStrength * 0.85);
  }

  return {
    r: Math.round(clamp(r, 0, 255)),
    g: Math.round(clamp(g, 0, 255)),
    b: Math.round(clamp(b, 0, 255)),
    a: clamp(a, 0, 1),
  };
}

/**
 * Computes optional intro/outro envelope (alpha, scale, yOffsetFracOfH) and breathing multiplier.
 */
export function computeCosmicFireEnvelope(
  timeSec: number,
  durationSec: number,
  params: Pick<CosmicFireGlowParams, 'introSec' | 'outroSec' | 'breathing' | 'look30fps'>
): {
  envelopeAlpha: number;
  envelopeScale: number;
  envelopeOffsetY: number; // multiplier of h
  breathingScale: number;
  quantizedTimeSec: number;
} {
  const quantizedTimeSec = params.look30fps ? Math.floor(timeSec * 30) / 30 : timeSec;
  const breathingScale =
    1 + params.breathing * Math.sin((quantizedTimeSec * Math.PI * 2) / 0.8);

  let alpha = 1;
  let scale = 1;
  let offsetY = 0;

  const intro = Math.max(0, params.introSec);
  if (intro > 0.001 && timeSec < intro) {
    const p = clamp(timeSec / intro);
    const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
    alpha *= e;
    scale = lerp(0.85, 1.0, e);
    offsetY += lerp(0.28, 0, e);
  }

  const outro = Math.max(0, params.outroSec);
  const rem = Math.max(0, durationSec - timeSec);
  if (outro > 0.001 && rem < outro) {
    const p = clamp(rem / outro);
    const e = 1 - Math.pow(1 - p, 3);
    alpha *= e;
    scale *= lerp(0.85, 1.0, e);
    offsetY -= lerp(0.22, 0, e);
  }

  return {
    envelopeAlpha: clamp(alpha, 0, 1),
    envelopeScale: scale,
    envelopeOffsetY: offsetY,
    breathingScale,
    quantizedTimeSec,
  };
}

// --- Text + Trailing Vector Heart Parsing & Rendering ---

const TRAILING_HEART_REGEX = /(\u2764\uFE0F?|\u2665\uFE0F?|\uD83D\uDC97|\uD83D\uDC96|\uD83E\uDDE1)$/u;

export function splitTrailingHeart(text: string): {
  mainText: string;
  hasHeart: boolean;
} {
  const trimmed = text.trim();
  const m = trimmed.match(TRAILING_HEART_REGEX);
  if (!m) {
    return { mainText: trimmed, hasHeart: false };
  }
  return {
    mainText: trimmed.slice(0, trimmed.length - m[0].length).trimEnd(),
    hasHeart: true,
  };
}

function drawVectorHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  mode: 'mask' | 'rim' | 'face',
  rimStrokeWidth = 4
) {
  const s = size * 0.48;
  ctx.save();
  ctx.translate(cx, cy + s * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.78);
  ctx.bezierCurveTo(-s * 1.15, s * 0.12, -s * 1.15, -s * 0.78, -s * 0.48, -s * 0.78);
  ctx.bezierCurveTo(-s * 0.16, -s * 0.78, 0, -s * 0.52, 0, -s * 0.34);
  ctx.bezierCurveTo(0, -s * 0.52, s * 0.16, -s * 0.78, s * 0.48, -s * 0.78);
  ctx.bezierCurveTo(s * 1.15, -s * 0.78, s * 1.15, s * 0.12, 0, s * 0.78);
  ctx.closePath();

  if (mode === 'mask') {
    ctx.fill();
    if (rimStrokeWidth > 0) ctx.stroke();
  } else if (mode === 'rim') {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = rimStrokeWidth;
    ctx.strokeStyle = 'rgba(18, 7, 11, 0.85)';
    ctx.stroke();
  } else {
    const grad = ctx.createLinearGradient(0, -s * 0.78, 0, s * 0.78);
    grad.addColorStop(0, '#FF7A8A');
    grad.addColorStop(1, '#E23A55');
    ctx.fillStyle = grad;
    ctx.fill();

    // Small specular highlight matching spec E3
    ctx.beginPath();
    ctx.ellipse(-s * 0.36, -s * 0.42, s * 0.16, s * 0.09, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.fill();
  }
  ctx.restore();
}

export class CosmicFireGlowEngine {
  private maskCanvas: HTMLCanvasElement;
  private maskCtx: CanvasRenderingContext2D;
  private cloudCanvas: HTMLCanvasElement;
  private cloudCtx: CanvasRenderingContext2D;
  private blurCanvas: HTMLCanvasElement;
  private blurCtx: CanvasRenderingContext2D;
  private smokeCanvas: HTMLCanvasElement;
  private smokeCtx: CanvasRenderingContext2D;

  constructor() {
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true })!;
    this.cloudCanvas = document.createElement('canvas');
    this.cloudCtx = this.cloudCanvas.getContext('2d')!;
    this.blurCanvas = document.createElement('canvas');
    this.blurCtx = this.blurCanvas.getContext('2d')!;
    this.smokeCanvas = document.createElement('canvas');
    this.smokeCtx = this.smokeCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  /**
   * Renders E0 (Smoke) -> E1 (Fire Cloud) -> E2 (Dark Rim + Shadow) -> E3 (Text Face + Heart)
   * centered cleanly around (anchorX, anchorY) in the caller's already-transformed coordinate space!
   * Calling inside a transformed canvas automatically makes the effect follow all parent transforms.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    options: {
      text: string;
      fontSizePx: number;
      fontFamily: string;
      anchorX: number;
      anchorY: number;
      canvasWidth: number;
      canvasHeight: number;
      timeSec: number;
      durationSec: number;
      params: CosmicFireGlowParams;
      effectEnabled: boolean; // false -> renders pure plain text cleanly!
    }
  ): void {
    const {
      text,
      fontSizePx,
      fontFamily,
      anchorX,
      anchorY,
      canvasWidth,
      canvasHeight,
      timeSec,
      durationSec,
      params,
      effectEnabled,
    } = options;

    const { mainText, hasHeart } = splitTrailingHeart(text);
    if (!mainText && !hasHeart) return;

    const rtl = isRtlText(mainText || text);
    const h = Math.max(16, fontSizePx);
    const smallPhone = Math.min(canvasWidth, canvasHeight) <= 480;
    const octaves = smallPhone ? 2 : 3;
    const resScale = smallPhone ? 0.38 : 0.5;

    ctx.save();
    ctx.font = `800 ${h}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr';

    const mainW = mainText ? ctx.measureText(mainText).width : 0;
    const heartGap = hasHeart && mainText ? h * 0.16 : 0;
    const heartSize = hasHeart ? h * 0.96 : 0;
    const totalSpanW = mainW + heartGap + heartSize;

    // Position main text & trailing heart (for RTL: main on RIGHT, heart on LEFT; for LTR: main on LEFT, heart on RIGHT)
    const blockLeft = -totalSpanW * 0.5;
    const mainX = rtl ? blockLeft + heartSize + heartGap + mainW * 0.5 : blockLeft + mainW * 0.5;
    const heartX = rtl
      ? blockLeft + heartSize * 0.5
      : blockLeft + mainW + heartGap + heartSize * 0.5;

    if (!effectEnabled) {
      // Plain text mode (100% restored when effect removed)
      ctx.translate(anchorX, anchorY);
      ctx.textAlign = 'center';
      ctx.fillStyle = params.textColor || '#FFFFFF';
      if (mainText) ctx.fillText(mainText, mainX, 0);
      if (hasHeart) drawVectorHeart(ctx, heartX, 0, heartSize, 'face');
      ctx.restore();
      return;
    }

    const env = computeCosmicFireEnvelope(timeSec, durationSec, params);
    const tNoise = env.quantizedTimeSec;
    const hScaled = h * env.breathingScale;
    const palette = buildFirePalette(params.preset, params.customHex);

    // Local bounding box sized cleanly for all 5 upward stacked lobes + smoke
    const padX = h * (0.95 + params.spread * 0.45);
    const padTop = h * (1.45 + params.upwardBias * 0.65 + params.spread * 0.45);
    const padBot = h * (0.75 + params.spread * 0.35);
    const boxW = Math.ceil(totalSpanW + padX * 2);
    const boxH = Math.ceil(h + padTop + padBot);

    const lowW = Math.max(24, Math.round(boxW * resScale));
    const lowH = Math.max(24, Math.round(boxH * resScale));
    const localCenterY = padTop + h * 0.5;
    const localCenterX = boxW * 0.5;

    // Apply parent anchor + optional intro/outro rise/scale
    ctx.translate(anchorX, anchorY + env.envelopeOffsetY * h);
    if (Math.abs(env.envelopeScale - 1) > 0.001) {
      ctx.scale(env.envelopeScale, env.envelopeScale);
    }

    const fxAlpha = clamp(params.opacity * env.envelopeAlpha, 0, 1);

    // --- 1. E0 SMOKE (Behind fire cloud, centered 0.45h ABOVE text, dark gray #2B2B31, alpha 0.30) ---
    if (params.smokeEnabled && fxAlpha > 0.01) {
      if (this.smokeCanvas.width !== lowW || this.smokeCanvas.height !== lowH) {
        this.smokeCanvas.width = lowW;
        this.smokeCanvas.height = lowH;
      } else {
        this.smokeCtx.clearRect(0, 0, lowW, lowH);
      }

      const R0 = 0.5 * hScaled * params.spread;
      const sCtx = this.smokeCtx;
      sCtx.save();
      sCtx.scale(resScale, resScale);
      sCtx.translate(localCenterX, localCenterY - 0.45 * h * params.upwardBias);
      sCtx.font = `800 ${h}px ${fontFamily}`;
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.direction = rtl ? 'rtl' : 'ltr';
      sCtx.fillStyle = '#FFFFFF';
      sCtx.strokeStyle = '#FFFFFF';
      sCtx.lineJoin = 'round';
      sCtx.lineCap = 'round';
      sCtx.lineWidth = R0 * 2;
      const smokeBlurPx = Math.max(1, 0.35 * h * resScale);
      sCtx.filter = `blur(${smokeBlurPx.toFixed(1)}px)`;
      if (mainText) {
        sCtx.strokeText(mainText, mainX, 0);
        sCtx.fillText(mainText, mainX, 0);
      }
      if (hasHeart) {
        drawVectorHeart(sCtx, heartX, 0, heartSize, 'mask', R0 * 2);
      }
      sCtx.filter = 'none';
      sCtx.restore();

      const img = sCtx.getImageData(0, 0, lowW, lowH);
      const data = img.data;
      const invDomain = 1 / Math.max(8, 0.9 * h * resScale);
      const smokeScroll = tNoise * 0.4 * h * params.riseSpeed * resScale;
      const zEvo = tNoise * 0.3;

      for (let py = 0; py < lowH; py++) {
        for (let px = 0; px < lowW; px++) {
          const i4 = (py * lowW + px) * 4;
          const ma = data[i4 + 3] / 255;
          if (ma < 0.03) {
            data[i4 + 3] = 0;
            continue;
          }
          const n = fbmNoise3D(px * invDomain, (py + smokeScroll) * invDomain, zEvo, params.seed + 19, 2);
          const modulated = ma * clamp((n - 0.22) * 1.4, 0, 1);
          data[i4] = 43; // #2B
          data[i4 + 1] = 43; // #2B
          data[i4 + 2] = 49; // #31
          data[i4 + 3] = Math.round(modulated * 0.3 * 255);
        }
      }
      sCtx.putImageData(img, 0, 0);

      ctx.save();
      ctx.globalAlpha = fxAlpha;
      ctx.globalCompositeOperation = params.blendMode === 'screen' ? 'screen' : 'source-over';
      ctx.drawImage(this.smokeCanvas, -localCenterX, -localCenterY, boxW, boxH);
      ctx.restore();
    }

    // --- 2. E1 FIRE CLOUD (5 stacked dilated text masks with 3-octave upward fractal turbulence + dark holes) ---
    if (fxAlpha > 0.01) {
      if (this.maskCanvas.width !== lowW || this.maskCanvas.height !== lowH) {
        this.maskCanvas.width = lowW;
        this.maskCanvas.height = lowH;
        this.cloudCanvas.width = lowW;
        this.cloudCanvas.height = lowH;
        this.blurCanvas.width = lowW;
        this.blurCanvas.height = lowH;
      } else {
        this.maskCtx.clearRect(0, 0, lowW, lowH);
        this.blurCtx.clearRect(0, 0, lowW, lowH);
      }

      const R1 = 0.45 * hScaled * params.spread;
      const mCtx = this.maskCtx;
      mCtx.save();
      mCtx.scale(resScale, resScale);
      mCtx.translate(localCenterX, localCenterY);
      mCtx.font = `800 ${h}px ${fontFamily}`;
      mCtx.textAlign = 'center';
      mCtx.textBaseline = 'middle';
      mCtx.direction = rtl ? 'rtl' : 'ltr';
      mCtx.fillStyle = '#FFFFFF';
      mCtx.strokeStyle = '#FFFFFF';
      mCtx.lineJoin = 'round';
      mCtx.lineCap = 'round';
      mCtx.lineWidth = R1 * 2;
      if (mainText) {
        mCtx.strokeText(mainText, mainX, 0);
        mCtx.fillText(mainText, mainX, 0);
      }
      if (hasHeart) {
        drawVectorHeart(mCtx, heartX, 0, heartSize, 'mask', R1 * 2);
      }
      mCtx.restore();

      // Base dilated mask alpha field
      const baseMaskData = mCtx.getImageData(0, 0, lowW, lowH).data;
      const outImg = this.cloudCtx.createImageData(lowW, lowH);
      const out = outImg.data;

      const yOffsets = [0, -0.12, -0.24, -0.36, -0.5];
      const scales = [1.0, 0.97, 0.93, 0.89, 0.85];
      const alphas = [0.9, 0.8, 0.65, 0.5, 0.35];

      const domainScale = 1 / Math.max(6, 0.7 * h * resScale);
      const dispAmp = 0.16 * h * params.turbulence * resScale;
      const scrollY = tNoise * 0.55 * h * params.riseSpeed * resScale;
      const zTime = tNoise * 0.45;
      const lowCx = localCenterX * resScale;
      const lowCy = localCenterY * resScale;
      const bias = params.upwardBias;
      const hLow = h * resScale;

      const sampleBaseAlpha = (sx: number, sy: number): number => {
        const ix = Math.round(sx);
        const iy = Math.round(sy);
        if (ix < 0 || ix >= lowW || iy < 0 || iy >= lowH) return 0;
        return baseMaskData[(iy * lowW + ix) * 4 + 3] / 255;
      };

      for (let py = 0; py < lowH; py++) {
        for (let px = 0; px < lowW; px++) {
          // Domain warping using multi-octave upward-scrolling fractal noise
          const nx = px * domainScale;
          const ny = (py + scrollY) * domainScale;
          const warpX =
            (fbmNoise3D(nx + 3.1, ny, zTime, params.seed, octaves) - 0.5) * 2 * dispAmp;
          const warpY =
            (fbmNoise3D(nx, ny + 7.4, zTime + 2.3, params.seed + 37, octaves) - 0.5) *
            2 *
            dispAmp;

          // Stack 5 displaced + scaled copies of the dilated silhouette
          let dMax = 0;
          for (let L = 0; L < 5; L++) {
            const dy = yOffsets[L] * hLow * bias;
            const invS = 1 / scales[L];
            // Layer-independent upward curl phase so 5-6 irregular lobes form naturally
            const lobePhase = L * 1.9;
            const wx = warpX * (0.85 + 0.12 * L) + Math.sin(py * 0.08 + lobePhase) * 1.5;
            const wy = warpY * (0.9 + 0.1 * L);
            const sx = lowCx + (px + wx - lowCx) * invS;
            const sy = lowCy + (py - dy + wy - lowCy) * invS;
            const m = sampleBaseAlpha(sx, sy);
            if (m > 0.01) {
              // Subtle per-pixel outer erosion so outer fringes feather organically
              const nEdge = fbmNoise3D(nx * 1.25, ny * 1.25 + L * 0.6, zTime, params.seed + 91 + L * 17, 2);
              const density = m * alphas[L] * lerp(0.55, 1.25, nEdge);
              if (density > dMax) dMax = density;
            }
          }

          const i4 = (py * lowW + px) * 4;
          if (dMax < 0.15) {
            out[i4 + 3] = 0;
            continue;
          }

          // Hole / hotspot detail noise scrolling smoothly upward with the flames
          const detailNoise = fbmNoise3D(
            nx * 1.35 + 1.7,
            ny * 1.35,
            zTime * 1.15,
            params.seed + 251,
            2
          );
          const col = evaluateFireColorRamp(
            clamp(dMax, 0, 1),
            detailNoise,
            palette,
            params.holesEnabled
          );
          out[i4] = col.r;
          out[i4 + 1] = col.g;
          out[i4 + 2] = col.b;
          out[i4 + 3] = Math.round(col.a * 255);
        }
      }

      this.cloudCtx.putImageData(outImg, 0, 0);

      // Edge softness sigma 0.06h on final fire mask
      const edgeBlurPx = Math.max(0.5, 0.06 * h * params.edgeSoftness * resScale);
      const bCtx = this.blurCtx;
      bCtx.save();
      bCtx.clearRect(0, 0, lowW, lowH);
      bCtx.filter = `blur(${edgeBlurPx.toFixed(2)}px)`;
      bCtx.drawImage(this.cloudCanvas, 0, 0);
      bCtx.filter = 'none';
      bCtx.restore();

      ctx.save();
      ctx.globalAlpha = fxAlpha;
      ctx.globalCompositeOperation = params.blendMode === 'screen' ? 'screen' : 'source-over';
      ctx.drawImage(this.blurCanvas, -localCenterX, -localCenterY, boxW, boxH);
      ctx.restore();
    }

    // --- 3. E2 DARK RIM + SHADOW (dilated 0.10h in #12070B alpha 0.85 + shadow 0.12h, +0.06h Y) ---
    if (fxAlpha > 0.01 && params.rimThickness > 0.01) {
      const rimWidth = Math.max(1.5, 0.1 * h * 2 * params.rimThickness);
      ctx.save();
      ctx.globalAlpha = fxAlpha;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = rimWidth;
      ctx.strokeStyle = 'rgba(18, 7, 11, 0.85)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.60)';
      ctx.shadowBlur = Math.max(1, 0.12 * h);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0.06 * h;
      if (mainText) ctx.strokeText(mainText, mainX, 0);
      if (hasHeart) drawVectorHeart(ctx, heartX, 0, heartSize, 'rim', rimWidth);
      ctx.restore();
    }

    // --- 4. E3 PURE CRISP TEXT FACE (#FFFFFF, NEVER dimmed by E0-E2 effect opacity) ---
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = params.textColor || '#FFFFFF';
    if (mainText) ctx.fillText(mainText, mainX, 0);
    if (hasHeart) drawVectorHeart(ctx, heartX, 0, heartSize, 'face');
    ctx.restore();

    ctx.restore();
  }
}

export function extractFireGlowParamsFromEffect(
  values: Record<string, number>,
  toggles?: Record<string, boolean>,
  selects?: Record<string, string>,
  colorHex?: string,
  textColor?: string
): CosmicFireGlowParams {
  return {
    spread: values.spread ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.spread,
    upwardBias: values.upwardBias ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.upwardBias,
    turbulence: values.turbulence ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.turbulence,
    riseSpeed: values.riseSpeed ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.riseSpeed,
    edgeSoftness: values.edgeSoftness ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.edgeSoftness,
    rimThickness: values.rimThickness ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.rimThickness,
    opacity: values.opacity ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.opacity,
    breathing: values.breathing ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.breathing,
    introSec: values.introSec ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.introSec,
    outroSec: values.outroSec ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.outroSec,
    seed: Math.round(values.seed ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.seed),
    preset: (selects?.preset as CosmicFirePresetId) ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.preset,
    customHex: colorHex || DEFAULT_COSMIC_FIRE_GLOW_PARAMS.customHex,
    textColor: textColor || DEFAULT_COSMIC_FIRE_GLOW_PARAMS.textColor,
    smokeEnabled: toggles?.smokeEnabled ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.smokeEnabled,
    holesEnabled: toggles?.holesEnabled ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.holesEnabled,
    look30fps: toggles?.look30fps ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.look30fps,
    blendMode: (selects?.blendMode as CosmicFireBlendMode) ?? DEFAULT_COSMIC_FIRE_GLOW_PARAMS.blendMode,
  };
}

export function getResolvedCosmicTextFont(customFontFamily: string | null, text: string): string {
  return getResolvedFontFamily(customFontFamily, isRtlText(text));
}

export function resolveCosmicFireOverlayBoxColor(preset: CosmicFirePresetId, customHex: string): string {
  const found = COSMIC_FIRE_PRESETS.find((p) => p.id === preset);
  return found ? found.hex : hexToRgba(customHex, 1);
}
