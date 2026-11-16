import { clamp, cubicBezier, lerp, smoothstep } from './motionMath';
import { mulberry32, seededWaveNoise } from './prng';
import { getResolvedFontFamily, hexToRgba, isRtlText } from './typography';

export const COSMIC_SLIDE_REF_DURATION_SEC = 7.467;

export type CosmicSlideDirection = 'right' | 'left' | 'up' | 'down';
export type CosmicTextAlign = 'left' | 'center' | 'right';

export interface CosmicSlideParams {
  durationSec: number; // 3.0 .. 12.0, default 7.467
  slideDirection: CosmicSlideDirection; // default 'right' (A exits right, B enters left)
  motionBlurStrength: number; // 0 .. 1.0, default 1.0
  starDensity: number; // 0.2 .. 1.5, default 1.0
  starSpeed: number; // 0.2 .. 2.0, default 1.0
  lensFlareEnabled: boolean; // default true
  lensFlareColor: string; // default '#BFE8FF'
  letterScatterAmount: number; // 0 .. 1.5, default 1.0
  assemblyDurationSec: number; // 0.2 .. 1.4, default 0.60 (0.80 -> 1.40)
  shakeEnabled: boolean; // default true
  shakeStrength: number; // 0 .. 2.0, default 1.0
  zoomPunchAmount: number; // 1.0 .. 1.5, default 1.28
  focusPulseEnabled: boolean; // default true
  glowIntensity: number; // 0 .. 2.0, default 1.0
  shadowStrength: number; // 0 .. 1.5, default 1.0
  edgeFeatherAmount: number; // 0 .. 0.15, default 0.06 (6%)
  ghostFramesEnabled: boolean; // default true
  fadeInDurationSec: number; // 0.2 .. 2.5, default 1.00 (0.20 -> 1.20)
  fadeOutDurationSec: number; // 0.3 .. 2.5, default 1.30 (6.00 -> 7.30)
  scanlineGlitchEnabled: boolean; // default false
  line2Align: CosmicTextAlign; // default 'left' (left edges aligned with line1)
}

export const DEFAULT_COSMIC_SLIDE_PARAMS: CosmicSlideParams = {
  durationSec: COSMIC_SLIDE_REF_DURATION_SEC,
  slideDirection: 'right',
  motionBlurStrength: 1.0,
  starDensity: 1.0,
  starSpeed: 1.0,
  lensFlareEnabled: true,
  lensFlareColor: '#BFE8FF',
  letterScatterAmount: 1.0,
  assemblyDurationSec: 0.6,
  shakeEnabled: true,
  shakeStrength: 1.0,
  zoomPunchAmount: 1.28,
  focusPulseEnabled: true,
  glowIntensity: 1.0,
  shadowStrength: 1.0,
  edgeFeatherAmount: 0.06,
  ghostFramesEnabled: true,
  fadeInDurationSec: 1.0,
  fadeOutDurationSec: 1.3,
  scanlineGlitchEnabled: false,
  line2Align: 'left',
};

export interface CosmicSlideTextData {
  titleText: string; // default "كربلاء"
  line1Text: string; // default "دار النوايب"
  line2Text: string; // default "والبلى"
  creditText: string; // default "الايدتور الحسيني كاسدو"
  creditEnabled: boolean; // default true
  accentColor: string; // default "#FF2D2D"
  line1Color: string; // default "#FFFFFF"
  customFontFamily: string | null;
}

export interface FocusPulseState {
  zoomScale: number;
  blurPx: number;
  bokehMix: number; // 0..1 during 5.10..5.80
  shakeX: number; // px @ 720p ref
  shakeY: number; // px @ 720p ref
  shakeRotDeg: number;
}

export interface CosmicSlideState {
  tRef: number;
  globalOpacity: number;
  globalScale: number;

  // Picture A
  picAVisible: boolean;
  picABlurPx: number;
  picAWidthFrac: number;
  picACenterXFrac: number;
  picACenterYFrac: number;
  picARotateYDeg: number;
  picARotateZDeg: number;
  picADollyScale: number;
  picAMotionBlurPx: number;
  picATextScaleX: number;

  // Title ("كربلاء")
  titleVisible: boolean;
  titleAssemblyProgress: number; // 0 at 0.80 -> 1 at 1.40

  // Credit text
  creditOpacity: number;
  creditGlitchPhase: number; // 0..1 (<1 = glitchy partial letters)

  // Starfield & Lens flare
  starForwardMix: number;
  starStreakStretch: number; // 1 -> 10 at peak ~2.8
  starRgbSplitPx: number;
  verticalStreaksAlpha: number;
  flareVisible: boolean;
  flareXFrac: number;
  flareYFrac: number;
  flareAngleDeg: number;
  flareAlpha: number;

  // Picture B
  picBVisible: boolean;
  picBCenterXFrac: number;
  picBCenterYFrac: number;
  picBWidthFrac: number;
  picBBlurPx: number;
  picBRotateYDeg: number;
  picBRotateZDeg: number;
  picBNeonOpacity: number;

  // Line 1 & Line 2 on Picture B
  line1Opacity: number;
  line1BlurPx: number;
  line2Opacity: number;
  line2GlowNorm: number;

  // Focus-Pulse Shake on Picture B
  focusPulse: FocusPulseState;
}

export function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

export function easeInCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * x;
}

export function easeOutExpo(t: number): number {
  const x = clamp(t, 0, 1);
  return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

export function easeInOutSine(t: number): number {
  const x = clamp(t, 0, 1);
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

function piecewiseEaseOut(t: number, points: Array<[number, number]>): number {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [t0, v0] = points[i];
    const [t1, v1] = points[i + 1];
    if (t <= t1) {
      const local = clamp((t - t0) / Math.max(1e-5, t1 - t0));
      return lerp(v0, v1, easeOutCubic(local));
    }
  }
  return points[points.length - 1][1];
}

function piecewiseLinear(t: number, points: Array<[number, number]>): number {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [t0, v0] = points[i];
    const [t1, v1] = points[i + 1];
    if (t <= t1) {
      const local = clamp((t - t0) / Math.max(1e-5, t1 - t0));
      return lerp(v0, v1, local);
    }
  }
  return points[points.length - 1][1];
}

