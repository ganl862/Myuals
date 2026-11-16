export const TOTAL_DURATION_MS = 4166;
export const FPS = 60;
export const TOTAL_FRAMES = 250;

export type PhaseId = 1 | 2 | 3 | 4 | 5;

export interface MotionParams {
  beatBloomPeakBrightness: number; // default 1.8 (180%)
  radialBlurMaxPx: number;         // default 14
  cardTargetScale: number;         // default 0.62
  cardTargetTiltDeg: number;       // default -8.5
  springStiffness: number;         // default 240
  springDamping: number;           // default 20
  whipBlurMaxPx: number;           // default 24
  neonGlowIntensity: number;       // default 1.0
  cosmicFirePower: number;         // default 1.0
  spinZoomBlurMax: number;         // default 1.0
}

export const DEFAULT_MOTION_PARAMS: MotionParams = {
  beatBloomPeakBrightness: 1.8,
  radialBlurMaxPx: 14,
  cardTargetScale: 0.62,
  cardTargetTiltDeg: -8.5,
  springStiffness: 240,
  springDamping: 20,
  whipBlurMaxPx: 24,
  neonGlowIntensity: 1.0,
  cosmicFirePower: 1.0,
  spinZoomBlurMax: 1.0,
};

export interface TimelineState {
  timeMs: number;
  frame: number;
  phase: PhaseId;
  phaseLabel: string;
  keyframeLabel: string;

  // Active clip visibility
  showClip1: boolean;
  showClip2: boolean;
  clip1Progress: number;
  clip2Progress: number;

  // Phase 1: Fake Zoom-Out + Real Zoom-In + Slide & Geometric Dissolve
  clip1FakeZoomScale: number;    // optical outer-tile pull-back (0.84 -> 1.0)
  clip1RealZoomScale: number;    // continuous real inward zoom (1.0 -> 1.18)
  clip1SlideXPercent: number;    // lateral slide during geometric dissolve
  geoDissolveAmount: number;     // 0..1 geometric facet fragmentation

  word1Opacity: number;
  word1Scale: number;
  word1RotateDeg: number;
  word2Opacity: number;
  word2Scale: number;
  word2SlideXPercent: number;
  introTextOpacity: number;
  beatBloomBrightness: number;
  beatBloomFlare: number;

  // Phase 2 & 3: 3D Card Shrink + Radial Blur + Whiteout + Spring Settle
  radialBlurPx: number;
  whiteoutOpacity: number;
  card1Scale: number;
  card1RotateZDeg: number;
  card1RotateXDeg: number;
  card1RotateYDeg: number;
  card1CornerRadiusNorm: number;
  card1TranslateXPercent: number;
  card1BorderGlow: number;
  card1ShadowOpacity: number;

  // Phase 3 Accent Symbol (also does quick kinetic pre-title flash in Phase 5)
  accentOpacity: number;
  accentSlideOffsetX: number;
  accentScale: number;

  // Phase 4 Whip-Pan Dash
  whipFlashOpacity: number;
  horizontalMotionBlurPx: number;

  // Phase 5: Smooth Zoom-Out Card 2 + Rotation Title + Cosmic Fire + Spin Zoom Blur
  card2TranslateXPercent: number;
  card2Scale: number;               // starts small (0.72) -> smooth zoom-out (0.54)
  card2RotateZDeg: number;
  card2BorderGlow: number;
  scene2CameraTiltDeg: number;      // whole-shot camera tilt in finale
  scene2AccentOpacity: number;      // Phase 5 pre-title tilted emblem
  scene2AccentRotateDeg: number;
  neonTitleOpacity: number;
  neonTitleTranslateXPercent: number;
  neonTitleScale: number;
  neonTitleRotateDeg: number;       // tilt rotation entrance (-22deg -> 0deg)
  neonGlowAlpha: number;
  cosmicFireIntensity: number;      // 0..1 swirling plasma behind Neon Title
  rotationalBlurAngleRad: number;   // WebGL spin blur angle
  rotationalZoomAmount: number;     // WebGL radial zoom blur factor
  chromaticSplitPx: number;         // subtle RGB aberration on impact peaks
}

export function clamp(v: number, min = 0, max = 1): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function cubicBezier(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  x: number
): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;

  let t = x;
  for (let i = 0; i < 6; i++) {
    const err = sampleX(t) - x;
    if (Math.abs(err) < 1e-5) break;
    const dx = sampleDX(t);
    if (Math.abs(dx) < 1e-6) break;
    t -= err / dx;
  }

  if (t < 0 || t > 1 || Number.isNaN(t)) {
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 12; i++) {
      const val = sampleX(t);
      if (Math.abs(val - x) < 1e-5) break;
      if (val < x) lo = t;
      else hi = t;
      t = 0.5 * (lo + hi);
    }
  }

  return sampleY(clamp(t, 0, 1));
}

