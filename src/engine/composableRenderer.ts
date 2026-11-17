import { drawCosmicFire, drawGeometricDissolve } from './cosmicFire';
import {
  CosmicFireGlowEngine,
  CosmicFireGlowParams,
  extractFireGlowParamsFromEffect,
  getResolvedCosmicTextFont,
} from './cosmicFireGlow';
import {
  COSMIC_SLIDE_REF_DURATION_SEC,
  CosmicSlideParams,
  CosmicSlideTextData,
  DEFAULT_COSMIC_SLIDE_PARAMS,
  drawStarfieldAndFlare,
  KarbalaCosmicSlideEngine,
} from './cosmicSlide';
import { mulberry32 } from './prng';
import {
  clamp,
  computeTimelineState,
  cubicBezier,
  DEFAULT_MOTION_PARAMS,
  lerp,
  MotionParams,
  smoothstep,
  TimelineState,
  TOTAL_DURATION_MS,
} from './motionMath';
import {
  CanvasDimensions,
  mapProgressToClipTimeSec,
  MediaClipItem,
} from './mediaTimeline';
import {
  AttachedEffectInstance,
  ClipTransitionAssignment,
  getTransitionDef,
} from './registry';
import {
  computeAutoFontSize,
  getResolvedFontFamily,
  hexToRgba,
  isRtlText,
  TextLayerConfig,
} from './typography';
import { WebGLPostProcessor } from './webglEffects';

export type LoadedMediaSource =
  | { kind: 'image'; element: HTMLImageElement }
  | { kind: 'video'; element: HTMLVideoElement }
  | { kind: 'procedural'; variant: 'amber-sculpt' | 'crimson-silk' | 'obsidian-gold' };

export interface ComposableRenderOptions {
  timeMs: number;
  totalDurationMs?: number;
  dimensions: CanvasDimensions;
  clips: MediaClipItem[];
  clipAssignments: Record<string, ClipTransitionAssignment>;
  textEffects: AttachedEffectInstance[];
  mediaSources: Map<string, LoadedMediaSource>;
  textConfig: TextLayerConfig;
  useWebGL: boolean;
}

export function isCosmicSlideActive(
  clips: MediaClipItem[],
  clipAssignments: Record<string, ClipTransitionAssignment>
): boolean {
  return clips.some((c) => clipAssignments[c.id]?.transitionId === 'cosmic_slide_3d');
}

export function resolveActiveDurationMs(
  clips: MediaClipItem[],
  clipAssignments: Record<string, ClipTransitionAssignment>
): number {
  for (const c of clips) {
    const a = clipAssignments[c.id];
    if (a?.transitionId === 'cosmic_slide_3d') {
      const sec = a.values.durationSec ?? COSMIC_SLIDE_REF_DURATION_SEC;
      return Math.round(clamp(sec, 3.0, 12.0) * 1000);
    }
  }
  const primary = clips[0] ? clipAssignments[clips[0].id] : undefined;
  const durScale = primary?.values.durationScale ?? 1.0;
  return Math.round(TOTAL_DURATION_MS * clamp(durScale, 0.6, 1.5));
}

function getSourceAspectRatio(
  clip: MediaClipItem | undefined,
  source: LoadedMediaSource | undefined,
  fallbackAspect = 16 / 9
): number {
  if (source?.kind === 'image' && source.element.naturalWidth > 0 && source.element.naturalHeight > 0) {
    return source.element.naturalWidth / source.element.naturalHeight;
  }
  if (source?.kind === 'video' && source.element.videoWidth > 0 && source.element.videoHeight > 0) {
    return source.element.videoWidth / source.element.videoHeight;
  }
  if (source?.kind === 'procedural') {
    return fallbackAspect;
  }
  if (clip && clip.kind !== 'procedural' && clip.width > 0 && clip.height > 0) {
    return clip.width / clip.height;
  }
  return fallbackAspect;
}