export function computeFocusPulseState(
  tRef: number,
  params: Pick<
    CosmicSlideParams,
    'shakeEnabled' | 'shakeStrength' | 'zoomPunchAmount' | 'focusPulseEnabled'
  >
): FocusPulseState {
  // Zoom punch: 1.00 -> zoomPunchAmount (1.28) over 5.00->5.35 (easeOutExpo),
  // then slow creep 1.28 -> 1.55 until 6.20 (easeOutCubic)
  let zoomScale = 1.0;
  if (tRef >= 5.0) {
    const punchTarget = params.zoomPunchAmount;
    const creepTarget = punchTarget + 0.27;
    if (tRef < 5.35) {
      const p = clamp((tRef - 5.0) / 0.35);
      zoomScale = lerp(1.0, punchTarget, easeOutExpo(p));
    } else if (tRef < 6.2) {
      const p = clamp((tRef - 5.35) / (6.2 - 5.35));
      zoomScale = lerp(punchTarget, creepTarget, easeOutCubic(p));
    } else {
      zoomScale = creepTarget;
    }
  }

  // Focus pulse blur: 0 -> 8px at 5.40 -> 0 at 5.80
  let blurPx = 0;
  let bokehMix = 0;
  if (params.focusPulseEnabled && tRef >= 5.0 && tRef <= 5.8) {
    if (tRef < 5.4) {
      const u = clamp((tRef - 5.0) / 0.4);
      blurPx = 8 * easeInOutSine(u);
    } else {
      const u = clamp((tRef - 5.4) / 0.4);
      blurPx = 8 * (1 - easeInOutSine(u));
    }
  }
  if (params.focusPulseEnabled && tRef >= 5.1 && tRef <= 5.8) {
    if (tRef < 5.35) {
      bokehMix = smoothstep(5.1, 5.35, tRef);
    } else if (tRef <= 5.5) {
      bokehMix = 1.0;
    } else {
      bokehMix = 1 - smoothstep(5.5, 5.8, tRef);
    }
  }

  // Light shake: +/-8px and +/-0.6deg, ~7Hz, exponential decay 5.05 -> 5.60
  let shakeX = 0;
  let shakeY = 0;
  let shakeRotDeg = 0;
  if (params.shakeEnabled && tRef >= 5.05 && tRef <= 5.65) {
    const elapsed = tRef - 5.05;
    const decay = Math.exp(-elapsed * 5.6) * clamp(1 - smoothstep(5.52, 5.65, tRef), 0, 1);
    const omega = 7 * Math.PI * 2;
    const str = params.shakeStrength;
    shakeX = seededWaveNoise(11, elapsed * omega) * 8 * str * decay;
    shakeY = seededWaveNoise(29, elapsed * omega * 1.07) * 8 * str * decay;
    shakeRotDeg = seededWaveNoise(53, elapsed * omega * 0.93) * 0.6 * str * decay;
  }

  return {
    zoomScale,
    blurPx,
    bokehMix,
    shakeX,
    shakeY,
    shakeRotDeg,
  };
}

function slideOffsetFrac(
  amountFrac: number,
  direction: CosmicSlideDirection
): { dx: number; dy: number } {
  if (direction === 'left') return { dx: -amountFrac, dy: 0 };
  if (direction === 'up') return { dx: 0, dy: -amountFrac };
  if (direction === 'down') return { dx: 0, dy: amountFrac };
  return { dx: amountFrac, dy: 0 };
}