export function dampedSpring(
  elapsedSec: number,
  stiffness = 240,
  damping = 20,
  mass = 1,
  initialVelocity = 0
): number {
  if (elapsedSec <= 0) return 1;
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega0 * elapsedSec);
    const c1 = 1;
    const c2 = (zeta * omega0 * c1 + initialVelocity) / omegaD;
    return decay * (c1 * Math.cos(omegaD * elapsedSec) + c2 * Math.sin(omegaD * elapsedSec));
  } else if (Math.abs(zeta - 1) < 1e-4) {
    const decay = Math.exp(-omega0 * elapsedSec);
    return decay * (1 + (omega0 + initialVelocity) * elapsedSec);
  } else {
    const gamma = omega0 * Math.sqrt(zeta * zeta - 1);
    const r1 = -omega0 * zeta + gamma;
    const r2 = -omega0 * zeta - gamma;
    const c2 = (initialVelocity - r1) / (r2 - r1);
    const c1 = 1 - c2;
    return c1 * Math.exp(r1 * elapsedSec) + c2 * Math.exp(r2 * elapsedSec);
  }
}

export function getKeyframeLabel(timeMs: number): string {
  if (timeMs < 350) return 'Phase 1: Fake Zoom-Out & Center Text';
  if (timeMs < 800) return 'Phase 1: Real Camera Zoom-In';
  if (timeMs < 950) return 'Phase 1: Beat Flash & Contrasting Word 2';
  if (timeMs < 1916) return 'Phase 1: Slide & Geometric Dissolve';
  if (timeMs < 2070) return 'Phase 2: Radial Exposure Flare';
  if (timeMs < 2140) return 'Phase 2: Peak Whiteout / Cut';
  if (timeMs < 2350) return 'Phase 2: 3D Card Shrink & Tilt (-8.5°)';
  if (timeMs < 2600) return 'Phase 3: Accent Symbol & Spring Settle';
  if (timeMs < 2850) return 'Phase 3: Card 1 Floating State';
  if (timeMs < 2975) return 'Phase 4: Whip-Pan Dash (24px Blur)';
  if (timeMs < 3220) return 'Phase 5: Smooth Zoom-Out & Tilted Entrance';
  if (timeMs < 3550) return 'Phase 5: Cosmic Fire & Neon Title Lock';
  return 'Phase 5: Whole-Shot Tilt & Spin Zoom Blur';
}