function drawSourceIntoRect(
  ctx: CanvasRenderingContext2D,
  source: LoadedMediaSource | undefined,
  variantFallback: 'amber-sculpt' | 'crimson-silk' | 'obsidian-gold',
  x: number,
  y: number,
  w: number,
  h: number,
  progress01: number
) {
  ctx.save();
  ctx.translate(x, y);
  drawCoverMedia(ctx, source, variantFallback, w, h, progress01);
  ctx.restore();
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawProceduralClip(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  variant: 'amber-sculpt' | 'crimson-silk' | 'obsidian-gold',
  progress01: number
) {
  const t = progress01 * Math.PI * 2;
  const cx = w * 0.5;
  const cy = h * 0.48;
  const minDim = Math.min(w, h);

  if (variant === 'amber-sculpt') {
    // Cinema twilight desert horizon + backlit volumetric sunbeams
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0D080A');
    sky.addColorStop(0.42, '#2B1612');
    sky.addColorStop(0.68, '#7A4224');
    sky.addColorStop(0.84, '#2A120D');
    sky.addColorStop(1, '#080507');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const sunX = w * (0.58 + Math.sin(t * 0.35) * 0.025);
    const sunY = h * 0.42;
    const sunBloom = ctx.createRadialGradient(sunX, sunY, minDim * 0.02, sunX, sunY, w * 0.62);
    sunBloom.addColorStop(0, 'rgba(255, 240, 200, 0.96)');
    sunBloom.addColorStop(0.16, 'rgba(255, 198, 122, 0.72)');
    sunBloom.addColorStop(0.44, 'rgba(196, 98, 52, 0.36)');
    sunBloom.addColorStop(1, 'rgba(14, 7, 8, 0)');
    ctx.fillStyle = sunBloom;
    ctx.fillRect(0, 0, w, h);

    // Volumetric god-rays
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let r = 0; r < 5; r++) {
      const ang = -0.55 + r * 0.24 + Math.sin(t * 0.4 + r) * 0.03;
      const rayGrad = ctx.createLinearGradient(sunX, sunY, sunX + Math.cos(ang) * w, sunY + Math.sin(ang) * h);
      rayGrad.addColorStop(0, 'rgba(255, 214, 152, 0.22)');
      rayGrad.addColorStop(1, 'rgba(255, 160, 90, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(ang - 0.09) * w * 1.2, sunY + Math.sin(ang - 0.09) * h * 1.2);
      ctx.lineTo(sunX + Math.cos(ang + 0.09) * w * 1.2, sunY + Math.sin(ang + 0.09) * h * 1.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Silhouetted distant dunes & monumental archway profile
    ctx.save();
    ctx.fillStyle = 'rgba(12, 7, 8, 0.88)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.bezierCurveTo(w * 0.24, h * 0.64, w * 0.46, h * 0.74, w * 0.66, h * 0.66);
    ctx.bezierCurveTo(w * 0.82, h * 0.61, w * 0.92, h * 0.68, w, h * 0.63);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Central rim-lit figure / monument silhouette
    ctx.fillStyle = '#090507';
    ctx.beginPath();
    ctx.ellipse(w * 0.44, h * 0.68, w * 0.14, h * 0.24, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(w * 0.58, h);
    ctx.lineTo(w * 0.30, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Floating dust embers (deterministic seeded)
    const rng = mulberry32(1041);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 36; i++) {
      const px = ((rng() + progress01 * (0.04 + rng() * 0.08)) % 1) * w;
      const py = ((rng() - progress01 * (0.08 + rng() * 0.12) + 1) % 1) * h;
      const r = (1 + rng() * 2.2) * (minDim / 720);
      ctx.fillStyle = `rgba(255, 208, 138, ${0.18 + rng() * 0.42})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (variant === 'crimson-silk') {
    // Low-key crimson sunset horizon over dark clouds (matches moody epic silhouette reference)
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#070408');
    sky.addColorStop(0.32, '#240B14');
    sky.addColorStop(0.58, '#5C1822');
    sky.addColorStop(0.76, '#280A10');
    sky.addColorStop(1, '#050306');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const horizonX = w * 0.48 + Math.cos(t * 0.4) * w * 0.03;
    const horizonY = h * 0.52;
    const glow = ctx.createRadialGradient(horizonX, horizonY, minDim * 0.03, horizonX, horizonY, w * 0.65);
    glow.addColorStop(0, 'rgba(255, 168, 112, 0.72)');
    glow.addColorStop(0.3, 'rgba(216, 48, 72, 0.48)');
    glow.addColorStop(0.68, 'rgba(92, 14, 34, 0.25)');
    glow.addColorStop(1, 'rgba(8, 3, 8, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Dramatic dark storm cloud bands
    for (let i = 0; i < 4; i++) {
      const yB = h * (0.14 + i * 0.13);
      const band = ctx.createLinearGradient(0, yB, w, yB + h * 0.08);
      band.addColorStop(0, 'rgba(12, 5, 10, 0.65)');
      band.addColorStop(0.5, 'rgba(148, 56, 52, 0.22)');
      band.addColorStop(1, 'rgba(10, 4, 8, 0.72)');
      ctx.fillStyle = band;
      ctx.beginPath();
      ctx.ellipse(
        w * (0.3 + i * 0.16) + Math.sin(t + i) * w * 0.02,
        yB,
        w * 0.48,
        h * 0.065,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Horizon ridge & dark silhouette
    ctx.fillStyle = '#090407';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.69);
    ctx.quadraticCurveTo(w * 0.45, h * 0.62, w, h * 0.71);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Subtle rising embers
    const rng = mulberry32(3097);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 32; i++) {
      const px = rng() * w;
      const py = ((rng() - progress01 * (0.12 + rng() * 0.14) + 1) % 1) * h;
      const r = (1.1 + rng() * 2.0) * (minDim / 720);
      ctx.fillStyle = `rgba(255, 108, 128, ${0.2 + rng() * 0.45})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#070B16');
    bg.addColorStop(0.52, '#1A243C');
    bg.addColorStop(1, '#06080E');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const beam = ctx.createRadialGradient(cx, cy - h * 0.1, minDim * 0.04, cx, cy, w * 0.68);
    beam.addColorStop(0, 'rgba(246, 200, 118, 0.36)');
    beam.addColorStop(0.45, 'rgba(56, 130, 212, 0.20)');
    beam.addColorStop(1, 'rgba(6, 8, 14, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, w, h);
  }

  // Shared crushed cinema corner vignette
  const vig = ctx.createRadialGradient(cx, cy, minDim * 0.26, cx, cy, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(4,3,6,0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function drawCoverMedia(
  ctx: CanvasRenderingContext2D,
  source: LoadedMediaSource | undefined,
  variantFallback: 'amber-sculpt' | 'crimson-silk' | 'obsidian-gold',
  targetW: number,
  targetH: number,
  progress01: number
) {
  if (!source || source.kind === 'procedural') {
    drawProceduralClip(
      ctx,
      targetW,
      targetH,
      source?.kind === 'procedural' ? source.variant : variantFallback,
      progress01
    );
    return;
  }

  let srcW = 0;
  let srcH = 0;
  let drawable: CanvasImageSource | null = null;

  if (source.kind === 'image') {
    const img = source.element;
    if (!img.complete || img.naturalWidth === 0) {
      drawProceduralClip(ctx, targetW, targetH, variantFallback, progress01);
      return;
    }
    srcW = img.naturalWidth;
    srcH = img.naturalHeight;
    drawable = img;
  } else if (source.kind === 'video') {
    const vid = source.element;
    if (vid.readyState < 2 || vid.videoWidth === 0) {
      drawProceduralClip(ctx, targetW, targetH, variantFallback, progress01);
      return;
    }
    srcW = vid.videoWidth;
    srcH = vid.videoHeight;
    drawable = vid;
  }

  if (!drawable || srcW === 0 || srcH === 0) {
    drawProceduralClip(ctx, targetW, targetH, variantFallback, progress01);
    return;
  }

  const targetRatio = targetW / targetH;
  const srcRatio = srcW / srcH;

  let sx = 0;
  let sy = 0;
  let sw = srcW;
  let sh = srcH;

  if (srcRatio > targetRatio) {
    sw = srcH * targetRatio;
    sx = (srcW - sw) * 0.5;
  } else {
    sh = srcW / targetRatio;
    sy = (srcH - sh) * 0.5;
  }

  ctx.drawImage(drawable, sx, sy, sw, sh, 0, 0, targetW, targetH);
}

/**
 * Helper to check if any active clip assignment or text layer has a given attachable effect.
 */
function findEffectsByPlacement(
  effects: AttachedEffectInstance[],
  placement: AttachedEffectInstance['placement']
): AttachedEffectInstance[] {
  return effects.filter((e) => e.enabled && e.placement === placement);
}

export function buildMotionParamsFromAssignment(
  clip1Assign?: ClipTransitionAssignment,
  clip2Assign?: ClipTransitionAssignment,
  allEffects: AttachedEffectInstance[] = []
): MotionParams {
  const c1 = clip1Assign?.values ?? {};
  const c2 = clip2Assign?.values ?? {};

  const bloomFx = allEffects.find((e) => e.enabled && e.effectId === 'beat-bloom');
  const fireFx = allEffects.find((e) => e.enabled && e.effectId === 'cosmic-fire');
  const spinFx = allEffects.find((e) => e.enabled && e.effectId === 'rotational-zoom-blur');
  const neonFx = allEffects.find((e) => e.enabled && e.effectId === 'neon-glow-aura');

  return {
    ...DEFAULT_MOTION_PARAMS,
    beatBloomPeakBrightness:
      bloomFx?.values.brightness ?? c1.beatBrightness ?? DEFAULT_MOTION_PARAMS.beatBloomPeakBrightness,
    radialBlurMaxPx: c1.radialBlurPx ?? DEFAULT_MOTION_PARAMS.radialBlurMaxPx,
    cardTargetScale: c1.cardScale ?? DEFAULT_MOTION_PARAMS.cardTargetScale,
    cardTargetTiltDeg: c1.cardTiltDeg ?? DEFAULT_MOTION_PARAMS.cardTargetTiltDeg,
    whipBlurMaxPx: c1.whipBlurPx ?? DEFAULT_MOTION_PARAMS.whipBlurMaxPx,
    neonGlowIntensity: neonFx?.values.power ?? DEFAULT_MOTION_PARAMS.neonGlowIntensity,
    cosmicFirePower: fireFx ? (fireFx.values.intensity ?? 1.0) : 0,
    spinZoomBlurMax: spinFx
      ? (spinFx.values.strength ?? 1.0)
      : (c2.tiltSwingDeg ?? c1.tiltSwingDeg)
        ? (c2.tiltSwingDeg ?? c1.tiltSwingDeg) / 9.5
        : 0.9,
    card2StartScale: c2.startScale ?? DEFAULT_MOTION_PARAMS.card2StartScale,
    card2EndScale: c2.endScale ?? DEFAULT_MOTION_PARAMS.card2EndScale,
    tiltSwingDeg: c2.tiltSwingDeg ?? c1.tiltSwingDeg ?? DEFAULT_MOTION_PARAMS.tiltSwingDeg,
    chromaticBoost: c1.chromaticSplit ?? DEFAULT_MOTION_PARAMS.chromaticBoost,
  };
}

function findCosmicFireGlowForSlot(
  textEffects: AttachedEffectInstance[],
  slot: 'overlayText' | 'word1' | 'word2' | 'accentSymbol' | 'neonTitle' | 'cosmicTitle' | 'cosmicLine1' | 'cosmicLine2'
): CosmicFireGlowParams | null {
  for (const fx of textEffects) {
    if (!fx.enabled || fx.effectId !== 'cosmic_fire_glow') continue;
    const tSlot = fx.targetTextSlot ?? 'overlayText';
    if (tSlot === slot || tSlot === 'all') {
      return extractFireGlowParamsFromEffect(fx.values, fx.toggles, fx.selects, fx.colorHex);
    }
  }
  return null;
}

export class ComposableCanvasRenderer {
  private sceneCanvas: HTMLCanvasElement;
  private sceneCtx: CanvasRenderingContext2D;
  private clipBufferCanvas: HTMLCanvasElement;
  private clipBufferCtx: CanvasRenderingContext2D;
  private mediaScratchCanvas: HTMLCanvasElement;
  private mediaScratchCtx: CanvasRenderingContext2D;
  private webglProcessor: WebGLPostProcessor | null = null;
  private cosmicEngine: KarbalaCosmicSlideEngine;
  private cosmicFireEngine: CosmicFireGlowEngine;

  constructor(width = 720, height = 1280) {
    this.sceneCanvas = document.createElement('canvas');
    this.sceneCanvas.width = width;
    this.sceneCanvas.height = height;
    const sCtx = this.sceneCanvas.getContext('2d');
    if (!sCtx) throw new Error('Could not initialize 2D scene canvas');
    this.sceneCtx = sCtx;

    this.clipBufferCanvas = document.createElement('canvas');
    this.clipBufferCanvas.width = width;
    this.clipBufferCanvas.height = height;
    const cCtx = this.clipBufferCanvas.getContext('2d');
    if (!cCtx) throw new Error('Could not initialize 2D clip buffer');
    this.clipBufferCtx = cCtx;

    this.mediaScratchCanvas = document.createElement('canvas');
    this.mediaScratchCanvas.width = width;
    this.mediaScratchCanvas.height = height;
    const mCtx = this.mediaScratchCanvas.getContext('2d');
    if (!mCtx) throw new Error('Could not initialize 2D media scratch buffer');
    this.mediaScratchCtx = mCtx;

    this.webglProcessor = new WebGLPostProcessor(width, height);
    this.cosmicEngine = new KarbalaCosmicSlideEngine();
    this.cosmicFireEngine = new CosmicFireGlowEngine();
  }

  public isWebGLAvailable(): boolean {
    return Boolean(this.webglProcessor?.available);
  }

  public syncVideoTimes(
    clips: MediaClipItem[],
    mediaSources: Map<string, LoadedMediaSource>,
    state: TimelineState,
    rawTimeMs?: number,
    totalDurationMs: number = TOTAL_DURATION_MS,
    isCosmic: boolean = false
  ): void {
    const isSingle = clips.length === 1;
    const clip1 = clips[0];
    const clip2 = clips[1] ?? clips[0];
    const clip3 = clips.length >= 3 ? clips[2] : undefined;
    const tMs = rawTimeMs ?? state.timeMs;

    if (isCosmic) {
      const splitMs = totalDurationMs * 0.44;
      if (clip1) {
        const src1 = mediaSources.get(clip1.id);
        if (src1?.kind === 'video') {
          const p1 = isSingle ? clamp(tMs / Math.max(1, totalDurationMs)) : clamp(tMs / Math.max(1, splitMs));
          const targetTime = mapProgressToClipTimeSec(clip1, p1);
          if (Math.abs(src1.element.currentTime - targetTime) > 0.04) {
            src1.element.currentTime = targetTime;
          }
        }
      }
      if (!isSingle && clip2 && clip2.id !== clip1?.id) {
        const src2 = mediaSources.get(clip2.id);
        if (src2?.kind === 'video') {
          const p2 = clamp((tMs - splitMs) / Math.max(1, totalDurationMs - splitMs));
          const targetTime = mapProgressToClipTimeSec(clip2, p2);
          if (Math.abs(src2.element.currentTime - targetTime) > 0.04) {
            src2.element.currentTime = targetTime;
          }
        }
      }
      return;
    }

    if (clip1) {
      const src1 = mediaSources.get(clip1.id);
      if (src1?.kind === 'video') {
        const p1 = isSingle ? clamp(state.timeMs / 4166) : state.clip1Progress;
        const targetTime = mapProgressToClipTimeSec(clip1, p1);
        if (Math.abs(src1.element.currentTime - targetTime) > 0.04) {
          src1.element.currentTime = targetTime;
        }
      }
    }
    if (!isSingle && clip2 && clip2.id !== clip1?.id) {
      const src2 = mediaSources.get(clip2.id);
      if (src2?.kind === 'video') {
        const targetTime = mapProgressToClipTimeSec(clip2, state.clip2Progress);
        if (Math.abs(src2.element.currentTime - targetTime) > 0.04) {
          src2.element.currentTime = targetTime;
        }
      }
    }
    if (clip3) {
      const src3 = mediaSources.get(clip3.id);
      if (src3?.kind === 'video') {
        const p3 = clamp((state.timeMs - 3620) / (4166 - 3620));
        const targetTime = mapProgressToClipTimeSec(clip3, p3);
        if (Math.abs(src3.element.currentTime - targetTime) > 0.04) {
          src3.element.currentTime = targetTime;
        }
      }
    }
  }

  public renderFrame(
    targetCanvas: HTMLCanvasElement,
    options: ComposableRenderOptions
  ): TimelineState {
    const {
      timeMs,
      dimensions,
      clips,
      clipAssignments,
      textEffects,
      mediaSources,
      textConfig,
      useWebGL,
    } = options;

    const { width: w, height: h } = dimensions;

    if (targetCanvas.width !== w || targetCanvas.height !== h) {
      targetCanvas.width = w;
      targetCanvas.height = h;
    }
    if (this.sceneCanvas.width !== w || this.sceneCanvas.height !== h) {
      this.sceneCanvas.width = w;
      this.sceneCanvas.height = h;
      this.clipBufferCanvas.width = w;
      this.clipBufferCanvas.height = h;
      this.mediaScratchCanvas.width = w;
      this.mediaScratchCanvas.height = h;
    }

    const clip1 = clips[0];
    const clip2 = clips[1];
    const clip3 = clips[2];
    const isSingleClip = clips.length === 1;

    const c1Assign = clip1 ? clipAssignments[clip1.id] : undefined;
    const c2Assign = clip2 ? clipAssignments[clip2.id] : undefined;

    // Dedicated Karbala Cosmic Slide (cosmic_slide_3d) Scene-Level Package Execution
    const cosmicAssign =
      c1Assign?.transitionId === 'cosmic_slide_3d'
        ? c1Assign
        : c2Assign?.transitionId === 'cosmic_slide_3d'
          ? c2Assign
          : null;

    if (cosmicAssign) {
      const targetCtx = targetCanvas.getContext('2d');
      const totalMs = options.totalDurationMs ?? resolveActiveDurationMs(clips, clipAssignments);
      const timeSec = clamp(timeMs / 1000, 0, totalMs / 1000);

      // Combine transition values with attached reusable modifiers cleanly
      const allClip1Fx = cosmicAssign.effects ?? [];
      const allClip2Fx = (clip2 ? clipAssignments[clip2.id]?.effects : []) ?? [];
      const glowMod = allClip1Fx.find((e) => e.enabled && e.effectId === 'picture-glow-shadow-feather');
      const starMod = allClip1Fx.find((e) => e.enabled && e.effectId === 'starfield-lens-flare');
      const hasGlowModRegistered = allClip1Fx.some((e) => e.effectId === 'picture-glow-shadow-feather');
      const hasStarModRegistered = allClip1Fx.some((e) => e.effectId === 'starfield-lens-flare');

      // Self-contained Focus-Pulse & Shake directly inside cosmic_slide_3d (plus optional Clip 2 override)
      const vals = cosmicAssign.values;
      const togs = cosmicAssign.toggles ?? {};
      const sels = cosmicAssign.selects ?? {};

      const c2IsFocusPulse = c2Assign?.transitionId === 'focus_pulse_shake';
      const c2ShakeMod = allClip2Fx.find((e) => e.enabled && e.effectId === 'focus-pulse-shake');
      const c2OffExplicitly =
        (c2Assign?.transitionId === 'none' || c2Assign?.transitionId === 'cinematic-shake-impact') &&
        !c2ShakeMod;

      const shakeEnabled = c2OffExplicitly
        ? false
        : (togs.shakeEnabled ?? c2Assign?.toggles?.shakeEnabled ?? DEFAULT_COSMIC_SLIDE_PARAMS.shakeEnabled);
      const focusPulseEnabled = c2OffExplicitly
        ? false
        : (togs.focusPulseEnabled ?? c2Assign?.toggles?.focusPulseEnabled ?? DEFAULT_COSMIC_SLIDE_PARAMS.focusPulseEnabled);

      const cosmicParams: CosmicSlideParams = {
        ...DEFAULT_COSMIC_SLIDE_PARAMS,
        durationSec: totalMs / 1000,
        slideDirection: (sels.slideDirection as CosmicSlideParams['slideDirection']) ?? 'right',
        motionBlurStrength: ((vals.motionBlurStrength ?? 100) / 100),
        starDensity: hasStarModRegistered && !starMod
          ? 0.0
          : (starMod?.values.starDensity ?? vals.starDensity ?? DEFAULT_COSMIC_SLIDE_PARAMS.starDensity),
        starSpeed: starMod?.values.starSpeed ?? vals.starSpeed ?? DEFAULT_COSMIC_SLIDE_PARAMS.starSpeed,
        lensFlareEnabled:
          hasStarModRegistered && !starMod
            ? false
            : (togs.lensFlareEnabled ?? DEFAULT_COSMIC_SLIDE_PARAMS.lensFlareEnabled),
        letterScatterAmount: vals.letterScatterAmount ?? DEFAULT_COSMIC_SLIDE_PARAMS.letterScatterAmount,
        assemblyDurationSec: vals.assemblyDurationSec ?? DEFAULT_COSMIC_SLIDE_PARAMS.assemblyDurationSec,
        shakeEnabled,
        shakeStrength:
          vals.shakeStrength ??
          (c2IsFocusPulse || c2ShakeMod
            ? (c2ShakeMod?.values.shakeStrength ?? c2Assign?.values.shakeStrength ?? 1.0)
            : DEFAULT_COSMIC_SLIDE_PARAMS.shakeStrength),
        zoomPunchAmount:
          vals.zoomPunchAmount ??
          (c2IsFocusPulse || c2ShakeMod
            ? (c2ShakeMod?.values.zoomPunchAmount ?? c2Assign?.values.zoomPunchAmount ?? 1.28)
            : DEFAULT_COSMIC_SLIDE_PARAMS.zoomPunchAmount),
        focusPulseEnabled,
        glowIntensity:
          hasGlowModRegistered && !glowMod
            ? 0
            : (glowMod?.values.glowIntensity ?? vals.glowIntensity ?? DEFAULT_COSMIC_SLIDE_PARAMS.glowIntensity),
        shadowStrength:
          hasGlowModRegistered && !glowMod
            ? 0
            : (glowMod?.values.shadowStrength ?? vals.shadowStrength ?? DEFAULT_COSMIC_SLIDE_PARAMS.shadowStrength),
        edgeFeatherAmount:
          hasGlowModRegistered && !glowMod
            ? 0
            : ((glowMod?.values.featherPercent ?? vals.edgeFeatherAmount ?? 6) / 100),
        ghostFramesEnabled: togs.ghostFramesEnabled ?? DEFAULT_COSMIC_SLIDE_PARAMS.ghostFramesEnabled,
        fadeInDurationSec: vals.fadeInDurationSec ?? DEFAULT_COSMIC_SLIDE_PARAMS.fadeInDurationSec,
        fadeOutDurationSec: vals.fadeOutDurationSec ?? DEFAULT_COSMIC_SLIDE_PARAMS.fadeOutDurationSec,
        scanlineGlitchEnabled: togs.scanlineGlitchEnabled ?? false,
        line2Align: (sels.line2Align as CosmicSlideParams['line2Align']) ?? 'left',
      };

      const fireCosmicTitle = findCosmicFireGlowForSlot(textEffects, 'cosmicTitle');
      const fireCosmicLine1 = findCosmicFireGlowForSlot(textEffects, 'cosmicLine1');
      const fireCosmicLine2 = findCosmicFireGlowForSlot(textEffects, 'cosmicLine2');

      const cosmicText: CosmicSlideTextData = {
        titleText: textConfig.cosmicTitleText,
        line1Text: textConfig.cosmicLine1Text,
        line2Text: textConfig.cosmicLine2Text,
        creditText: textConfig.cosmicCreditText,
        creditEnabled: textConfig.cosmicCreditEnabled,
        accentColor: textConfig.cosmicAccentColor,
        line1Color: textConfig.cosmicLine1Color,
        customFontFamily: textConfig.customFontFamily,
        fontScaleMultiplier: textConfig.fontScaleMultiplier,
        cosmicFireEngine: this.cosmicFireEngine,
        fireSlots: {
          cosmicTitle: fireCosmicTitle ?? undefined,
          cosmicLine1: fireCosmicLine1 ?? undefined,
          cosmicLine2: fireCosmicLine2 ?? undefined,
        },
      };

      const srcA = clip1 ? mediaSources.get(clip1.id) : undefined;
      const srcB = clip2 ? mediaSources.get(clip2.id) : srcA;
      const canvasAspect = Math.max(0.75, w / Math.max(1, h));
      const aspectA = getSourceAspectRatio(clip1, srcA, canvasAspect);
      const aspectB = getSourceAspectRatio(clip2 ?? clip1, srcB, canvasAspect);

      const progA = clamp(timeMs / Math.max(1, totalMs * 0.45));
      const progB = clamp((timeMs - totalMs * 0.44) / Math.max(1, totalMs * 0.56));

      const ctxScene = this.sceneCtx;
      ctxScene.save();
      this.cosmicEngine.render(
        ctxScene,
        w,
        h,
        timeSec,
        cosmicParams,
        cosmicText,
        (c, pad, dw, dh) => drawSourceIntoRect(c, srcA, 'amber-sculpt', pad, pad, dw, dh, progA),
        (c, pad, dw, dh) => drawSourceIntoRect(c, srcB, 'crimson-silk', pad, pad, dw, dh, progB),
        aspectA,
        aspectB
      );

      // Render standalone overlay text ("عاشوراء 2025❤️") with or without Cosmic Fire Glow across frames 0..end
      this.renderStandaloneOverlayText(ctxScene, w, h, timeMs, totalMs, textConfig, textEffects);

      ctxScene.restore();

      // Apply any optional post-FX attached to textEffects (e.g. Rotational Zoom Blur / Chromatic Split)
      let cRotBlur = 0;
      let cRotZoom = 0;
      let cChromatic = 0;
      for (const fx of textEffects) {
        if (!fx.enabled) continue;
        const m = this.extractPostModifiers(fx, timeMs, clamp(timeMs / Math.max(1, totalMs)));
        cRotBlur = Math.max(cRotBlur, m.rotBlur);
        cRotZoom = Math.max(cRotZoom, m.rotZoom);
        cChromatic = Math.max(cChromatic, m.chromatic);
      }

      if (targetCtx) {
        if (
          (cRotBlur > 0.001 || cRotZoom > 0.001 || cChromatic > 0.1) &&
          useWebGL &&
          this.webglProcessor?.available
        ) {
          this.webglProcessor.process(this.sceneCanvas, targetCtx, {
            brightness: 1,
            bloomFlare: 0,
            radialBlurPx: 0,
            horizontalBlurPx: 0,
            whiteout: 0,
            rotationalBlur: cRotBlur,
            rotationalZoom: cRotZoom,
            chromaticPx: cChromatic,
            timeSec,
            noiseStrength: 0.012,
          });
        } else {
          targetCtx.drawImage(this.sceneCanvas, 0, 0, w, h);
        }
      }

      return computeTimelineState((timeMs / Math.max(1, totalMs)) * TOTAL_DURATION_MS);
    }

    const activeTotalMs = options.totalDurationMs ?? resolveActiveDurationMs(clips, clipAssignments);
    const canonicalTimeMs = clamp(
      (timeMs / Math.max(1, activeTotalMs)) * TOTAL_DURATION_MS,
      0,
      TOTAL_DURATION_MS
    );

    const combinedEffects = [
      ...(c1Assign?.effects ?? []),
      ...(c2Assign?.effects ?? []),
      ...textEffects,
    ];
    const motionParams = buildMotionParamsFromAssignment(c1Assign, c2Assign, combinedEffects);
    const state = computeTimelineState(canonicalTimeMs, motionParams);

    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) return state;

    const ctx = this.sceneCtx;
    ctx.save();
    ctx.fillStyle = '#050609';
    ctx.fillRect(0, 0, w, h);

    // Ambient studio backdrop
    if (state.phase >= 2 || isSingleClip) {
      const amb = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        w * 0.1,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.72
      );
      amb.addColorStop(
        0,
        state.phase === 5 ? 'rgba(65, 12, 42, 0.34)' : 'rgba(68, 42, 24, 0.24)'
      );
      amb.addColorStop(1, 'rgba(4, 5, 8, 1)');
      ctx.fillStyle = amb;
      ctx.fillRect(0, 0, w, h);
    }

    // Track dynamic post-processing modifiers from per-clip transitions + attached effects
    let postBrightness = 1.0;
    let postFlare = 0;
    let postRadialBlur = 0;
    let postHorizBlur = 0;
    let postWhiteout = 0;
    let postRotBlur = 0;
    let postRotZoom = 0;
    let postChromatic = 0;

    // Evaluate Clip 1 (full duration if single clip, or 0..2966ms when 2+ clips)
    const showClip1Now = isSingleClip ? Boolean(clip1) : state.showClip1 && Boolean(clip1);
    if (showClip1Now && clip1) {
      const c1Id = c1Assign?.transitionId ?? 'master-3d-neon-whip';
      const c1Vals = c1Assign?.values ?? {};
      const c1Fx = c1Assign?.effects ?? [];
      const clip1Prog = isSingleClip ? clamp(canonicalTimeMs / TOTAL_DURATION_MS) : state.clip1Progress;

      // Render behind-clip effects on Clip 1
      for (const fx of findEffectsByPlacement(c1Fx, 'behind-clip')) {
        this.renderAttachableEffect(ctx, fx, w, h, timeMs, clip1Prog);
      }

      this.mediaScratchCtx.clearRect(0, 0, w, h);
      drawCoverMedia(
        this.mediaScratchCtx,
        mediaSources.get(clip1.id),
        'amber-sculpt',
        w,
        h,
        clip1Prog
      );

      this.clipBufferCtx.save();
      this.clipBufferCtx.clearRect(0, 0, w, h);
      this.clipBufferCtx.fillStyle = '#07060A';
      this.clipBufferCtx.fillRect(0, 0, w, h);

      let drawScale = 1.0;
      let slidePx = 0;
      let rotZDeg = 0;
      let rotXDeg = 0;
      let rotYDeg = 0;
      let cardScale = 1.0;
      let cardTxPercent = 0;
      let cornerNorm = 0;
      let borderGlow = 0;
      let shadowOp = 0;
      let shakeX = 0;
      let shakeY = 0;

      if (c1Id === 'master-3d-neon-whip') {
        if (state.clip1FakeZoomScale < 0.996) {
          this.clipBufferCtx.save();
          this.clipBufferCtx.globalAlpha = 0.45;
          this.clipBufferCtx.translate(w * 0.5, h * 0.5);
          this.clipBufferCtx.scale(-1.08, 1.08);
          this.clipBufferCtx.drawImage(this.mediaScratchCanvas, -w * 0.5, -h * 0.5, w, h);
          this.clipBufferCtx.restore();
        }
        drawScale = state.clip1FakeZoomScale * state.clip1RealZoomScale;
        slidePx = (state.clip1SlideXPercent / 100) * w;
        cardScale = state.card1Scale;
        rotZDeg = state.card1RotateZDeg;
        rotXDeg = state.card1RotateXDeg;
        rotYDeg = state.card1RotateYDeg;
        cardTxPercent = isSingleClip ? 0 : state.card1TranslateXPercent;
        cornerNorm = state.card1CornerRadiusNorm;
        borderGlow = state.card1BorderGlow;
        shadowOp = state.card1ShadowOpacity;

        postBrightness = Math.max(postBrightness, state.beatBloomBrightness);
        postFlare = Math.max(postFlare, state.beatBloomFlare);
        postRadialBlur = Math.max(postRadialBlur, state.radialBlurPx);
        postHorizBlur = Math.max(postHorizBlur, isSingleClip ? 0 : state.horizontalMotionBlurPx);
        postWhiteout = Math.max(postWhiteout, state.whiteoutOpacity, isSingleClip ? 0 : state.whipFlashOpacity);
      } else if (c1Id === 'fake-zoom-geo-slide') {
        const fakeScale = lerp(0.84, 1.0, cubicBezier(0.19, 1, 0.22, 1, clamp(canonicalTimeMs / 280)));
        const pushMax = c1Vals.zoomPush ?? 1.18;
        const realScale = lerp(1.0, pushMax, clamp(clip1Prog * 1.4));
        if (fakeScale < 0.996) {
          this.clipBufferCtx.save();
          this.clipBufferCtx.globalAlpha = 0.45;
          this.clipBufferCtx.translate(w * 0.5, h * 0.5);
          this.clipBufferCtx.scale(-1.08, 1.08);
          this.clipBufferCtx.drawImage(this.mediaScratchCanvas, -w * 0.5, -h * 0.5, w, h);
          this.clipBufferCtx.restore();
        }
        drawScale = fakeScale * realScale;
        const maxSlide = c1Vals.slideAmount ?? 10;
        slidePx = (Math.sin(clip1Prog * Math.PI) * -maxSlide * w) / 100;
      } else if (c1Id === 'smooth-zoom-out-tilt') {
        const s0 = c1Vals.startScale ?? 0.72;
        const s1 = c1Vals.endScale ?? 0.54;
        cardScale = lerp(s0, s1, cubicBezier(0.22, 1, 0.36, 1, clip1Prog));
        cornerNorm = 1;
        borderGlow = 0.8;
        shadowOp = 0.9;
        rotZDeg = -Math.sin(clip1Prog * Math.PI) * (c1Vals.tiltSwingDeg ?? 9.5);
      } else if (c1Id === 'cinematic-shake-impact') {
        const amp = c1Vals.shakeAmp ?? 18;
        const freq = c1Vals.shakeFreq ?? 16;
        const decay = Math.exp(-clip1Prog * 3.5);
        shakeX = Math.sin((canonicalTimeMs / 1000) * freq * Math.PI) * amp * decay;
        shakeY = Math.cos((canonicalTimeMs / 1000) * freq * 1.3 * Math.PI) * amp * 0.7 * decay;
        drawScale = 1.06;
        postWhiteout = Math.max(postWhiteout, (c1Vals.flashPeak ?? 0.65) * Math.exp(-clip1Prog * 9));
      }

      // Handheld shake attachable effect on Clip 1
      for (const fx of c1Fx) {
        if (!fx.enabled || fx.effectId !== 'handheld-shake') continue;
        const amt = fx.values.amount ?? 6;
        shakeX += Math.sin(canonicalTimeMs * 0.019) * amt;
        shakeY += Math.cos(canonicalTimeMs * 0.023) * amt * 0.8;
      }

      this.clipBufferCtx.save();
      this.clipBufferCtx.translate(w * 0.5 + slidePx + shakeX, h * 0.5 + shakeY);
      this.clipBufferCtx.scale(drawScale, drawScale);
      this.clipBufferCtx.drawImage(this.mediaScratchCanvas, -w * 0.5, -h * 0.5, w, h);
      this.clipBufferCtx.restore();

      // Trailing slide echo
      if (Math.abs(slidePx) > 2) {
        this.clipBufferCtx.save();
        this.clipBufferCtx.globalAlpha = 0.24;
        this.clipBufferCtx.translate(w * 0.5 + slidePx * 1.85, h * 0.5);
        this.clipBufferCtx.scale(drawScale * 1.03, drawScale * 1.03);
        this.clipBufferCtx.drawImage(this.mediaScratchCanvas, -w * 0.5, -h * 0.5, w, h);
        this.clipBufferCtx.restore();
      }

      // Render above-clip effects on Clip 1 (Geometric Dissolve, Beat Bloom, etc.)
      for (const fx of findEffectsByPlacement(c1Fx, 'above-clip')) {
        if (fx.effectId === 'beat-bloom') {
          const peak = fx.values.brightness ?? 1.8;
          const bAttack = smoothstep(680, 816, canonicalTimeMs);
          const bDecay = 1 - smoothstep(816, 1180, canonicalTimeMs);
          const curve = canonicalTimeMs < 816 ? bAttack : bDecay;
          postBrightness = Math.max(postBrightness, 1 + curve * (peak - 1));
          postFlare = Math.max(postFlare, curve * 0.68);
        } else {
          this.renderAttachableEffect(
            this.clipBufferCtx,
            fx,
            w,
            h,
            timeMs,
            clip1Prog,
            c1Id === 'master-3d-neon-whip' ? state.geoDissolveAmount : undefined
          );
        }
      }

      // Intro text on Clip 1 when transition supports text
      const c1HasText = getTransitionDef(c1Id).hasTextLayer;
      if (c1HasText && state.introTextOpacity > 0.01) {
        this.drawIntroPhrase(this.clipBufferCtx, w, h, state, textConfig, textEffects);
      }

      this.clipBufferCtx.restore();

      // Composite Clip 1 Card onto Scene
      const perspective = 1000;
      const pitchScaleY = Math.cos((rotXDeg * Math.PI) / 180);
      const yawScaleX = Math.cos((rotYDeg * Math.PI) / 180);
      const perspComp = perspective / (perspective + Math.abs(rotYDeg) * 6);
      const tx = (cardTxPercent / 100) * w;
      const radZ = (rotZDeg * Math.PI) / 180;
      const cornerR = cornerNorm * Math.min(w, h) * 0.042;

      ctx.save();
      ctx.translate(w * 0.5 + tx, h * 0.5);
      ctx.rotate(radZ);
      ctx.scale(cardScale * yawScaleX * perspComp, cardScale * pitchScaleY * perspComp);

      if (shadowOp > 0.01) {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${0.85 * shadowOp})`;
        ctx.shadowBlur = 46;
        ctx.shadowOffsetY = 26;
        drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
      }

      if (borderGlow > 0.01) {
        ctx.save();
        ctx.shadowColor = `rgba(255, 198, 138, ${0.75 * borderGlow})`;
        ctx.shadowBlur = 32;
        drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR);
        ctx.strokeStyle = `rgba(255, 224, 184, ${0.85 * borderGlow})`;
        ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR);
      ctx.clip();
      ctx.drawImage(this.clipBufferCanvas, -w * 0.5, -h * 0.5, w, h);
      ctx.restore();

      ctx.restore();

      if (c1HasText && !isSingleClip && state.accentOpacity > 0.01 && textConfig.accentSymbol.trim()) {
        this.drawAccentSymbol(ctx, w, h, state, textConfig, tx);
      }

      // Single-clip text layer + text effects if user only uploaded 1 clip
      if (isSingleClip && c1HasText) {
        for (const fx of findEffectsByPlacement(textEffects, 'behind-text')) {
          this.renderAttachableEffect(ctx, fx, w, h, timeMs, clip1Prog);
        }
        if (canonicalTimeMs >= 1800) {
          this.drawNeonTitle(
            ctx,
            w,
            h,
            {
              ...state,
              neonTitleOpacity: smoothstep(1800, 2100, canonicalTimeMs),
              neonTitleTranslateXPercent: 0,
              neonTitleScale: 1,
              neonTitleRotateDeg: lerp(-12, 0, smoothstep(1800, 2300, canonicalTimeMs)),
              neonGlowAlpha: 1.0,
            },
            textConfig,
            textEffects
          );
        }
        for (const fx of findEffectsByPlacement(textEffects, 'above-text')) {
          const mods = this.extractPostModifiers(fx, canonicalTimeMs, clip1Prog);
          postRotBlur = Math.max(postRotBlur, mods.rotBlur);
          postRotZoom = Math.max(postRotZoom, mods.rotZoom);
          postChromatic = Math.max(postChromatic, mods.chromatic);
        }
      }
    }

    // --- Evaluate Clip 2 (+ optional Clip 3) during Phase 5 (2975ms -> 4166ms) ---
    if (!isSingleClip && state.showClip2 && clip2) {
      const c2Id = c2Assign?.transitionId ?? 'master-3d-neon-whip';
      const c2Vals = c2Assign?.values ?? {};
      const c2Fx = c2Assign?.effects ?? [];

      this.clipBufferCtx.clearRect(0, 0, w, h);
      drawCoverMedia(
        this.clipBufferCtx,
        mediaSources.get(clip2.id),
        'crimson-silk',
        w,
        h,
        state.clip2Progress
      );

      if (clip3 && canonicalTimeMs >= 3620) {
        const blend = Math.min(1, (canonicalTimeMs - 3620) / 220);
        this.clipBufferCtx.save();
        this.clipBufferCtx.globalAlpha = blend;
        drawCoverMedia(
          this.clipBufferCtx,
          mediaSources.get(clip3.id),
          'obsidian-gold',
          w,
          h,
          clamp((canonicalTimeMs - 3620) / (TOTAL_DURATION_MS - 3620))
        );
        this.clipBufferCtx.restore();
      }

      // Compute seamless transition behavior for Clip 2
      let camTiltDeg = 0;
      let c2Scale = 1.0;
      let c2TxPercent = 0;
      let c2RotZDeg = 0;
      let c2CornerNorm = 0;
      let c2BorderGlow = 0;
      let c2ShakeX = 0;
      let c2ShakeY = 0;

      if (c2Id === 'smooth-zoom-out-tilt' || c2Id === 'master-3d-neon-whip') {
        const startS = c2Vals.startScale ?? 0.72;
        const endS = c2Vals.endScale ?? 0.54;
        const zoomOutT = clamp((canonicalTimeMs - 2983) / (TOTAL_DURATION_MS - 2983));
        c2Scale =
          c2Id === 'smooth-zoom-out-tilt'
            ? lerp(startS, endS, cubicBezier(0.22, 1, 0.36, 1, zoomOutT))
            : state.card2Scale;
        c2TxPercent = state.card2TranslateXPercent;
        c2RotZDeg = state.card2RotateZDeg;
        c2CornerNorm = 1;
        c2BorderGlow = state.card2BorderGlow;

        camTiltDeg = state.scene2CameraTiltDeg;
        postHorizBlur = Math.max(postHorizBlur, state.horizontalMotionBlurPx);
        postWhiteout = Math.max(postWhiteout, state.whipFlashOpacity);
        if (c2Id === 'master-3d-neon-whip') {
          postRotBlur = Math.max(postRotBlur, state.rotationalBlurAngleRad);
          postRotZoom = Math.max(postRotZoom, state.rotationalZoomAmount);
        }
      } else if (c2Id === 'fake-zoom-geo-slide') {
        const fakeScale = lerp(0.84, 1.0, cubicBezier(0.19, 1, 0.22, 1, clamp(state.clip2Progress * 3.5)));
        c2Scale = fakeScale * lerp(1.0, c2Vals.zoomPush ?? 1.18, state.clip2Progress);
        c2TxPercent = Math.sin(state.clip2Progress * Math.PI) * -(c2Vals.slideAmount ?? 10);
      } else if (c2Id === 'cinematic-shake-impact') {
        const amp = c2Vals.shakeAmp ?? 18;
        const freq = c2Vals.shakeFreq ?? 16;
        const decay = Math.exp(-state.clip2Progress * 3.5);
        c2ShakeX = Math.sin((canonicalTimeMs / 1000) * freq * Math.PI) * amp * decay;
        c2ShakeY = Math.cos((canonicalTimeMs / 1000) * freq * 1.3 * Math.PI) * amp * 0.7 * decay;
        c2Scale = 1.06;
        postWhiteout = Math.max(
          postWhiteout,
          (c2Vals.flashPeak ?? 0.65) * Math.exp(-state.clip2Progress * 9)
        );
      }

      for (const fx of c2Fx) {
        if (!fx.enabled || fx.effectId !== 'handheld-shake') continue;
        const amt = fx.values.amount ?? 6;
        c2ShakeX += Math.sin(timeMs * 0.021) * amt;
        c2ShakeY += Math.cos(timeMs * 0.025) * amt * 0.8;
      }

      // Whole-shot camera tilt container
      ctx.save();
      ctx.translate(w * 0.5 + c2ShakeX, h * 0.5 + c2ShakeY);
      ctx.rotate((camTiltDeg * Math.PI) / 180);
      ctx.translate(-w * 0.5, -h * 0.5);

      // Behind-clip effects for Clip 2
      for (const fx of findEffectsByPlacement(c2Fx, 'behind-clip')) {
        this.renderAttachableEffect(ctx, fx, w, h, timeMs, state.clip2Progress);
      }

      const tx2 = (c2TxPercent / 100) * w;
      const radZ2 = (c2RotZDeg * Math.PI) / 180;
      const cornerR2 = c2CornerNorm * Math.min(w, h) * 0.038;

      ctx.save();
      ctx.translate(w * 0.5 + tx2, h * 0.5);
      ctx.rotate(radZ2);
      ctx.scale(c2Scale, c2Scale);

      if (c2CornerNorm > 0.05) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
        ctx.shadowBlur = 44;
        ctx.shadowOffsetY = 22;
        drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
      }

      if (c2BorderGlow > 0.01) {
        ctx.save();
        ctx.shadowColor = hexToRgba(textConfig.neonGlowColor, 0.48 * c2BorderGlow);
        ctx.shadowBlur = 26;
        drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR2);
        ctx.strokeStyle = hexToRgba(textConfig.neonGlowColor, 0.62 * c2BorderGlow);
        ctx.lineWidth = Math.max(2.5, Math.min(w, h) * 0.006);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      if (cornerR2 > 1) {
        drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR2);
        ctx.clip();
      }
      ctx.drawImage(this.clipBufferCanvas, -w * 0.5, -h * 0.5, w, h);

      // Contrast scrim for crisp typography legibility
      const scrim = ctx.createLinearGradient(0, -h * 0.18, 0, h * 0.28);
      scrim.addColorStop(0, 'rgba(5, 5, 10, 0.18)');
      scrim.addColorStop(0.5, 'rgba(5, 5, 10, 0.55)');
      scrim.addColorStop(1, 'rgba(5, 5, 10, 0.28)');
      ctx.fillStyle = scrim;
      ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
      ctx.restore();

      ctx.restore();

      // Above-clip effects on Clip 2
      for (const fx of findEffectsByPlacement(c2Fx, 'above-clip')) {
        this.renderAttachableEffect(ctx, fx, w, h, timeMs, state.clip2Progress);
      }

      // Layer 3: Behind-Text Attachable Effects (e.g., Cosmic Fire behind Text!)
      for (const fx of [...findEffectsByPlacement(textEffects, 'behind-clip'), ...findEffectsByPlacement(textEffects, 'behind-text')]) {
        if (fx.effectId === 'cosmic-fire') {
          const fireFade = smoothstep(3060, 3320, canonicalTimeMs) * (fx.values.intensity ?? 1.0);
          const speed = fx.values.speed ?? 1.0;
          drawCosmicFire(ctx, w * 0.5, h * 0.5, w * 0.92, h * 0.68, fireFade, (timeMs / 1000) * speed);
        } else {
          this.renderAttachableEffect(ctx, fx, w, h, timeMs, state.clip2Progress);
        }
      }

      // Layer 4: Scene 2 Text Layer (if transition has text layer)
      const c2HasText = getTransitionDef(c2Id).hasTextLayer;
      if (c2HasText) {
        if (state.scene2AccentOpacity > 0.01 && textConfig.accentSymbol.trim()) {
          this.drawScene2RotatedEmblem(ctx, w, h, state, textConfig);
        }
        if (state.neonTitleOpacity > 0.01 && textConfig.neonTitle.trim()) {
          this.drawNeonTitle(ctx, w, h, state, textConfig, textEffects);
        }
      }

      // Layer 5: Above-Text / Post Effects (Rotational Zoom Blur, Chromatic Split)
      for (const fx of [
        ...findEffectsByPlacement(c2Fx, 'behind-text'),
        ...findEffectsByPlacement(c2Fx, 'above-text'),
        ...findEffectsByPlacement(textEffects, 'above-clip'),
        ...findEffectsByPlacement(textEffects, 'above-text'),
      ]) {
        const mods = this.extractPostModifiers(fx, canonicalTimeMs, state.clip2Progress);
        postRotBlur = Math.max(postRotBlur, mods.rotBlur);
        postRotZoom = Math.max(postRotZoom, mods.rotZoom);
        postChromatic = Math.max(postChromatic, mods.chromatic);
        if (fx.effectId === 'cosmic-fire' && fx.placement === 'above-text') {
          const fireFade = smoothstep(3060, 3320, canonicalTimeMs) * (fx.values.intensity ?? 1.0) * 0.65;
          drawCosmicFire(ctx, w * 0.5, h * 0.5, w * 0.92, h * 0.68, fireFade, (timeMs / 1000) * (fx.values.speed ?? 1.0));
        }
      }

      ctx.restore();
    }

    // Apply any explicit Chromatic / Rotational effects attached to Clip 1
    if (showClip1Now && clip1) {
      for (const fx of [
        ...(c1Assign?.effects ?? []),
        ...(isSingleClip ? textEffects : []),
      ]) {
        if (!fx.enabled) continue;
        const mods = this.extractPostModifiers(fx, canonicalTimeMs, state.clip1Progress);
        postRotBlur = Math.max(postRotBlur, mods.rotBlur);
        postRotZoom = Math.max(postRotZoom, mods.rotZoom);
        postChromatic = Math.max(postChromatic, mods.chromatic);
      }
    }

    postChromatic = Math.max(postChromatic, state.chromaticSplitPx * 0.55);

    // Render standalone overlay text ("عاشوراء 2025❤️") across full duration when enabled or attached
    this.renderStandaloneOverlayText(
      ctx,
      w,
      h,
      timeMs,
      activeTotalMs,
      textConfig,
      textEffects
    );

    ctx.restore();

    // --- GPU WebGL Shader Post-Processing Pass ---
    const useShader = useWebGL && this.webglProcessor?.available;
    if (useShader && this.webglProcessor) {
      const ok = this.webglProcessor.process(this.sceneCanvas, targetCtx, {
        brightness: postBrightness,
        bloomFlare: postFlare,
        radialBlurPx: postRadialBlur,
        horizontalBlurPx: postHorizBlur,
        whiteout: postWhiteout,
        rotationalBlur: postRotBlur,
        rotationalZoom: postRotZoom,
        chromaticPx: postChromatic,
        timeSec: timeMs / 1000,
        noiseStrength: 0.014,
      });
      if (ok) return state;
    }

    this.applyCanvas2DFallbackPost(
      targetCtx,
      w,
      h,
      postBrightness,
      postFlare,
      postRadialBlur,
      postHorizBlur,
      postWhiteout,
      postRotZoom
    );

    return state;
  }

  private renderAttachableEffect(
    ctx: CanvasRenderingContext2D,
    fx: AttachedEffectInstance,
    w: number,
    h: number,
    timeMs: number,
    progress01: number,
    overrideAmount?: number
  ) {
    if (!fx.enabled) return;
    if (fx.effectId === 'cosmic-fire') {
      const intensity = (fx.values.intensity ?? 1.0) * 0.9;
      const speed = fx.values.speed ?? 1.0;
      drawCosmicFire(ctx, w * 0.5, h * 0.5, w * 0.9, h * 0.65, intensity, (timeMs / 1000) * speed);
    } else if (fx.effectId === 'geometric-dissolve') {
      const baseAmt = overrideAmount ?? Math.sin(progress01 * Math.PI);
      const amt = clamp(baseAmt * (fx.values.opacity ?? 1.0));
      drawGeometricDissolve(ctx, w, h, amt, progress01);
    } else if (fx.effectId === 'starfield-lens-flare') {
      drawStarfieldAndFlare(ctx, w, h, timeMs / 1000, {
        drawBackdrop: false,
        starDensity: fx.values.starDensity ?? 1.0,
        starSpeed: fx.values.starSpeed ?? 1.0,
        lensFlareEnabled: true,
        flareXFrac: 0.08 + progress01 * 0.8,
        flareYFrac: 0.2,
        flareAngleDeg: 28 + progress01 * 48,
      });
    }
  }

  private extractPostModifiers(
    fx: AttachedEffectInstance,
    timeMs: number,
    progress01: number
  ): { rotBlur: number; rotZoom: number; chromatic: number } {
    if (!fx.enabled) return { rotBlur: 0, rotZoom: 0, chromatic: 0 };

    if (fx.effectId === 'rotational-zoom-blur') {
      const s = fx.values.strength ?? 1.0;
      if (timeMs >= 3540) {
        const fT = clamp((timeMs - 3540) / (4166 - 3540));
        const b = (0.45 + 0.55 * Math.sin(fT * Math.PI)) * s;
        return { rotBlur: 0.048 * b, rotZoom: 0.055 * b, chromatic: 3.5 * b };
      }
      const pulse = Math.sin(progress01 * Math.PI) * 0.35 * s;
      return { rotBlur: 0.025 * pulse, rotZoom: 0.03 * pulse, chromatic: 2 * pulse };
    }

    if (fx.effectId === 'chromatic-aberration') {
      return { rotBlur: 0, rotZoom: 0, chromatic: fx.values.spread ?? 6 };
    }

    return { rotBlur: 0, rotZoom: 0, chromatic: 0 };
  }

  private renderStandaloneOverlayText(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    timeMs: number,
    totalDurationMs: number,
    textConfig: TextLayerConfig,
    textEffects: AttachedEffectInstance[]
  ) {
    const fireFx = findCosmicFireGlowForSlot(textEffects, 'overlayText');
    if (!textConfig.overlayTextEnabled && !fireFx) return;

    const text = (textConfig.overlayText || 'عاشوراء 2025❤️').trim();
    if (!text) return;

    // Height h ≈ 0.045H * fontScaleMultiplier (with clean mobile readability floor on landscape/portrait)
    const baseRatio = h > w ? 0.046 : 0.062;
    const hPx = Math.max(20, Math.round(h * baseRatio * (textConfig.fontScaleMultiplier || 1.0)));
    const fontFamily = getResolvedCosmicTextFont(textConfig.customFontFamily, text);

    const anchorX = w * 0.49;
    const anchorY = h * 0.48;
    const params = fireFx ?? {
      spread: 1.0,
      upwardBias: 1.0,
      turbulence: 1.0,
      riseSpeed: 1.0,
      edgeSoftness: 1.0,
      rimThickness: 1.0,
      opacity: 1.0,
      breathing: 0.08,
      introSec: 0,
      outroSec: 0,
      seed: 1337,
      preset: 'crimson' as const,
      customHex: '#D81B45',
      textColor: textConfig.overlayTextColor || '#FFFFFF',
      smokeEnabled: true,
      holesEnabled: true,
      look30fps: false,
      blendMode: 'normal' as const,
    };

    this.cosmicFireEngine.render(ctx, {
      text,
      fontSizePx: hPx,
      fontFamily,
      anchorX,
      anchorY,
      canvasWidth: w,
      canvasHeight: h,
      timeSec: timeMs / 1000,
      durationSec: totalDurationMs / 1000,
      params: { ...params, textColor: textConfig.overlayTextColor || '#FFFFFF' },
      effectEnabled: Boolean(fireFx),
    });
  }

  private drawIntroPhrase(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: TimelineState,
    textConfig: TextLayerConfig,
    textEffects: AttachedEffectInstance[] = []
  ) {
    const word1 = textConfig.introWord1.trim();
    const word2 = textConfig.introWord2.trim();
    if (!word1 && !word2) return;

    const minDim = Math.min(w, h);
    const basePx = minDim * 0.125;
    const combined = [word1, word2].filter(Boolean).join(' ');
    const rtl = isRtlText(combined);
    const fontFamily = getResolvedFontFamily(textConfig.customFontFamily, rtl);

    const fontSize = computeAutoFontSize(
      combined,
      basePx,
      w * 0.84,
      textConfig.autoScale,
      textConfig.fontScaleMultiplier,
      (sz) => {
        ctx.font = `700 ${sz}px ${fontFamily}`;
        return ctx.measureText(combined).width;
      }
    );

    ctx.save();
    ctx.globalAlpha = state.introTextOpacity;
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.direction = rtl ? 'rtl' : 'ltr';

    const yPos = h * 0.5;
    const band = ctx.createRadialGradient(w * 0.5, yPos, minDim * 0.04, w * 0.5, yPos, w * 0.48);
    band.addColorStop(0, 'rgba(0, 0, 0, 0.46)');
    band.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, yPos - fontSize * 1.5, w, fontSize * 3.0);

    const w1Width = word1 ? ctx.measureText(word1).width : 0;
    const spaceW = word1 && word2 ? ctx.measureText('  ').width : 0;
    const w2Width = word2 ? ctx.measureText(word2).width : 0;
    const totalW = w1Width + spaceW + w2Width;

    const w2Appear = state.word2Opacity;
    let w1X = w * 0.5;
    let w2X = w * 0.5;

    if (word1 && word2) {
      const targetW1X = rtl
        ? w * 0.5 + totalW * 0.5 - w1Width * 0.5
        : w * 0.5 - totalW * 0.5 + w1Width * 0.5;
      const targetW2X = rtl
        ? w * 0.5 - totalW * 0.5 + w2Width * 0.5
        : w * 0.5 + totalW * 0.5 - w2Width * 0.5;
      w1X = w * 0.5 + (targetW1X - w * 0.5) * w2Appear;
      w2X = targetW2X + (state.word2SlideXPercent / 100) * w;
    }

    const fireW1 = findCosmicFireGlowForSlot(textEffects, 'word1');
    const fireW2 = findCosmicFireGlowForSlot(textEffects, 'word2');

    if (word1 && state.word1Opacity > 0.01) {
      ctx.save();
      ctx.globalAlpha = state.introTextOpacity * state.word1Opacity;
      ctx.translate(w1X, yPos);
      ctx.rotate((state.word1RotateDeg * Math.PI) / 180);
      ctx.scale(state.word1Scale, state.word1Scale);
      if (fireW1) {
        this.cosmicFireEngine.render(ctx, {
          text: word1,
          fontSizePx: fontSize,
          fontFamily,
          anchorX: 0,
          anchorY: 0,
          canvasWidth: w,
          canvasHeight: h,
          timeSec: state.timeMs / 1000,
          durationSec: 4.166,
          params: { ...fireW1, textColor: textConfig.word1Color || '#FFFFFF' },
          effectEnabled: true,
        });
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 16;
        ctx.lineWidth = Math.max(2.5, fontSize * 0.065);
        ctx.strokeStyle = 'rgba(18, 10, 14, 0.86)';
        ctx.strokeText(word1, 0, 0);
        ctx.fillStyle = textConfig.word1Color || '#FFFFFF';
        ctx.fillText(word1, 0, 0);
      }
      ctx.restore();
    }

    if (word2 && state.word2Opacity > 0.01) {
      const w2Col = textConfig.word2Color || '#FF4D9E';
      ctx.save();
      ctx.globalAlpha = state.introTextOpacity * state.word2Opacity;
      ctx.translate(w2X, yPos);
      ctx.scale(state.word2Scale, state.word2Scale);
      if (fireW2) {
        this.cosmicFireEngine.render(ctx, {
          text: word2,
          fontSizePx: fontSize,
          fontFamily,
          anchorX: 0,
          anchorY: 0,
          canvasWidth: w,
          canvasHeight: h,
          timeSec: state.timeMs / 1000,
          durationSec: 4.166,
          params: { ...fireW2, textColor: w2Col },
          effectEnabled: true,
        });
      } else {
        ctx.shadowColor = hexToRgba(w2Col, 0.92);
        ctx.shadowBlur = 22;
        ctx.lineWidth = Math.max(2.5, fontSize * 0.065);
        ctx.strokeStyle = 'rgba(22, 6, 14, 0.92)';
        ctx.strokeText(word2, 0, 0);
        ctx.fillStyle = w2Col;
        ctx.fillText(word2, 0, 0);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  private drawAccentSymbol(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: TimelineState,
    textConfig: TextLayerConfig,
    cardTx: number
  ) {
    const sym = textConfig.accentSymbol.trim();
    if (!sym) return;

    const minDim = Math.min(w, h);
    const rtl = isRtlText(sym);
    const fontFamily = getResolvedFontFamily(textConfig.customFontFamily, rtl);
    const fontSize = computeAutoFontSize(
      sym,
      minDim * 0.145,
      w * 0.28,
      textConfig.autoScale,
      textConfig.fontScaleMultiplier,
      (sz) => {
        ctx.font = `700 ${sz}px ${fontFamily}`;
        return ctx.measureText(sym).width;
      }
    );

    const anchorX =
      w * 0.5 +
      cardTx +
      w * (state.card1Scale * 0.5) +
      minDim * 0.04 +
      state.accentSlideOffsetX;
    const anchorY = h * 0.49;

    const col = textConfig.accentColor || '#FFFFFF';

    ctx.save();
    ctx.globalAlpha = state.accentOpacity;
    ctx.translate(Math.min(w * 0.9, anchorX), anchorY);
    ctx.scale(state.accentScale, state.accentScale);
    ctx.rotate(-0.08);
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr';

    ctx.shadowColor = hexToRgba(col, 0.85);
    ctx.shadowBlur = 22;
    ctx.lineWidth = Math.max(3, fontSize * 0.07);
    ctx.strokeStyle = 'rgba(15, 10, 12, 0.85)';
    ctx.strokeText(sym, 0, 0);

    ctx.fillStyle = col;
    ctx.fillText(sym, 0, 0);
    ctx.restore();
  }

  private drawScene2RotatedEmblem(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: TimelineState,
    textConfig: TextLayerConfig
  ) {
    const sym = textConfig.accentSymbol.trim();
    if (!sym) return;

    const minDim = Math.min(w, h);
    const rtl = isRtlText(sym);
    const fontFamily = getResolvedFontFamily(textConfig.customFontFamily, rtl);
    const fontSize = computeAutoFontSize(
      sym,
      minDim * 0.17,
      w * 0.45,
      textConfig.autoScale,
      textConfig.fontScaleMultiplier,
      (sz) => {
        ctx.font = `700 ${sz}px ${fontFamily}`;
        return ctx.measureText(sym).width;
      }
    );

    const col = textConfig.accentColor || '#FFFFFF';

    ctx.save();
    ctx.globalAlpha = state.scene2AccentOpacity;
    ctx.translate(w * 0.5, h * 0.36);
    ctx.rotate((state.scene2AccentRotateDeg * Math.PI) / 180);
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.shadowColor = hexToRgba(textConfig.neonGlowColor || '#FF1493', 0.9);
    ctx.shadowBlur = 20;
    ctx.fillStyle = col;
    ctx.fillText(sym, 0, 0);
    ctx.restore();
  }

  private drawNeonTitle(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: TimelineState,
    textConfig: TextLayerConfig,
    textEffects: AttachedEffectInstance[] = []
  ) {
    const title = textConfig.neonTitle.trim();
    if (!title) return;

    const minDim = Math.min(w, h);
    const rtl = isRtlText(title);
    const fontFamily = getResolvedFontFamily(textConfig.customFontFamily, rtl);

    const fontSize = computeAutoFontSize(
      title,
      minDim * 0.155,
      w * 0.86,
      textConfig.autoScale,
      textConfig.fontScaleMultiplier,
      (sz) => {
        ctx.font = `700 ${sz}px ${fontFamily}`;
        return ctx.measureText(title).width;
      }
    );

    const tx = (state.neonTitleTranslateXPercent / 100) * w;
    const glow = state.neonGlowAlpha;
    const titleRotRad = (state.neonTitleRotateDeg * Math.PI) / 180;
    const coreColor = textConfig.neonCoreColor || '#FFFFFF';
    const glowColor = textConfig.neonGlowColor || '#FF1493';

    ctx.save();
    ctx.globalAlpha = state.neonTitleOpacity;
    ctx.translate(w * 0.5 + tx, h * 0.5);
    ctx.rotate(titleRotRad);
    ctx.scale(state.neonTitleScale, state.neonTitleScale);

    const fireNeon = findCosmicFireGlowForSlot(textEffects, 'neonTitle');
    if (fireNeon) {
      this.cosmicFireEngine.render(ctx, {
        text: title,
        fontSizePx: fontSize,
        fontFamily,
        anchorX: 0,
        anchorY: 0,
        canvasWidth: w,
        canvasHeight: h,
        timeSec: state.timeMs / 1000,
        durationSec: 4.166,
        params: { ...fireNeon, textColor: coreColor },
        effectEnabled: true,
      });
      ctx.restore();
      return;
    }

    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr';

    // Layer 1: Wide outer neon bloom
    ctx.save();
    ctx.shadowColor = hexToRgba(glowColor, Math.min(1, 0.94 * glow));
    ctx.shadowBlur = Math.max(14, 28 * glow);
    ctx.fillStyle = hexToRgba(glowColor, 0.42);
    ctx.fillText(title, 0, 0);
    ctx.restore();

    // Layer 2: Tight inner neon aura
    ctx.save();
    ctx.shadowColor = hexToRgba(glowColor, Math.min(1, 0.98 * glow));
    ctx.shadowBlur = Math.max(6, 12 * glow);
    ctx.lineWidth = Math.max(2, fontSize * 0.048);
    ctx.strokeStyle = hexToRgba(glowColor, Math.min(1, 0.88 * glow));
    ctx.strokeText(title, 0, 0);
    ctx.restore();

    // Layer 3: Razor-sharp customizable Core Color
    ctx.save();
    ctx.shadowColor = hexToRgba(glowColor, 0.75);
    ctx.shadowBlur = 4;
    ctx.fillStyle = coreColor;
    ctx.fillText(title, 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private applyCanvas2DFallbackPost(
    targetCtx: CanvasRenderingContext2D,
    w: number,
    h: number,
    brightness: number,
    bloomFlare: number,
    radialBlurPx: number,
    horizontalBlurPx: number,
    whiteout: number,
    rotationalZoom: number
  ) {
    targetCtx.save();
    const approxBlur = Math.max(
      radialBlurPx * 0.45,
      horizontalBlurPx * 0.35,
      rotationalZoom * 140
    );
    const filterParts: string[] = [];
    if (Math.abs(brightness - 1) > 0.02) {
      filterParts.push(`brightness(${Math.round(brightness * 100)}%)`);
    }
    if (approxBlur > 0.3) {
      filterParts.push(`blur(${approxBlur.toFixed(1)}px)`);
    }
    targetCtx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';
    targetCtx.drawImage(this.sceneCanvas, 0, 0, w, h);
    targetCtx.filter = 'none';

    if (bloomFlare > 0.01) {
      targetCtx.globalCompositeOperation = 'screen';
      const g = targetCtx.createRadialGradient(
        w * 0.5,
        h * 0.45,
        w * 0.05,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.65
      );
      g.addColorStop(0, `rgba(255, 224, 173, ${Math.min(0.85, bloomFlare * 0.6)})`);
      g.addColorStop(1, 'rgba(255, 200, 120, 0)');
      targetCtx.fillStyle = g;
      targetCtx.fillRect(0, 0, w, h);
    }

    if (whiteout > 0.01) {
      targetCtx.globalCompositeOperation = 'screen';
      targetCtx.fillStyle = `rgba(255, 250, 238, ${Math.min(1, whiteout)})`;
      targetCtx.fillRect(0, 0, w, h);
    }
    targetCtx.restore();
  }

  public dispose(): void {
    this.webglProcessor?.dispose();
  }
}