export function computeCosmicSlideState(
  rawTimeSec: number,
  params: CosmicSlideParams = DEFAULT_COSMIC_SLIDE_PARAMS
): CosmicSlideState {
  const totalDur = Math.max(3.0, Math.min(12.0, params.durationSec || COSMIC_SLIDE_REF_DURATION_SEC));
  const timeScale = COSMIC_SLIDE_REF_DURATION_SEC / totalDur;
  const tRef = clamp(rawTimeSec * timeScale, 0, COSMIC_SLIDE_REF_DURATION_SEC);

  // 1) GLOBAL FADE-IN & 10) GLOBAL FADE-OUT (with user overrides scaled cleanly)
  const fadeInStart = 0.2;
  const fadeInDur = clamp(params.fadeInDurationSec * timeScale, 0.15, 2.5);
  const fadeInEnd = fadeInStart + fadeInDur;

  const fadeOutEnd = 7.3;
  const fadeOutDur = clamp(params.fadeOutDurationSec * timeScale, 0.2, 2.5);
  const fadeOutStart = Math.max(4.8, fadeOutEnd - fadeOutDur);

  let globalOpacity = 1;
  if (tRef < fadeInStart) {
    globalOpacity = 0;
  } else if (tRef < fadeInEnd) {
    globalOpacity = easeInOutSine((tRef - fadeInStart) / fadeInDur);
  }
  if (tRef >= fadeOutStart) {
    if (tRef >= fadeOutEnd) {
      globalOpacity = 0;
    } else {
      const f = clamp((tRef - fadeOutStart) / fadeOutDur);
      // Linear with slight ease-in-out
      const blended = lerp(f, easeInOutSine(f), 0.35);
      globalOpacity *= 1 - blended;
    }
  }

  const globalScale =
    tRef >= fadeOutStart ? lerp(1.0, 1.06, clamp((tRef - fadeOutStart) / fadeOutDur)) : 1.0;

  // 2) PICTURE A (intro 0.25 -> 3.00)
  const picAVisible = tRef >= 0.25 && tRef <= 3.05;
  let picABlurPx = 0;
  if (tRef >= 0.25 && tRef < 1.3) {
    picABlurPx = 14 * (1 - easeOutCubic((tRef - 0.25) / (1.3 - 0.25)));
  }

  const picAWidthFrac = piecewiseEaseOut(tRef, [
    [0.3, 0.46],
    [1.05, 0.55],
    [1.5, 0.66],
    [2.0, 0.7],
  ]);

  const picARotateYDeg = piecewiseEaseOut(tRef, [
    [0.3, -9.0],
    [2.0, -4.0],
  ]);
  const picARotateZDeg = piecewiseEaseOut(tRef, [
    [0.3, -2.2],
    [2.0, -1.0],
  ]);
  const picADollyScale =
    tRef <= 0.25 ? 1.0 : tRef < 2.0 ? lerp(1.0, 1.03, (tRef - 0.25) / (2.0 - 0.25)) : 1.03;

  // 6a & 6b) Slide A -> B (2.00 -> 3.00, easeInCubic accelerating)
  let slideAFrac = 0;
  let picAMotionBlurPx = 0;
  let picATextScaleX = 1.0;
  if (tRef >= 2.0 && tRef <= 3.05) {
    const s = clamp((tRef - 2.0) / 1.0);
    slideAFrac = 1.1 * easeInCubic(s);
    // Peak directional blur ~2.55 -> 60px * strength
    const blurEnv = tRef < 2.55 ? smoothstep(2.0, 2.55, tRef) : 1 - smoothstep(2.55, 3.0, tRef);
    picAMotionBlurPx = 60 * clamp(blurEnv, 0, 1) * params.motionBlurStrength;
    picATextScaleX = 1 + 0.08 * clamp(blurEnv, 0, 1);
  }
  const offA = slideOffsetFrac(slideAFrac, params.slideDirection);
  const picACenterXFrac = 0.52 + offA.dx;
  const picACenterYFrac = 0.47 + offA.dy;

  // 3) TITLE on Picture A ("كربلاء")
  const assemblyDurRef = clamp(params.assemblyDurationSec * timeScale, 0.15, 1.2);
  const titleVisible = tRef >= 0.8 && picAVisible;
  const rawAssm = tRef < 0.8 ? 0 : clamp((tRef - 0.8) / assemblyDurRef);
  const titleAssemblyProgress = rawAssm >= 0.9999 ? 1 : rawAssm;

  // 4) CREDIT TEXT (0.70 -> 7.30, fixed screen layer)
  let creditOpacity = 0;
  let creditGlitchPhase = 0;
  if (tRef >= 0.7 && tRef < fadeOutEnd) {
    if (tRef < 2.4) {
      creditGlitchPhase = clamp((tRef - 0.7) / (2.4 - 0.7));
      // 4-5 discrete on/off flicker bursts before stabilizing
      const step = Math.floor((tRef - 0.7) * 9.5);
      const flick = seededWaveNoise(77, step * 2.1);
      creditOpacity = flick > -0.32 ? smoothstep(0.7, 1.1, tRef) : 0.18;
    } else {
      creditGlitchPhase = 1;
      creditOpacity = 1;
    }
  }

  // 5 & 6c) STARFIELD
  const starForwardMix = tRef >= 0.4 && tRef < 2.0 ? clamp((tRef - 0.4) / 1.6) : tRef >= 2.0 ? 1 : 0;
  let starStreakStretch = 1.0;
  let starRgbSplitPx = 0;
  if (tRef >= 2.1 && tRef <= 4.4) {
    const streakCurve =
      tRef < 2.55
        ? easeInOutSine(clamp((tRef - 2.1) / 0.45))
        : tRef <= 2.9
          ? 1.0
          : 1 - easeOutCubic(clamp((tRef - 2.9) / 1.5));
    starStreakStretch = 1 + 9 * streakCurve;
    starRgbSplitPx = 6 * streakCurve;
  }
  const verticalStreaksAlpha =
    tRef >= 3.7 && tRef <= 4.6
      ? 0.12 * Math.sin(clamp((tRef - 3.7) / 0.9) * Math.PI)
      : 0;

  // 5 & 6d) LENS FLARE
  const flareVisible = params.lensFlareEnabled && tRef >= 0.25 && tRef <= 4.15;
  let flareXFrac = 0.0;
  const flareYFrac = 0.2;
  let flareAngleDeg = 28;
  let flareAlpha = 1;
  if (tRef >= 2.5) {
    flareXFrac = piecewiseLinear(tRef, [
      [2.5, 0.03],
      [2.9, 0.38],
      [3.2, 0.6],
      [3.4, 0.74],
      [3.6, 0.84],
      [3.8, 0.92],
      [4.0, 0.99],
      [4.15, 1.06],
    ]);
    flareAngleDeg = lerp(28, 88, clamp(flareXFrac / 0.74));
    flareAlpha = 1 - smoothstep(3.92, 4.15, tRef);
  }
  if (params.slideDirection === 'left') {
    flareXFrac = 1 - flareXFrac;
  }

  // 6e & 6f) PICTURE B (enters from opposite side at 3.30 -> 7.30)
  const picBVisible = tRef >= 3.25;
  const evalPicBPos = (sampleT: number): number => {
    if (sampleT < 3.3) return -0.2;
    if (sampleT < 4.5) {
      const p = clamp((sampleT - 3.3) / 1.2);
      return lerp(-0.2, 0.35, cubicBezier(0.16, 1, 0.3, 1, p));
    }
    const p = clamp((sampleT - 4.5) / 1.7);
    return lerp(0.35, 0.5, cubicBezier(0.16, 1, 0.3, 1, p));
  };

  const bProgressAlong = evalPicBPos(tRef);
  const deltaFromCenter = 0.5 - bProgressAlong;
  const oppOff = slideOffsetFrac(deltaFromCenter, params.slideDirection);
  const picBCenterXFrac = 0.5 - oppOff.dx;
  const picBCenterYFrac = 0.5 - oppOff.dy;

  const picBBlurPx =
    tRef < 3.35 ? 40 : tRef < 4.2 ? 40 * (1 - easeOutCubic((tRef - 3.35) / (4.2 - 3.35))) : 0;

  const picBWidthFrac = piecewiseEaseOut(tRef, [
    [3.3, 0.55],
    [3.6, 0.55],
    [4.5, 0.6],
    [5.0, 0.58],
  ]);
  const picBRotateYDeg = piecewiseEaseOut(tRef, [
    [3.3, -8.0],
    [5.0, -4.0],
  ]);
  const picBRotateZDeg = piecewiseEaseOut(tRef, [
    [3.3, -1.8],
    [5.0, -1.0],
  ]);

  // 7) Neon outline on B fades in 4.9 -> 5.3
  const picBNeonOpacity =
    tRef < 4.9 ? 0 : tRef < 5.3 ? smoothstep(4.9, 5.3, tRef) * 0.8 : 0.8;

  // 8) TEXTS ON PICTURE B
  let line1Opacity = 0;
  let line1BlurPx = 6;
  if (tRef >= 3.35) {
    const p = clamp((tRef - 3.35) / 0.4);
    const e = easeOutCubic(p);
    line1Opacity = e;
    line1BlurPx = 6 * (1 - e);
  }

  let line2Opacity = 0;
  let line2GlowNorm = 0;
  if (tRef >= 4.4) {
    const p = clamp((tRef - 4.4) / 0.6);
    const e = easeOutCubic(p);
    line2Opacity = e;
    line2GlowNorm = e;
  }

  // 9) FOCUS-PULSE SHAKE on Clip B
  const focusPulse = computeFocusPulseState(tRef, params);

  return {
    tRef,
    globalOpacity,
    globalScale,
    picAVisible,
    picABlurPx,
    picAWidthFrac,
    picACenterXFrac,
    picACenterYFrac,
    picARotateYDeg,
    picARotateZDeg,
    picADollyScale,
    picAMotionBlurPx,
    picATextScaleX,
    titleVisible,
    titleAssemblyProgress,
    creditOpacity,
    creditGlitchPhase,
    starForwardMix,
    starStreakStretch,
    starRgbSplitPx,
    verticalStreaksAlpha,
    flareVisible,
    flareXFrac,
    flareYFrac,
    flareAngleDeg,
    flareAlpha,
    picBVisible,
    picBCenterXFrac,
    picBCenterYFrac,
    picBWidthFrac,
    picBBlurPx,
    picBRotateYDeg,
    picBRotateZDeg,
    picBNeonOpacity,
    line1Opacity,
    line1BlurPx,
    line2Opacity,
    line2GlowNorm,
    focusPulse,
  };
}

interface StarParticle {
  x: number;
  y: number;
  zLayer: 0 | 1 | 2; // 0=far, 1=mid, 2=near
  size: number;
  colorKind: 'whiteblue' | 'red' | 'blue';
  alpha: number;
}

const STAR_CACHE = new Map<number, StarParticle[]>();

function getDeterministicStars(countScale: number): StarParticle[] {
  const key = Math.round(clamp(countScale, 0.2, 1.5) * 100);
  const cached = STAR_CACHE.get(key);
  if (cached) return cached;

  const rng = mulberry32(42071);
  const farCount = Math.round(260 * countScale);
  const midCount = Math.round(160 * countScale);
  const nearCount = Math.round(70 * countScale);

  const list: StarParticle[] = [];
  const pushLayer = (n: number, zLayer: 0 | 1 | 2, minSz: number, maxSz: number) => {
    for (let i = 0; i < n; i++) {
      const rColor = rng();
      const colorKind: StarParticle['colorKind'] =
        rColor < 0.14 ? 'red' : rColor < 0.28 ? 'blue' : 'whiteblue';
      list.push({
        x: rng(),
        y: rng(),
        zLayer,
        size: minSz + rng() * (maxSz - minSz),
        colorKind,
        alpha: 0.42 + rng() * 0.55,
      });
    }
  };

  pushLayer(farCount, 0, 0.8, 1.6);
  pushLayer(midCount, 1, 1.3, 2.3);
  pushLayer(nearCount, 2, 1.9, 3.2);

  STAR_CACHE.set(key, list);
  return list;
}

/**
 * Reusable Modifier: Starfield + Lens Flare Backdrop (L0 + L1 + L2)
 */