export function computeTimelineState(
  rawTimeMs: number,
  params: MotionParams = DEFAULT_MOTION_PARAMS
): TimelineState {
  const timeMs = clamp(rawTimeMs, 0, TOTAL_DURATION_MS);
  const frame = Math.min(
    TOTAL_FRAMES,
    Math.max(1, Math.round((timeMs / TOTAL_DURATION_MS) * (TOTAL_FRAMES - 1)) + 1)
  );

  let phase: PhaseId = 1;
  let phaseLabel = 'Fake Zoom & Geo Dissolve';
  if (timeMs >= 2983) {
    phase = 5;
    phaseLabel = 'Cosmic Fire & Spin Zoom Blur';
  } else if (timeMs >= 2850) {
    phase = 4;
    phaseLabel = 'Lateral Whip-Pan Dash';
  } else if (timeMs >= 2350) {
    phase = 3;
    phaseLabel = '3D Card Spring Settle';
  } else if (timeMs >= 1916) {
    phase = 2;
    phaseLabel = 'Whiteout & 3D Card Shrink';
  }

  // --- Phase 1: Fake Zoom-Out (0->280ms) + Real Zoom-In (0->1916ms) ---
  // Fake zoom-out pulls the inner frame slightly outward (0.82 -> 1.0) exposing mirrored outer edge echo
  const fakeT = clamp(timeMs / 280);
  const clip1FakeZoomScale = lerp(0.84, 1.0, cubicBezier(0.16, 1, 0.3, 1, fakeT));
  // Real zoom-in steadily pushes camera forward from 1.0 -> 1.18
  const realT = clamp(timeMs / 1916);
  const clip1RealZoomScale = lerp(1.0, 1.18, cubicBezier(0.25, 0.1, 0.25, 1, realT));

  // Slide + Geometric Dissolve starts right on the 816ms beat flash and runs to 1916ms
  let clip1SlideXPercent = 0;
  let geoDissolveAmount = 0;
  if (timeMs >= 816 && timeMs < 2083) {
    const slideT = clamp((timeMs - 816) / (1916 - 816));
    // Smooth lateral slide sweep (-10% -> +6% drift)
    clip1SlideXPercent = Math.sin(slideT * Math.PI) * -9.5;
    const attack = smoothstep(816, 1020, timeMs);
    const release = 1 - smoothstep(1820, 2083, timeMs);
    geoDissolveAmount = attack * release;
  }

  // Centered Word 1 at 0ms
  const word1Opacity = 1;
  const word1Scale = lerp(1.24, 1.0, cubicBezier(0.16, 1, 0.3, 1, clamp(timeMs / 280)));
  const word1RotateDeg = lerp(-6, 0, cubicBezier(0.16, 1, 0.3, 1, clamp(timeMs / 280)));

  // Beat flash 1 centered at 816ms (F49) -> brightness 180%
  const beatAttack = smoothstep(680, 816, timeMs);
  const beatDecay = 1 - smoothstep(816, 1180, timeMs);
  const beatFlashCurve = timeMs < 816 ? beatAttack : beatDecay;

  // Word 2 reveals at 816ms in a contrasting color with slide-in
  const word2Opacity = smoothstep(795, 910, timeMs);
  const word2EnterT = clamp((timeMs - 795) / 280);
  const word2Scale = lerp(1.28, 1.0, cubicBezier(0.16, 1, 0.3, 1, word2EnterT));
  const word2SlideXPercent = lerp(-14, 0, cubicBezier(0.16, 1, 0.3, 1, word2EnterT));

  // Intro text cuts cleanly during the 2083ms peak whiteout blast
  const introTextOpacity = timeMs < 2083 ? 1 - smoothstep(2050, 2083, timeMs) : 0;

  // --- Phase 2: 1916ms - 2350ms ---
  let radialBlurPx = 0;
  if (timeMs >= 1916 && timeMs < 2083) {
    const t = clamp((timeMs - 1916) / (2083 - 1916));
    radialBlurPx = lerp(0, params.radialBlurMaxPx, t * t);
  } else if (timeMs >= 2083 && timeMs <= 2350) {
    const t = clamp((timeMs - 2083) / (2350 - 2083));
    radialBlurPx = lerp(params.radialBlurMaxPx, 0, cubicBezier(0.16, 1, 0.3, 1, t));
  }

  let whiteoutOpacity = 0;
  if (timeMs >= 1916 && timeMs < 2083) {
    const t = clamp((timeMs - 1916) / (2083 - 1916));
    whiteoutOpacity = Math.pow(t, 2.2);
  } else if (timeMs >= 2083 && timeMs <= 2350) {
    const t = clamp((timeMs - 2083) / (2350 - 2083));
    whiteoutOpacity = 1 - cubicBezier(0.16, 1, 0.3, 1, t);
  }

  const beatBloomBrightness =
    1 +
    beatFlashCurve * (params.beatBloomPeakBrightness - 1) +
    whiteoutOpacity * 0.75;
  const beatBloomFlare = clamp(beatFlashCurve * 0.68 + whiteoutOpacity * 0.9);

  // Fullscreen -> 3D Card 1 shrink (2083ms - 2350ms) + Phase 3 spring settle
  let card1Scale = 1.0;
  let card1RotateZDeg = 0;
  let card1RotateXDeg = 0;
  let card1RotateYDeg = 0;
  let card1CornerRadiusNorm = 0;

  if (timeMs >= 2083 && timeMs < 2350) {
    const t = clamp((timeMs - 2083) / (2350 - 2083));
    const eased = cubicBezier(0.16, 1, 0.3, 1, t);
    card1Scale = lerp(1.0, params.cardTargetScale, eased);
    card1RotateZDeg = lerp(0, params.cardTargetTiltDeg, eased);
    card1RotateXDeg = Math.sin(t * Math.PI) * 7.5;
    card1RotateYDeg = Math.sin(t * Math.PI) * -9.0;
    card1CornerRadiusNorm = eased;
  } else if (timeMs >= 2350) {
    const elapsedSec = (timeMs - 2350) / 1000;
    const springVal = dampedSpring(
      elapsedSec,
      params.springStiffness,
      params.springDamping,
      1,
      -5.5
    );
    card1Scale = params.cardTargetScale + springVal * 0.045;
    card1RotateZDeg = params.cardTargetTiltDeg + springVal * -1.8;
    card1RotateXDeg = springVal * 2.5;
    card1RotateYDeg = springVal * -3.0;
    card1CornerRadiusNorm = 1;
  }

  const card1BorderGlow = smoothstep(2280, 2460, timeMs);
  const card1ShadowOpacity = smoothstep(2110, 2360, timeMs);

  // Phase 3 Accent Symbol beside Card 1
  let accentOpacity = 0;
  let accentSlideOffsetX = 48;
  let accentScale = 0.7;
  if (timeMs >= 2380 && timeMs < 2966) {
    const enterT = clamp((timeMs - 2380) / 220);
    const springAccent = dampedSpring(
      Math.max(0, (timeMs - 2380) / 1000),
      params.springStiffness,
      params.springDamping,
      1,
      4.0
    );
    accentOpacity = smoothstep(2380, 2455, timeMs) * (1 - smoothstep(2890, 2950, timeMs));
    accentSlideOffsetX = springAccent * 38;
    accentScale = lerp(0.75, 1.0, cubicBezier(0.16, 1, 0.3, 1, enterT)) + (1 - enterT) * 0.08;
  }

  // --- Phase 4: Whip-Pan Dash (2850ms - 2966ms) ---
  let card1TranslateXPercent = 0;
  let whipFlashOpacity = 0;
  let whipOutBlur = 0;

  if (timeMs >= 2850 && timeMs <= 2966) {
    const t = clamp((timeMs - 2850) / (2966 - 2850));
    const flashUp = smoothstep(2850, 2885, timeMs);
    const flashDown = 1 - smoothstep(2885, 2975, timeMs);
    whipFlashOpacity = (timeMs < 2885 ? flashUp : flashDown) * 0.88;

    const whipCurve = t * t * (2 - t * 0.4);
    card1TranslateXPercent = lerp(0, 160, clamp(whipCurve, 0, 1));
    whipOutBlur = Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5) * params.whipBlurMaxPx;
  } else if (timeMs > 2966) {
    card1TranslateXPercent = 160;
  }

  // --- Phase 5: Smooth Zoom-Out Card 2 + Rotation Title + Cosmic Fire + Spin Zoom Blur ---
  let card2TranslateXPercent = -160;
  let card2Scale = 0.72;
  let card2RotateZDeg = 0;
  let whipInBlur = 0;
  let card2BorderGlow = 0;

  let scene2AccentOpacity = 0;
  let scene2AccentRotateDeg = 0;

  let neonTitleOpacity = 0;
  let neonTitleTranslateXPercent = -120;
  let neonTitleScale = 0.92;
  let neonTitleRotateDeg = -22;
  let neonGlowAlpha = 0;
  let cosmicFireIntensity = 0;

  let scene2CameraTiltDeg = 0;
  let rotationalBlurAngleRad = 0;
  let rotationalZoomAmount = 0;

  if (timeMs >= 2983) {
    const whipDurationMs = 220;
    const t = clamp((timeMs - 2983) / whipDurationMs);
    const whipEase = cubicBezier(0.16, 1, 0.3, 1, t);

    const springElapsedSec = Math.max(0, (timeMs - 3050) / 1000);
    const springDisp = dampedSpring(
      springElapsedSec,
      params.springStiffness,
      params.springDamping,
      1,
      -6.5
    );

    if (timeMs < 3050) {
      card2TranslateXPercent = lerp(-160, -16, whipEase);
    } else {
      card2TranslateXPercent = springDisp * -20;
    }

    // Scene 2 Smooth Continuous Zoom-Out: starts small (0.72) and zooms smoothly out to 0.54
    const zoomOutT = clamp((timeMs - 2983) / (TOTAL_DURATION_MS - 2983));
    card2Scale = lerp(0.72, 0.54, cubicBezier(0.22, 1, 0.36, 1, zoomOutT));
    card2RotateZDeg = springDisp * 4.2;
    whipInBlur = (1 - smoothstep(2983, 3175, timeMs)) * params.whipBlurMaxPx;
    card2BorderGlow = smoothstep(3080, 3360, timeMs);

    if (timeMs < 3060) {
      whipFlashOpacity = Math.max(
        whipFlashOpacity,
        (1 - smoothstep(2983, 3060, timeMs)) * 0.52
      );
    }

    // Brief kinetic rotated emblem settle before/into Main Title (2995ms - 3320ms)
    if (timeMs >= 2995 && timeMs <= 3340) {
      const aT = clamp((timeMs - 2995) / 220);
      const aIn = smoothstep(2995, 3050, timeMs);
      const aOut = 1 - smoothstep(3180, 3340, timeMs);
      scene2AccentOpacity = aIn * aOut * 0.92;
      scene2AccentRotateDeg = lerp(-24, 0, cubicBezier(0.16, 1, 0.3, 1, aT));
    }

    // Main Neon Title enters with dramatic Tilt/Rotation animation (-22deg -> 0deg) + Cosmic Fire
    if (timeMs >= 3060) {
      const titleT = clamp((timeMs - 3060) / 420);
      const easedSlide = cubicBezier(0.16, 1, 0.3, 1, titleT);
      const springTitle = dampedSpring(
        Math.max(0, (timeMs - 3180) / 1000),
        params.springStiffness,
        params.springDamping,
        1,
        -4.5
      );

      neonTitleOpacity = smoothstep(3060, 3150, timeMs);
      neonTitleTranslateXPercent =
        timeMs < 3180 ? lerp(-110, -10, easedSlide) : springTitle * -12;
      neonTitleScale = lerp(1.26, 1.0, easedSlide);
      // Signature tilt rotation animation settling upright in center
      neonTitleRotateDeg =
        timeMs < 3180 ? lerp(-22, 3.5, easedSlide) : springTitle * -4.2;

      const surge = Math.sin(clamp((timeMs - 3080) / 360) * Math.PI) * 0.45;
      neonGlowAlpha = (smoothstep(3060, 3180, timeMs) + surge) * params.neonGlowIntensity;

      // Cosmic Fire ("النار الكونية") swirls strongly behind the Neon Title
      cosmicFireIntensity =
        smoothstep(3080, 3360, timeMs) * params.cosmicFirePower;
    }

    // Finale (3540ms - 4166ms): Whole-Shot Tilt Animation + Rotational Zoom Blur ("روتيشن زوم بلور")
    if (timeMs >= 3540) {
      const fT = clamp((timeMs - 3540) / (TOTAL_DURATION_MS - 3540));
      // Dynamic whip-tilt oscillation across the whole shot: 0 -> -11deg -> +4deg -> -2.5deg
      const envelope = Math.sin(fT * Math.PI);
      const secondaryWave = Math.sin(fT * Math.PI * 2.2);
      scene2CameraTiltDeg = -9.5 * envelope + 3.2 * secondaryWave * (1 - fT * 0.35);

      // Rotational Zoom Blur peaks during the fast tilt velocity swings
      const blurStrength = (0.45 + 0.55 * Math.sin(fT * Math.PI)) * params.spinZoomBlurMax;
      rotationalBlurAngleRad = 0.048 * blurStrength;
      rotationalZoomAmount = 0.055 * blurStrength;
    }
  }

  const horizontalMotionBlurPx = Math.max(whipOutBlur, whipInBlur);
  const chromaticSplitPx =
    beatFlashCurve * 5.0 +
    (horizontalMotionBlurPx / 24) * 7.0 +
    (rotationalZoomAmount / 0.055) * 4.5;

  const showClip1 = timeMs <= 2966;
  const showClip2 = timeMs >= 2975;

  const clip1Progress = clamp(timeMs / 2966);
  const clip2Progress = clamp((timeMs - 2975) / (TOTAL_DURATION_MS - 2975));

  return {
    timeMs,
    frame,
    phase,
    phaseLabel,
    keyframeLabel: getKeyframeLabel(timeMs),

    showClip1,
    showClip2,
    clip1Progress,
    clip2Progress,

    clip1FakeZoomScale,
    clip1RealZoomScale,
    clip1SlideXPercent,
    geoDissolveAmount,

    word1Opacity,
    word1Scale,
    word1RotateDeg,
    word2Opacity,
    word2Scale,
    word2SlideXPercent,
    introTextOpacity,
    beatBloomBrightness,
    beatBloomFlare,

    radialBlurPx,
    whiteoutOpacity,
    card1Scale,
    card1RotateZDeg,
    card1RotateXDeg,
    card1RotateYDeg,
    card1CornerRadiusNorm,
    card1TranslateXPercent,
    card1BorderGlow,
    card1ShadowOpacity,

    accentOpacity,
    accentSlideOffsetX,
    accentScale,

    whipFlashOpacity,
    horizontalMotionBlurPx,

    card2TranslateXPercent,
    card2Scale,
    card2RotateZDeg,
    card2BorderGlow,
    scene2CameraTiltDeg,
    scene2AccentOpacity,
    scene2AccentRotateDeg,
    neonTitleOpacity,
    neonTitleTranslateXPercent,
    neonTitleScale,
    neonTitleRotateDeg,
    neonGlowAlpha,
    cosmicFireIntensity,
    rotationalBlurAngleRad,
    rotationalZoomAmount,
    chromaticSplitPx,
  };
}