export function drawStarfieldAndFlare(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tRef: number,
  options: {
    drawBackdrop?: boolean;
    starDensity?: number;
    starSpeed?: number;
    lensFlareEnabled?: boolean;
    lensFlareColor?: string;
    bokehMix?: number;
    streakStretch?: number;
    rgbSplitPx?: number;
    verticalStreaksAlpha?: number;
    flareXFrac?: number;
    flareYFrac?: number;
    flareAngleDeg?: number;
    flareAlpha?: number;
  }
): void {
  const scaleH = h / 720;
  const isSmallPhone = Math.min(w, h) <= 480;
  const qualityScale = isSmallPhone ? 0.55 : 1.0;

  // L0: Crimson/blue-black low-key radial backdrop + 45% corner vignette
  if (options.drawBackdrop !== false) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const bg = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.08, cx, cy, Math.max(w, h) * 0.72);
    bg.addColorStop(0, '#2A0B10');
    bg.addColorStop(0.58, '#12050B');
    bg.addColorStop(1, '#050308');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const vig = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.34, cx, cy, Math.max(w, h) * 0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  // L1: 3-depth starfield
  const stars = getDeterministicStars((options.starDensity ?? 1.0) * qualityScale);
  const speed = options.starSpeed ?? 1.0;
  const streak = options.streakStretch ?? 1.0;
  const rgbSplit = (options.rgbSplitPx ?? 0) * scaleH;
  const bokehMix = clamp(options.bokehMix ?? 0, 0, 1);

  // Forward-fly displacement during intro (0.40..2.0) and steady drift after
  const flyTime = Math.max(0, tRef - 0.4) * speed;
  const layerSpeeds = [0.05, 0.13, 0.25];
  const driftX = tRef >= 2.0 ? (tRef - 2.0) * 0.32 * speed : 0;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (let i = 0; i < stars.length; i++) {
    const st = stars[i];
    const zSpd = layerSpeeds[st.zLayer];

    // Radial outward motion from center (forward-fly toward camera)
    const dirX = st.x - 0.5;
    const dirY = st.y - 0.5;
    const radialScale = 1 + Math.min(1.6, flyTime * zSpd * 0.42);
    let sxFrac = 0.5 + dirX * radialScale + driftX * (0.4 + st.zLayer * 0.45);
    let syFrac = 0.5 + dirY * radialScale;

    // Wrap cleanly inside [0, 1]
    sxFrac = ((sxFrac % 1) + 1) % 1;
    syFrac = ((syFrac % 1) + 1) % 1;

    const px = sxFrac * w;
    const py = syFrac * h;
    const baseR = st.size * scaleH;

    if (bokehMix > 0.05 && st.zLayer >= 1) {
      // Soft bokeh disc (radius 6-14px, alpha 0.35)
      const bokehR = lerp(baseR, (6 + (i % 9)) * scaleH, bokehMix);
      const bAlpha = st.alpha * lerp(1, 0.35, bokehMix);
      const bCol =
        st.colorKind === 'red'
          ? `rgba(255, 59, 59, ${bAlpha})`
          : st.colorKind === 'blue'
            ? `rgba(59, 160, 255, ${bAlpha})`
            : `rgba(218, 236, 255, ${bAlpha})`;
      const grad = ctx.createRadialGradient(px, py, bokehR * 0.1, px, py, bokehR);
      grad.addColorStop(0, bCol);
      grad.addColorStop(0.65, bCol);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, bokehR, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    const col =
      st.colorKind === 'red'
        ? `rgba(255, 59, 59, ${st.alpha})`
        : st.colorKind === 'blue'
          ? `rgba(59, 160, 255, ${st.alpha})`
          : `rgba(220, 238, 255, ${st.alpha})`;

    if (streak > 1.25) {
      const len = baseR * 2.4 * streak * (0.55 + st.zLayer * 0.38);
      const splitOffset =
        st.colorKind === 'red' ? -rgbSplit : st.colorKind === 'blue' ? rgbSplit : 0;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1, baseR * 0.78);
      ctx.beginPath();
      ctx.moveTo(px + splitOffset - len * 0.5, py);
      ctx.lineTo(px + splitOffset + len * 0.5, py);
      ctx.stroke();
    } else {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(px, py, baseR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Faint vertical 1px light streaks between 3.7 and 4.6
  const vAlpha = options.verticalStreaksAlpha ?? 0;
  if (vAlpha > 0.005) {
    ctx.strokeStyle = `rgba(191, 232, 255, ${vAlpha})`;
    ctx.lineWidth = Math.max(1, scaleH);
    for (let k = 0; k < 14; k++) {
      const lx = (((k * 0.173 + tRef * 0.19) % 1) + 1) % 1 * w;
      const ly = ((k * 0.31) % 0.6) * h;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx, ly + h * 0.38);
      ctx.stroke();
    }
  }

  // L2: Anamorphic Lens Flare (#BFE8FF core, ~14px radius, soft halo, rotating streak)
  if (options.lensFlareEnabled !== false && (options.flareAlpha ?? 1) > 0.01) {
    const fx = (options.flareXFrac ?? 0) * w;
    const fy = (options.flareYFrac ?? 0.2) * h;
    const coreColor = options.lensFlareColor || '#BFE8FF';
    const coreR = 14 * scaleH;
    const fAlpha = clamp(options.flareAlpha ?? 1, 0, 1);

    ctx.save();
    ctx.globalAlpha = fAlpha;

    // Wide soft atmospheric halo
    const haloR = coreR * 10.5;
    const halo = ctx.createRadialGradient(fx, fy, coreR * 0.2, fx, fy, haloR);
    halo.addColorStop(0, hexToRgba(coreColor, 0.92));
    halo.addColorStop(0.18, hexToRgba(coreColor, 0.42));
    halo.addColorStop(0.5, hexToRgba('#3BA0FF', 0.14));
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(fx, fy, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Rotating anamorphic streak (28deg -> 88deg)
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(((options.flareAngleDeg ?? 28) * Math.PI) / 180);
    const streakLen = Math.max(w, h) * 1.15;
    const streakGrad = ctx.createLinearGradient(-streakLen * 0.5, 0, streakLen * 0.5, 0);
    streakGrad.addColorStop(0, 'rgba(0,0,0,0)');
    streakGrad.addColorStop(0.35, hexToRgba(coreColor, 0.24));
    streakGrad.addColorStop(0.5, hexToRgba('#FFFFFF', 0.85));
    streakGrad.addColorStop(0.65, hexToRgba(coreColor, 0.24));
    streakGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = streakGrad;
    ctx.fillRect(-streakLen * 0.5, -coreR * 0.72, streakLen, coreR * 1.44);
    ctx.restore();

    // Bright crisp core
    const core = ctx.createRadialGradient(fx, fy, 0, fx, fy, coreR * 1.3);
    core.addColorStop(0, '#FFFFFF');
    core.addColorStop(0.45, hexToRgba(coreColor, 0.95));
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(fx, fy, coreR * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

export interface ShapedClusterSlice {
  text: string;
  xStart: number;
  width: number;
}

/**
 * Arabic-preserving grapheme/ligature cluster segmentation using Intl.Segmenter + Canvas measurement.
 * Merges mandatory Arabic ligatures (like 'لا') when prefix measurement shows 0 advance width.
 */
function segmentArabicPreservingClusters(
  fullText: string,
  measurePrefix: (sub: string) => number
): ShapedClusterSlice[] {
  const rtl = isRtlText(fullText);
  const SegmenterCtor = (Intl as unknown as {
    Segmenter?: new (
      locale: string,
      opts: { granularity: 'grapheme' }
    ) => { segment: (s: string) => Iterable<{ segment: string }> };
  }).Segmenter;

  const rawUnits: string[] = SegmenterCtor
    ? Array.from(new SegmenterCtor(rtl ? 'ar' : 'en', { granularity: 'grapheme' }).segment(fullText)).map(
        (s) => s.segment
      )
    : Array.from(fullText);

  if (rawUnits.length === 0) return [];

  const totalWidth = measurePrefix(fullText);
  const slices: ShapedClusterSlice[] = [];

  let acc = '';
  let prevEdge = 0;

  for (let i = 0; i < rawUnits.length; i++) {
    acc += rawUnits[i];
    const nextEdge = measurePrefix(acc);
    const delta = nextEdge - prevEdge;

    // If a ligature (e.g., ل + ا = لا) collapsed advance width on the first char, merge with next
    if (delta < 1.5 && i < rawUnits.length - 1) {
      continue;
    }

    const sliceW = Math.max(1, totalWidth - prevEdge - (totalWidth - nextEdge));
    // For RTL, prefix 0..k lies on the RIGHT side of the centered word
    const xStart = rtl ? totalWidth - nextEdge : prevEdge;
    slices.push({
      text: acc,
      xStart,
      width: Math.max(2, sliceW),
    });
    prevEdge = nextEdge;
  }

  if (slices.length === 0) {
    return [{ text: fullText, xStart: 0, width: Math.max(10, totalWidth) }];
  }
  return slices;
}

/**
 * Draws Picture Layer with genuine 3D projective vertical-slice warp (right edge closer),
 * 6px thin dark border, 6% soft edge feather, drop shadow, outer red glow, and optional scanline glitch.
 */
export function drawPictureCard3D(
  ctx: CanvasRenderingContext2D,
  scratchCanvas: HTMLCanvasElement,
  scratchCtx: CanvasRenderingContext2D,
  blurCanvas: HTMLCanvasElement,
  blurCtx: CanvasRenderingContext2D,
  drawSourceFn: (c: CanvasRenderingContext2D, bw: number, bh: number) => void,
  opts: {
    centerX: number;
    centerY: number;
    boxW: number;
    boxH: number;
    srcAspect: number;
    rotateYDeg: number;
    rotateZDeg: number;
    scale: number;
    blurPx: number;
    motionBlurPx: number;
    accentColor: string;
    glowIntensity: number;
    shadowStrength: number;
    edgeFeatherAmount: number;
    neonOutlineOpacity: number;
    opacity: number;
    scaleH: number;
    scanlineGlitchStrength: number;
    tRef: number;
  }
): void {
  if (opts.opacity <= 0.005 || opts.boxW < 4 || opts.boxH < 4) return;

  // Preserve image aspect ratio inside [boxW, boxH]
  let drawW = opts.boxW;
  let drawH = drawW / Math.max(0.1, opts.srcAspect);
  if (drawH > opts.boxH) {
    drawH = opts.boxH;
    drawW = drawH * Math.max(0.1, opts.srcAspect);
  }
  drawW *= opts.scale;
  drawH *= opts.scale;

  const pad = Math.round(36 * opts.scaleH);
  const bufW = Math.max(8, Math.round(drawW + pad * 2));
  const bufH = Math.max(8, Math.round(drawH + pad * 2));

  if (scratchCanvas.width !== bufW || scratchCanvas.height !== bufH) {
    scratchCanvas.width = bufW;
    scratchCanvas.height = bufH;
  } else {
    scratchCtx.clearRect(0, 0, bufW, bufH);
  }

  // 1. Render picture + 6px thin dark frame into scratch buffer
  const borderPx = Math.max(2, 6 * opts.scaleH);
  scratchCtx.save();
  drawSourceFn(scratchCtx, drawW, drawH);

  // Thin dark border frame (~6px)
  scratchCtx.strokeStyle = 'rgba(10, 7, 9, 0.92)';
  scratchCtx.lineWidth = borderPx;
  scratchCtx.strokeRect(
    pad + borderPx * 0.5,
    pad + borderPx * 0.5,
    drawW - borderPx,
    drawH - borderPx
  );

  // Optional subtle horizontal scanline slice-glitch (OFF by default)
  if (opts.scanlineGlitchStrength > 0.01) {
    scratchCtx.globalAlpha = 0.15 * opts.scanlineGlitchStrength;
    const sliceH = Math.max(1, Math.round(2 * opts.scaleH));
    for (let y = pad; y < pad + drawH; y += sliceH * 4) {
      const jitter = Math.sin(y * 0.7 + opts.tRef * 42) * 3 * opts.scaleH;
      scratchCtx.drawImage(
        scratchCanvas,
        pad,
        y,
        drawW,
        sliceH,
        pad + jitter,
        y,
        drawW,
        sliceH
      );
    }
    scratchCtx.globalAlpha = 1;
  }

  // 1b. Single-pass blur BEFORE feathering & 28-strip projective warp (eliminates vertical strip seams + 28x faster)
  const totalBlur = opts.blurPx;
  if (totalBlur > 0.35) {
    if (blurCanvas.width !== bufW || blurCanvas.height !== bufH) {
      blurCanvas.width = bufW;
      blurCanvas.height = bufH;
    } else {
      blurCtx.clearRect(0, 0, bufW, bufH);
    }
    blurCtx.drawImage(scratchCanvas, 0, 0);
    scratchCtx.clearRect(0, 0, bufW, bufH);
    scratchCtx.save();
    scratchCtx.filter = `blur(${totalBlur.toFixed(1)}px)`;
    scratchCtx.drawImage(blurCanvas, 0, 0);
    scratchCtx.filter = 'none';
    scratchCtx.restore();
  }

  // 2. Apply 6% soft feather/fade on all 4 edges into background
  const feather = clamp(opts.edgeFeatherAmount, 0, 0.2);
  if (feather > 0.005) {
    scratchCtx.globalCompositeOperation = 'destination-in';
    const hMask = scratchCtx.createLinearGradient(pad, 0, pad + drawW, 0);
    hMask.addColorStop(0, 'rgba(0,0,0,0)');
    hMask.addColorStop(feather, 'rgba(0,0,0,1)');
    hMask.addColorStop(1 - feather, 'rgba(0,0,0,1)');
    hMask.addColorStop(1, 'rgba(0,0,0,0)');
    scratchCtx.fillStyle = hMask;
    scratchCtx.fillRect(pad, pad, drawW, drawH);

    const vMask = scratchCtx.createLinearGradient(0, pad, 0, pad + drawH);
    vMask.addColorStop(0, 'rgba(0,0,0,0)');
    vMask.addColorStop(feather, 'rgba(0,0,0,1)');
    vMask.addColorStop(1 - feather, 'rgba(0,0,0,1)');
    vMask.addColorStop(1, 'rgba(0,0,0,0)');
    scratchCtx.fillStyle = vMask;
    scratchCtx.fillRect(pad, pad, drawW, drawH);
  }
  scratchCtx.restore();

  // 3. Draw L3 Drop Shadow + Red Outer Glow behind warped picture, then L5 Picture via 3D Perspective Slices
  ctx.save();
  ctx.globalAlpha = opts.opacity;
  ctx.translate(opts.centerX, opts.centerY);
  ctx.rotate((opts.rotateZDeg * Math.PI) / 180);

  // Perspective: right edge closer (taller) when rotateYDeg < 0
  const persp = 1100 * opts.scaleH;
  const yawRad = (opts.rotateYDeg * Math.PI) / 180;
  const projScaleX = Math.cos(yawRad);
  const wVis = drawW * projScaleX;

  // Compute left vs right edge perspective height factor (~6% taller on right at -9deg)
  const halfW = drawW * 0.5;
  const zLeft = halfW * Math.sin(-yawRad);
  const zRight = -halfW * Math.sin(-yawRad);
  const scaleLeft = persp / Math.max(200, persp + zLeft * 1.45);
  const scaleRight = persp / Math.max(200, persp + zRight * 1.45);

  // L3 Shadow + Outer Red Glow polygon matching perspective trapezoid
  const drawTrapezoidPath = () => {
    const hl = drawH * 0.5 * scaleLeft;
    const hr = drawH * 0.5 * scaleRight;
    ctx.beginPath();
    ctx.moveTo(-wVis * 0.5, -hl);
    ctx.lineTo(wVis * 0.5, -hr);
    ctx.lineTo(wVis * 0.5, hr);
    ctx.lineTo(-wVis * 0.5, hl);
    ctx.closePath();
  };

  if (opts.shadowStrength > 0.01) {
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${0.65 * clamp(opts.shadowStrength, 0, 1.3)})`;
    ctx.shadowBlur = 40 * opts.scaleH * opts.shadowStrength;
    ctx.shadowOffsetY = 18 * opts.scaleH;
    drawTrapezoidPath();
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.restore();
  }

  if (opts.glowIntensity > 0.01) {
    ctx.save();
    const glowAlpha = Math.min(0.65, 0.34 * opts.glowIntensity);
    ctx.shadowColor = hexToRgba(opts.accentColor, glowAlpha);
    ctx.shadowBlur = 32 * opts.scaleH * opts.glowIntensity;
    drawTrapezoidPath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fill();
    ctx.restore();
  }

  // L5 Projective strip warp (28 vertical strips -> ultra smooth 3D trapezoid edge, 0 CPU stutter)
  const strips = 28;
  const motionPasses = opts.motionBlurPx > 2 ? 10 : 1;

  for (let m = 0; m < motionPasses; m++) {
    const mNorm = motionPasses === 1 ? 0 : m / (motionPasses - 1) - 0.5;
    const mDx = mNorm * opts.motionBlurPx * 1.35;
    const mWeight = motionPasses === 1 ? 1 : (1 - Math.abs(mNorm) * 0.7) / 6.2;

    ctx.save();
    ctx.globalAlpha = opts.opacity * mWeight;

    for (let s = 0; s < strips; s++) {
      const u0 = s / strips;
      const u1 = (s + 1) / strips;
      const uMid = (u0 + u1) * 0.5;
      const hScale = lerp(scaleLeft, scaleRight, uMid);

      const sx = pad + u0 * drawW;
      const sw = Math.max(1, (u1 - u0) * drawW);
      const dx = -wVis * 0.5 + u0 * wVis + mDx;
      const dw = (u1 - u0) * wVis + 0.75; // +0.75px overlap eliminates hairline seam
      const dh = drawH * hScale;

      ctx.drawImage(scratchCanvas, sx, pad, sw, drawH, dx, -dh * 0.5, dw, dh);
    }

    ctx.restore();
  }

  // Neon Red Outline (Picture B 4.9 -> 5.3)
  if (opts.neonOutlineOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = opts.opacity * opts.neonOutlineOpacity;
    ctx.shadowColor = opts.accentColor;
    ctx.shadowBlur = 18 * opts.scaleH;
    ctx.strokeStyle = opts.accentColor;
    ctx.lineWidth = Math.max(2, 3 * opts.scaleH);
    drawTrapezoidPath();
    ctx.stroke();
    ctx.restore();
  }

  ctx.filter = 'none';
  ctx.restore();
}

export class KarbalaCosmicSlideEngine {
  private scratchA: HTMLCanvasElement;
  private scratchACtx: CanvasRenderingContext2D;
  private scratchBlur: HTMLCanvasElement;
  private scratchBlurCtx: CanvasRenderingContext2D;
  private wordCanvas: HTMLCanvasElement;
  private wordCtx: CanvasRenderingContext2D;

  constructor() {
    this.scratchA = document.createElement('canvas');
    const aCtx = this.scratchA.getContext('2d');
    if (!aCtx) throw new Error('Could not init scratch buffer');
    this.scratchACtx = aCtx;

    this.scratchBlur = document.createElement('canvas');
    const bCtx = this.scratchBlur.getContext('2d');
    if (!bCtx) throw new Error('Could not init blur buffer');
    this.scratchBlurCtx = bCtx;

    this.wordCanvas = document.createElement('canvas');
    const wCtx = this.wordCanvas.getContext('2d');
    if (!wCtx) throw new Error('Could not init Arabic word shaping buffer');
    this.wordCtx = wCtx;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    timeSec: number,
    params: CosmicSlideParams,
    textData: CosmicSlideTextData,
    drawClipA: (c: CanvasRenderingContext2D, pad: number, dw: number, dh: number) => void,
    drawClipB: (c: CanvasRenderingContext2D, pad: number, dw: number, dh: number) => void,
    clipAAspect: number,
    clipBAspect: number
  ): CosmicSlideState {
    const state = computeCosmicSlideState(timeSec, params);
    const scaleH = h / 720;

    // Pure black before fade-in or after fade-out (accept check: t=0.10 & t=7.30 pure black)
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    if (state.globalOpacity <= 0.002) {
      ctx.restore();
      return state;
    }

    // Global opacity + fade-out extra scale (L8)
    ctx.globalAlpha = state.globalOpacity;
    if (Math.abs(state.globalScale - 1.0) > 0.0005) {
      ctx.translate(w * 0.5, h * 0.5);
      ctx.scale(state.globalScale, state.globalScale);
      ctx.translate(-w * 0.5, -h * 0.5);
    }

    // L0 + L1 + L2: Crimson/Blue-Black Backdrop, 3-Depth Starfield & Anamorphic Lens Flare
    drawStarfieldAndFlare(ctx, w, h, state.tRef, {
      drawBackdrop: true,
      starDensity: params.starDensity,
      starSpeed: params.starSpeed,
      lensFlareEnabled: state.flareVisible,
      lensFlareColor: params.lensFlareColor,
      bokehMix: state.focusPulse.bokehMix,
      streakStretch: state.starStreakStretch,
      rgbSplitPx: state.starRgbSplitPx,
      verticalStreaksAlpha: state.verticalStreaksAlpha,
      flareXFrac: state.flareXFrac,
      flareYFrac: state.flareYFrac,
      flareAngleDeg: state.flareAngleDeg,
      flareAlpha: state.flareAlpha,
    });

    // --- L3/L5/L6: PICTURE A + TITLE ("كربلاء") ---
    if (state.picAVisible) {
      const boxW = w * state.picAWidthFrac;
      const boxH = h * 0.72;
      const padA = Math.round(36 * scaleH);
      const cxA = w * state.picACenterXFrac;
      const cyA = h * state.picACenterYFrac;

      drawPictureCard3D(
        ctx,
        this.scratchA,
        this.scratchACtx,
        this.scratchBlur,
        this.scratchBlurCtx,
        (c, dw, dh) => drawClipA(c, padA, dw, dh),
        {
          centerX: cxA,
          centerY: cyA,
          boxW,
          boxH,
          srcAspect: clipAAspect,
          rotateYDeg: state.picARotateYDeg,
          rotateZDeg: state.picARotateZDeg,
          scale: state.picADollyScale,
          blurPx: state.picABlurPx * scaleH,
          motionBlurPx: state.picAMotionBlurPx * scaleH,
          accentColor: textData.accentColor,
          glowIntensity: params.glowIntensity,
          shadowStrength: params.shadowStrength,
          edgeFeatherAmount: params.edgeFeatherAmount,
          neonOutlineOpacity: 0,
          opacity: 1,
          scaleH,
          scanlineGlitchStrength:
            params.scanlineGlitchEnabled && state.tRef >= 0.9 && state.tRef <= 1.3 ? 1 : 0,
          tRef: state.tRef,
        }
      );

      // L6 Title ("كربلاء") travels with Picture A
      if (state.titleVisible && textData.titleText.trim()) {
        this.drawTitleOnPictureA(ctx, w, h, state, params, textData, scaleH);
      }
    }

    // --- L3/L4/L5/L6: PICTURE B + GHOST FRAMES + LINE 1 + LINE 2 + FOCUS-PULSE SHAKE ---
    if (state.picBVisible) {
      const fp = state.focusPulse;
      const boxW = w * state.picBWidthFrac;
      const boxH = h * 0.72;
      const cxB = w * state.picBCenterXFrac;
      const cyB = h * state.picBCenterYFrac;
      const padB = Math.round(36 * scaleH);

      // Focus-Pulse Shake container centered about Picture B
      ctx.save();
      ctx.translate(cxB + fp.shakeX * scaleH, cyB + fp.shakeY * scaleH);
      ctx.rotate((fp.shakeRotDeg * Math.PI) / 180);
      ctx.scale(fp.zoomScale, fp.zoomScale);
      ctx.translate(-cxB, -cyB);

      const combinedBlurB = (state.picBBlurPx + fp.blurPx) * scaleH;

      // L4: 2 Trailing Ghost Frames behind B (lag 80ms and 160ms)
      if (params.ghostFramesEnabled) {
        const ghostDefs = [
          { lagSec: 0.16, dxFrac: -0.06, dyFrac: -0.03, scale: 0.97, alpha: 0.3 },
          { lagSec: 0.08, dxFrac: -0.03, dyFrac: -0.015, scale: 1.0, alpha: 0.5 },
        ];
        for (const g of ghostDefs) {
          const lagState = computeCosmicSlideState(Math.max(0, timeSec - g.lagSec), params);
          drawPictureCard3D(
            ctx,
            this.scratchA,
            this.scratchACtx,
            this.scratchBlur,
            this.scratchBlurCtx,
            (c, dw, dh) => drawClipB(c, padB, dw, dh),
            {
              centerX: w * (lagState.picBCenterXFrac + g.dxFrac),
              centerY: h * (lagState.picBCenterYFrac + g.dyFrac),
              boxW,
              boxH,
              srcAspect: clipBAspect,
              rotateYDeg: state.picBRotateYDeg,
              rotateZDeg: state.picBRotateZDeg,
              scale: g.scale,
              blurPx: combinedBlurB + 2 * scaleH,
              motionBlurPx: 0,
              accentColor: textData.accentColor,
              glowIntensity: 0,
              shadowStrength: 0,
              edgeFeatherAmount: params.edgeFeatherAmount,
              neonOutlineOpacity: 0,
              opacity: g.alpha,
              scaleH,
              scanlineGlitchStrength: 0,
              tRef: state.tRef,
            }
          );
        }
      }

      // L5: Main Picture B
      drawPictureCard3D(
        ctx,
        this.scratchA,
        this.scratchACtx,
        this.scratchBlur,
        this.scratchBlurCtx,
        (c, dw, dh) => drawClipB(c, padB, dw, dh),
        {
          centerX: cxB,
          centerY: cyB,
          boxW,
          boxH,
          srcAspect: clipBAspect,
          rotateYDeg: state.picBRotateYDeg,
          rotateZDeg: state.picBRotateZDeg,
          scale: 1.0,
          blurPx: combinedBlurB,
          motionBlurPx: 0,
          accentColor: textData.accentColor,
          glowIntensity: params.glowIntensity,
          shadowStrength: params.shadowStrength,
          edgeFeatherAmount: params.edgeFeatherAmount,
          neonOutlineOpacity: state.picBNeonOpacity,
          opacity: 1,
          scaleH,
          scanlineGlitchStrength: 0,
          tRef: state.tRef,
        }
      );

      // L6: Line 1 ("دار النوايب") & Line 2 ("والبلى") move/scale/blur with Picture B
      this.drawTextsOnPictureB(ctx, w, h, cxB, cyB, boxW, boxH, clipBAspect, state, params, textData, scaleH);

      ctx.restore();
    }

    // L7: Fixed Screen-Space Credit Text ("الايدتور الحسيني كاسدو")
    if (textData.creditEnabled && textData.creditText.trim() && state.creditOpacity > 0.01) {
      this.drawCreditText(ctx, w, h, state, textData, scaleH);
    }

    ctx.restore();
    return state;
  }

  private drawTitleOnPictureA(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: CosmicSlideState,
    params: CosmicSlideParams,
    textData: CosmicSlideTextData,
    scaleH: number
  ) {
    const title = textData.titleText.trim();
    const rtl = isRtlText(title);
    const fontFamily = getResolvedFontFamily(textData.customFontFamily, rtl);
    const fontSize = Math.round(h * 0.09);

    // Position locked to Picture A: (0.53W, 0.62H) shifted by Picture A slide offset
    const offsetX = (state.picACenterXFrac - 0.52) * w;
    const offsetY = (state.picACenterYFrac - 0.47) * h;
    const titleX = w * 0.53 + offsetX;
    const titleY = h * 0.62 + offsetY;

    // 1. Pre-shape complete Arabic word on wordCanvas so joining & 'لا' ligatures stay 100% genuine
    this.wordCtx.font = `700 ${fontSize}px ${fontFamily}`;
    this.wordCtx.direction = rtl ? 'rtl' : 'ltr';
    const rawW = Math.ceil(this.wordCtx.measureText(title).width);
    const glowPad = Math.ceil(28 * scaleH);
    const wordBufW = Math.max(16, rawW + glowPad * 2);
    const wordBufH = Math.max(16, Math.ceil(fontSize * 1.9 + glowPad * 2));

    if (this.wordCanvas.width !== wordBufW || this.wordCanvas.height !== wordBufH) {
      this.wordCanvas.width = wordBufW;
      this.wordCanvas.height = wordBufH;
    } else {
      this.wordCtx.clearRect(0, 0, wordBufW, wordBufH);
    }

    this.wordCtx.save();
    this.wordCtx.font = `700 ${fontSize}px ${fontFamily}`;
    this.wordCtx.direction = rtl ? 'rtl' : 'ltr';
    this.wordCtx.textAlign = 'left';
    this.wordCtx.textBaseline = 'middle';
    this.wordCtx.shadowColor = hexToRgba(textData.accentColor, 0.7);
    this.wordCtx.shadowBlur = 12 * scaleH;
    this.wordCtx.fillStyle = textData.accentColor;
    this.wordCtx.fillText(title, glowPad, wordBufH * 0.5);
    this.wordCtx.restore();

    const p = state.titleAssemblyProgress;

    // If fully assembled (t >= 1.40), draw unified pre-shaped word with smooth optical slide smear if exiting
    if (p >= 0.999) {
      const mBlur = state.picAMotionBlurPx * scaleH;
      const passes = mBlur > 2 ? 9 : 1;
      ctx.save();
      if (mBlur > 3) {
        ctx.filter = `blur(${Math.min(12, mBlur * 0.14).toFixed(1)}px)`;
      }
      for (let m = 0; m < passes; m++) {
        const mNorm = passes === 1 ? 0 : m / (passes - 1) - 0.5;
        ctx.save();
        ctx.translate(titleX + mNorm * mBlur * 1.35, titleY);
        ctx.rotate((state.picARotateZDeg * 0.65 * Math.PI) / 180);
        ctx.scale(state.picATextScaleX * state.picADollyScale, state.picADollyScale);
        if (passes > 1) ctx.globalAlpha = (1 - Math.abs(mNorm) * 0.7) / 5.4;
        ctx.drawImage(this.wordCanvas, -wordBufW * 0.5, -wordBufH * 0.5);
        ctx.restore();
      }
      ctx.filter = 'none';
      ctx.restore();
      return;
    }

    // 2. Per-cluster scatter assembly (0.80 -> 1.40): 60ms non-sequential seeded stagger
    this.wordCtx.font = `700 ${fontSize}px ${fontFamily}`;
    this.wordCtx.direction = rtl ? 'rtl' : 'ltr';
    const clusters = segmentArabicPreservingClusters(title, (sub) =>
      this.wordCtx.measureText(sub).width
    );

    const rng = mulberry32(918273);
    const n = clusters.length;
    const order = clusters.map((_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }

    const totalSec = Math.max(0.15, params.assemblyDurationSec);
    const staggerFrac = Math.min(0.12, 0.06 / totalSec);
    const activeSpan = Math.max(0.35, 1 - staggerFrac * Math.max(0, n - 1));

    ctx.save();
    for (let i = 0; i < n; i++) {
      const cl = clusters[i];
      const rank = order.indexOf(i);
      const startP = rank * staggerFrac;
      const localP = clamp((p - startP) / activeSpan, 0, 1);
      const e = easeOutCubic(localP);

      // Overshoot scale 0.3 -> 1.04 -> 1.0
      const sc =
        localP < 0.72
          ? lerp(0.3, 1.04, easeOutCubic(localP / 0.72))
          : lerp(1.04, 1.0, (localP - 0.72) / 0.28);

      const randDx = (rng() * 2 - 1) * 60 * params.letterScatterAmount * scaleH;
      const randDy = (rng() * 2 - 1) * 60 * params.letterScatterAmount * scaleH;
      const randRot = (rng() * 2 - 1) * 25;

      const slicePad = Math.round(6 * scaleH);
      const sx = Math.max(0, glowPad + cl.xStart - slicePad);
      const sw = Math.min(wordBufW - sx, cl.width + slicePad * 2);

      const targetSliceCenterX = titleX - rawW * 0.5 + cl.xStart + cl.width * 0.5;
      const curX = targetSliceCenterX + randDx * (1 - e);
      const curY = titleY + randDy * (1 - e);
      const curRot = ((randRot * (1 - e)) * Math.PI) / 180;
      const curBlur = 10 * (1 - e) * scaleH;

      ctx.save();
      ctx.globalAlpha = lerp(0.5, 1.0, e);
      ctx.translate(curX, curY);
      ctx.rotate(curRot);
      ctx.scale(sc, sc);
      if (curBlur > 0.35) ctx.filter = `blur(${curBlur.toFixed(1)}px)`;
      ctx.drawImage(
        this.wordCanvas,
        sx,
        0,
        sw,
        wordBufH,
        -sw * 0.5,
        -wordBufH * 0.5,
        sw,
        wordBufH
      );
      ctx.filter = 'none';
      ctx.restore();
    }
    ctx.restore();
  }

  private drawTextsOnPictureB(
    ctx: CanvasRenderingContext2D,
    _w: number,
    h: number,
    cxB: number,
    cyB: number,
    boxW: number,
    boxH: number,
    clipBAspect: number,
    state: CosmicSlideState,
    params: CosmicSlideParams,
    textData: CosmicSlideTextData,
    scaleH: number
  ) {
    const line1 = textData.line1Text.trim();
    const line2 = textData.line2Text.trim();
    if (!line1 && !line2) return;

    let picW = boxW;
    let picH = picW / Math.max(0.1, clipBAspect);
    if (picH > boxH) {
      picH = boxH;
      picW = picH * Math.max(0.1, clipBAspect);
    }

    const fontSize = Math.round(h * 0.07);
    const rtl = isRtlText(line1 + line2);
    const fontFamily = getResolvedFontFamily(textData.customFontFamily, rtl);

    ctx.save();
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr';

    // Upper-right area of Picture B
    const rightAnchor = cxB + picW * 0.35;
    const baseLineY = cyB - picH * 0.14;
    const lineGap = fontSize * 1.5;

    const l1Width = line1 ? ctx.measureText(line1).width : 0;
    const l2Width = line2 ? ctx.measureText(line2).width : 0;
    const leftEdgeOfL1 = rightAnchor - l1Width;

    let l2X = leftEdgeOfL1 + l2Width;
    if (params.line2Align === 'center') {
      l2X = rightAnchor - l1Width * 0.5 + l2Width * 0.5;
    } else if (params.line2Align === 'right') {
      l2X = rightAnchor;
    }

    if (line1 && state.line1Opacity > 0.01) {
      ctx.save();
      ctx.globalAlpha = state.line1Opacity;
      ctx.textAlign = 'right';
      const blur1 = (state.line1BlurPx + state.focusPulse.blurPx) * scaleH;
      if (blur1 > 0.35) ctx.filter = `blur(${blur1.toFixed(1)}px)`;
      ctx.shadowColor = hexToRgba(textData.line1Color, 0.5);
      ctx.shadowBlur = 8 * scaleH;
      ctx.fillStyle = textData.line1Color;
      ctx.fillText(line1, rightAnchor, baseLineY);
      ctx.filter = 'none';
      ctx.restore();
    }

    if (line2 && state.line2Opacity > 0.01) {
      ctx.save();
      ctx.globalAlpha = state.line2Opacity;
      ctx.textAlign = 'right';
      const blur2 = state.focusPulse.blurPx * scaleH;
      if (blur2 > 0.35) ctx.filter = `blur(${blur2.toFixed(1)}px)`;
      ctx.shadowColor = hexToRgba(textData.accentColor, 0.8 * state.line2GlowNorm);
      ctx.shadowBlur = 14 * scaleH * state.line2GlowNorm;
      ctx.fillStyle = textData.accentColor;
      ctx.fillText(line2, l2X, baseLineY + lineGap);
      ctx.filter = 'none';
      ctx.restore();
    }

    ctx.restore();
  }

  private drawCreditText(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: CosmicSlideState,
    textData: CosmicSlideTextData,
    scaleH: number
  ) {
    const text = textData.creditText.trim();
    if (!text) return;

    const fontSize = Math.max(12, Math.round(h * 0.03));
    const rtl = isRtlText(text);
    const fontFamily = getResolvedFontFamily(textData.customFontFamily, rtl);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = state.creditOpacity;
    ctx.font = `600 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.fillStyle = 'rgba(176, 96, 60, 0.30)';

    let display = text;
    if (state.creditGlitchPhase < 1) {
      const revealCount = Math.max(2, Math.round(text.length * (0.25 + 0.75 * state.creditGlitchPhase)));
      display = text.slice(text.length - revealCount);
    }

    // Bottom-left screen-space x: 0.05..0.45, y: 0.90
    ctx.fillText(display, w * 0.05, h * 0.9, w * 0.4 * scaleH / scaleH);
    ctx.restore();
  }
}
