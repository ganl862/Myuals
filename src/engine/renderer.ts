import { drawCosmicFire, drawGeometricDissolve } from './cosmicFire';
import {
  computeTimelineState,
  MotionParams,
  TimelineState,
} from './motionMath';
import {
  CanvasDimensions,
  mapProgressToClipTimeSec,
  MediaClipItem,
} from './mediaTimeline';
import {
  computeAutoFontSize,
  getResolvedFontFamily,
  isRtlText,
  TextLayerConfig,
} from './typography';
import { WebGLPostProcessor } from './webglEffects';

export type LoadedMediaSource =
  | { kind: 'image'; element: HTMLImageElement }
  | { kind: 'video'; element: HTMLVideoElement }
  | { kind: 'procedural'; variant: 'amber-sculpt' | 'crimson-silk' | 'obsidian-gold' };

export interface RenderFrameOptions {
  timeMs: number;
  dimensions: CanvasDimensions;
  clips: MediaClipItem[];
  mediaSources: Map<string, LoadedMediaSource>;
  textConfig: TextLayerConfig;
  motionParams: MotionParams;
  useWebGL: boolean;
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

  if (variant === 'amber-sculpt') {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#3D2618');
    bg.addColorStop(0.45, '#734B2D');
    bg.addColorStop(1, '#1A0F0A');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const shiftX = Math.sin(t * 0.5) * w * 0.03;
    const shiftY = Math.cos(t * 0.5) * h * 0.02;

    const rim = ctx.createRadialGradient(
      cx + shiftX,
      cy - h * 0.08 + shiftY,
      w * 0.04,
      cx,
      cy,
      w * 0.65
    );
    rim.addColorStop(0, 'rgba(255, 224, 158, 0.92)');
    rim.addColorStop(0.35, 'rgba(220, 148, 84, 0.62)');
    rim.addColorStop(0.75, 'rgba(110, 48, 34, 0.35)');
    rim.addColorStop(1, 'rgba(14, 8, 6, 0.0)');
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.beginPath();
      const yBase = h * (0.26 + i * 0.15);
      ctx.moveTo(0, yBase);
      ctx.bezierCurveTo(
        w * 0.34,
        yBase - h * 0.13 + Math.sin(t + i * 1.1) * 24,
        w * 0.68,
        yBase + h * 0.13 + Math.cos(t + i * 1.1) * 24,
        w,
        yBase - h * 0.03
      );
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const foldGrad = ctx.createLinearGradient(0, yBase - 90, w, yBase + 170);
      foldGrad.addColorStop(0, `rgba(${198 - i * 26}, ${126 - i * 20}, ${68 - i * 12}, 0.44)`);
      foldGrad.addColorStop(1, 'rgba(18, 10, 7, 0.90)');
      ctx.fillStyle = foldGrad;
      ctx.fill();
      ctx.restore();
    }

    const vig = ctx.createRadialGradient(cx, cy, w * 0.22, cx, cy, Math.max(w, h) * 0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(8,5,4,0.68)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  } else if (variant === 'crimson-silk') {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#140912');
    bg.addColorStop(0.5, '#3A1127');
    bg.addColorStop(1, '#09070C');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const pulse = 0.5 + 0.5 * Math.sin(t);
    const glow = ctx.createRadialGradient(
      cx + Math.cos(t * 0.6) * w * 0.05,
      cy - h * 0.06,
      w * 0.04,
      cx,
      cy,
      w * 0.68
    );
    glow.addColorStop(0, `rgba(255, 118, 178, ${0.42 + pulse * 0.16})`);
    glow.addColorStop(0.45, 'rgba(156, 36, 94, 0.38)');
    glow.addColorStop(1, 'rgba(10, 5, 12, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.beginPath();
      const yBase = h * (0.28 + i * 0.14);
      ctx.moveTo(0, yBase);
      ctx.bezierCurveTo(
        w * 0.32,
        yBase - h * 0.14 + Math.sin(t + i) * 26,
        w * 0.68,
        yBase + h * 0.14 + Math.cos(t + i) * 26,
        w,
        yBase - h * 0.04
      );
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const silk = ctx.createLinearGradient(0, yBase - 80, w, yBase + 160);
      silk.addColorStop(0, `rgba(${160 - i * 24}, ${36 + i * 6}, ${88 - i * 8}, 0.45)`);
      silk.addColorStop(1, 'rgba(12, 6, 14, 0.88)');
      ctx.fillStyle = silk;
      ctx.fill();
      ctx.restore();
    }
  } else {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0C1220');
    bg.addColorStop(0.5, '#1E283D');
    bg.addColorStop(1, '#080A10');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
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

export class TransitionCanvasRenderer {
  private sceneCanvas: HTMLCanvasElement;
  private sceneCtx: CanvasRenderingContext2D;
  private clipBufferCanvas: HTMLCanvasElement;
  private clipBufferCtx: CanvasRenderingContext2D;
  private mediaScratchCanvas: HTMLCanvasElement;
  private mediaScratchCtx: CanvasRenderingContext2D;
  private webglProcessor: WebGLPostProcessor | null = null;

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
  }

  public isWebGLAvailable(): boolean {
    return Boolean(this.webglProcessor?.available);
  }

  public syncVideoTimes(
    clips: MediaClipItem[],
    mediaSources: Map<string, LoadedMediaSource>,
    state: TimelineState
  ): void {
    const clip1 = clips[0];
    const clip2 = clips[1] ?? clips[0];
    const clip3 = clips.length >= 3 ? clips[2] : undefined;

    if (clip1) {
      const src1 = mediaSources.get(clip1.id);
      if (src1?.kind === 'video') {
        const targetTime = mapProgressToClipTimeSec(clip1, state.clip1Progress);
        if (Math.abs(src1.element.currentTime - targetTime) > 0.04) {
          src1.element.currentTime = targetTime;
        }
      }
    }
    if (clip2 && clip2.id !== clip1?.id) {
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
        const p3 = Math.max(0, Math.min(1, (state.timeMs - 3620) / (4166 - 3620)));
        const targetTime = mapProgressToClipTimeSec(clip3, p3);
        if (Math.abs(src3.element.currentTime - targetTime) > 0.04) {
          src3.element.currentTime = targetTime;
        }
      }
    }
  }

  public renderFrame(
    targetCanvas: HTMLCanvasElement,
    options: RenderFrameOptions
  ): TimelineState {
    const {
      timeMs,
      dimensions,
      clips,
      mediaSources,
      textConfig,
      motionParams,
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

    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) {
      return computeTimelineState(timeMs, motionParams);
    }

    const state = computeTimelineState(timeMs, motionParams);
    const ctx = this.sceneCtx;

    // Dark obsidian studio backdrop
    ctx.save();
    ctx.fillStyle = '#050609';
    ctx.fillRect(0, 0, w, h);

    if (state.phase >= 2) {
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

    const clip1 = clips[0];
    const clip2 = clips[1] ?? clips[0];
    const clip3 = clips.length >= 3 ? clips[2] : undefined;

    // --- Render Clip 1 (Phase 1 Fake Zoom-Out + Real Zoom-In + Slide & Geo Dissolve -> Phase 4 Whip) ---
    if (state.showClip1 && clip1) {
      this.mediaScratchCtx.clearRect(0, 0, w, h);
      drawCoverMedia(
        this.mediaScratchCtx,
        mediaSources.get(clip1.id),
        'amber-sculpt',
        w,
        h,
        state.clip1Progress
      );

      this.clipBufferCtx.save();
      this.clipBufferCtx.clearRect(0, 0, w, h);
      this.clipBufferCtx.fillStyle = '#07060A';
      this.clipBufferCtx.fillRect(0, 0, w, h);

      // Mirrored/soft outer tile echo for the Fake Zoom-Out optical pull-back (0..280ms)
      if (state.clip1FakeZoomScale < 0.996) {
        this.clipBufferCtx.save();
        this.clipBufferCtx.globalAlpha = 0.45;
        this.clipBufferCtx.translate(w * 0.5, h * 0.5);
        this.clipBufferCtx.scale(-1.08, 1.08);
        this.clipBufferCtx.drawImage(this.mediaScratchCanvas, -w * 0.5, -h * 0.5, w, h);
        this.clipBufferCtx.restore();
      }

      // Main Clip 1 layer combining Fake Zoom-Out + Real Zoom-In + Lateral Slide
      const combinedZoom = state.clip1FakeZoomScale * state.clip1RealZoomScale;
      const slidePx = (state.clip1SlideXPercent / 100) * w;

      this.clipBufferCtx.save();
      // Slight partial fade during geometric dissolve
      this.clipBufferCtx.globalAlpha = 1 - state.geoDissolveAmount * 0.18;
      this.clipBufferCtx.translate(w * 0.5 + slidePx, h * 0.5);
      this.clipBufferCtx.scale(combinedZoom, combinedZoom);
      this.clipBufferCtx.drawImage(this.mediaScratchCanvas, -w * 0.5, -h * 0.5, w, h);
      this.clipBufferCtx.restore();

      // Trailing ghost echo during lateral slide
      if (Math.abs(slidePx) > 2) {
        this.clipBufferCtx.save();
        this.clipBufferCtx.globalAlpha = 0.24 * state.geoDissolveAmount;
        this.clipBufferCtx.translate(w * 0.5 + slidePx * 1.9, h * 0.5);
        this.clipBufferCtx.scale(combinedZoom * 1.03, combinedZoom * 1.03);
        this.clipBufferCtx.drawImage(this.mediaScratchCanvas, -w * 0.5, -h * 0.5, w, h);
        this.clipBufferCtx.restore();
      }

      // Geometric Shapes Dissolve overlay ("تأثير أشكال هندسية")
      if (state.geoDissolveAmount > 0.01) {
        drawGeometricDissolve(
          this.clipBufferCtx,
          w,
          h,
          state.geoDissolveAmount,
          state.clip1Progress
        );
      }

      // Draw Centered Word 1 & Contrasting Word 2 inside Clip 1 before 2083ms cut
      if (state.introTextOpacity > 0.01) {
        this.drawIntroPhrase(this.clipBufferCtx, w, h, state, textConfig);
      }

      this.clipBufferCtx.restore();

      // Apply 3D Perspective Card Shrink + Spring Settle + Whip-Pan
      const perspective = 1000;
      const pitchRad = (state.card1RotateXDeg * Math.PI) / 180;
      const yawRad = (state.card1RotateYDeg * Math.PI) / 180;
      const pitchScaleY = Math.cos(pitchRad);
      const yawScaleX = Math.cos(yawRad);
      const perspectiveCompression =
        perspective / (perspective + Math.abs(state.card1RotateYDeg) * 6);

      const tx = (state.card1TranslateXPercent / 100) * w;
      const radZ = (state.card1RotateZDeg * Math.PI) / 180;
      const cornerR = state.card1CornerRadiusNorm * Math.min(w, h) * 0.042;

      ctx.save();
      ctx.translate(w * 0.5 + tx, h * 0.5);
      ctx.rotate(radZ);
      ctx.scale(
        state.card1Scale * yawScaleX * perspectiveCompression,
        state.card1Scale * pitchScaleY * perspectiveCompression
      );

      if (state.card1ShadowOpacity > 0.01) {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${0.85 * state.card1ShadowOpacity})`;
        ctx.shadowBlur = 46;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 26;
        drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
      }

      if (state.card1BorderGlow > 0.01) {
        ctx.save();
        ctx.shadowColor = `rgba(255, 198, 138, ${0.75 * state.card1BorderGlow})`;
        ctx.shadowBlur = 32;
        drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR);
        ctx.strokeStyle = `rgba(255, 224, 184, ${0.85 * state.card1BorderGlow})`;
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

      if (state.accentOpacity > 0.01 && textConfig.accentSymbol.trim()) {
        this.drawAccentSymbol(ctx, w, h, state, textConfig, tx);
      }
    }

    // --- Render Phase 5 Scene 2 (Whole-Shot Tilt + Smooth Zoom-Out + Cosmic Fire + Rotated Neon Title) ---
    if (state.showClip2 && clip2) {
      this.clipBufferCtx.clearRect(0, 0, w, h);
      drawCoverMedia(
        this.clipBufferCtx,
        mediaSources.get(clip2.id),
        'crimson-silk',
        w,
        h,
        state.clip2Progress
      );

      if (clip3 && timeMs >= 3620) {
        const blend = Math.min(1, (timeMs - 3620) / 220);
        this.clipBufferCtx.save();
        this.clipBufferCtx.globalAlpha = blend;
        drawCoverMedia(
          this.clipBufferCtx,
          mediaSources.get(clip3.id),
          'obsidian-gold',
          w,
          h,
          Math.min(1, (timeMs - 3620) / (4166 - 3620))
        );
        this.clipBufferCtx.restore();
      }

      // Whole-shot camera tilt container for Phase 5 finale ("اللقطة كلها يتخللها انميشن ميلان")
      const camTiltRad = (state.scene2CameraTiltDeg * Math.PI) / 180;
      ctx.save();
      ctx.translate(w * 0.5, h * 0.5);
      ctx.rotate(camTiltRad);
      ctx.translate(-w * 0.5, -h * 0.5);

      const tx2 = (state.card2TranslateXPercent / 100) * w;
      const radZ2 = (state.card2RotateZDeg * Math.PI) / 180;
      const cornerR2 = Math.min(w, h) * 0.038;

      ctx.save();
      ctx.translate(w * 0.5 + tx2, h * 0.5);
      ctx.rotate(radZ2);
      ctx.scale(state.card2Scale, state.card2Scale);

      // Deep shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
      ctx.shadowBlur = 44;
      ctx.shadowOffsetY = 22;
      drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      if (state.card2BorderGlow > 0.01) {
        ctx.save();
        ctx.shadowColor = `rgba(255, 20, 147, ${0.48 * state.card2BorderGlow})`;
        ctx.shadowBlur = 26;
        drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR2);
        ctx.strokeStyle = `rgba(255, 190, 224, ${0.62 * state.card2BorderGlow})`;
        ctx.lineWidth = Math.max(2.5, Math.min(w, h) * 0.006);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      drawRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, cornerR2);
      ctx.clip();
      ctx.drawImage(this.clipBufferCanvas, -w * 0.5, -h * 0.5, w, h);

      const scrim = ctx.createLinearGradient(0, -h * 0.18, 0, h * 0.28);
      scrim.addColorStop(0, 'rgba(5, 5, 10, 0.18)');
      scrim.addColorStop(0.5, 'rgba(5, 5, 10, 0.55)');
      scrim.addColorStop(1, 'rgba(5, 5, 10, 0.28)');
      ctx.fillStyle = scrim;
      ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
      ctx.restore();

      ctx.restore();

      // Cosmic Fire ("النار الكونية") behind the Scene 2 Title
      if (state.cosmicFireIntensity > 0.01) {
        drawCosmicFire(
          ctx,
          w * 0.5,
          h * 0.5,
          w * 0.92,
          h * 0.68,
          state.cosmicFireIntensity,
          timeMs / 1000
        );
      }

      // Brief kinetic rotated emblem entrance settling into center before Main Title
      if (state.scene2AccentOpacity > 0.01 && textConfig.accentSymbol.trim()) {
        this.drawScene2RotatedEmblem(ctx, w, h, state, textConfig);
      }

      // Main Arabic Neon Calligraphy Title with Tilt Rotation Entrance
      if (state.neonTitleOpacity > 0.01 && textConfig.neonTitle.trim()) {
        this.drawNeonTitle(ctx, w, h, state, textConfig);
      }

      ctx.restore();
    }

    ctx.restore();

    // --- Post-Processing Pass (WebGL Shader or Canvas2D Fallback) ---
    const combinedWhiteout = Math.max(state.whiteoutOpacity, state.whipFlashOpacity);
    const useShader = useWebGL && this.webglProcessor?.available;

    if (useShader && this.webglProcessor) {
      const ok = this.webglProcessor.process(this.sceneCanvas, targetCtx, {
        brightness: state.beatBloomBrightness,
        bloomFlare: state.beatBloomFlare,
        radialBlurPx: state.radialBlurPx,
        horizontalBlurPx: state.horizontalMotionBlurPx,
        whiteout: combinedWhiteout,
        rotationalBlur: state.rotationalBlurAngleRad,
        rotationalZoom: state.rotationalZoomAmount,
        chromaticPx: state.chromaticSplitPx,
      });
      if (ok) return state;
    }

    this.applyCanvas2DFallbackPost(
      targetCtx,
      w,
      h,
      state.beatBloomBrightness,
      state.beatBloomFlare,
      state.radialBlurPx,
      state.horizontalMotionBlurPx,
      combinedWhiteout,
      state.rotationalZoomAmount
    );

    return state;
  }

  private drawIntroPhrase(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: TimelineState,
    textConfig: TextLayerConfig
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

    // Centered vertically in the frame ("ونص في المنتصف")
    const yPos = h * 0.50;
    const band = ctx.createRadialGradient(w * 0.5, yPos, minDim * 0.04, w * 0.5, yPos, w * 0.48);
    band.addColorStop(0, 'rgba(0, 0, 0, 0.46)');
    band.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, yPos - fontSize * 1.5, w, fontSize * 3.0);

    const w1Width = word1 ? ctx.measureText(word1).width : 0;
    const spaceW = word1 && word2 ? ctx.measureText('  ').width : 0;
    const w2Width = word2 ? ctx.measureText(word2).width : 0;
    const totalW = w1Width + spaceW + w2Width;

    // When Word 2 hasn't appeared yet, Word 1 sits dead-center; once Word 2 arrives, they balance smoothly
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

    if (word1 && state.word1Opacity > 0.01) {
      ctx.save();
      ctx.globalAlpha = state.introTextOpacity * state.word1Opacity;
      ctx.translate(w1X, yPos);
      ctx.rotate((state.word1RotateDeg * Math.PI) / 180);
      ctx.scale(state.word1Scale, state.word1Scale);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 16;
      ctx.lineWidth = Math.max(2.5, fontSize * 0.065);
      ctx.strokeStyle = 'rgba(18, 10, 14, 0.86)';
      ctx.strokeText(word1, 0, 0);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(word1, 0, 0);
      ctx.restore();
    }

    // Contrasting vibrant color for Word 2 ("ومعها نص اخر بغير لون")
    if (word2 && state.word2Opacity > 0.01) {
      ctx.save();
      ctx.globalAlpha = state.introTextOpacity * state.word2Opacity;
      ctx.translate(w2X, yPos);
      ctx.scale(state.word2Scale, state.word2Scale);
      ctx.shadowColor = 'rgba(255, 46, 136, 0.92)';
      ctx.shadowBlur = 22;
      ctx.lineWidth = Math.max(2.5, fontSize * 0.065);
      ctx.strokeStyle = 'rgba(42, 6, 24, 0.92)';
      ctx.strokeText(word2, 0, 0);
      ctx.fillStyle = '#FF4D9E';
      ctx.fillText(word2, 0, 0);
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

    ctx.save();
    ctx.globalAlpha = state.accentOpacity;
    ctx.translate(Math.min(w * 0.9, anchorX), anchorY);
    ctx.scale(state.accentScale, state.accentScale);
    ctx.rotate(-0.08);
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr';

    ctx.shadowColor = 'rgba(255, 224, 185, 0.85)';
    ctx.shadowBlur = 22;
    ctx.lineWidth = Math.max(3, fontSize * 0.07);
    ctx.strokeStyle = 'rgba(15, 10, 12, 0.85)';
    ctx.strokeText(sym, 0, 0);

    ctx.fillStyle = '#FFFFFF';
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

    ctx.save();
    ctx.globalAlpha = state.scene2AccentOpacity;
    ctx.translate(w * 0.5, h * 0.36);
    ctx.rotate((state.scene2AccentRotateDeg * Math.PI) / 180);
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.shadowColor = 'rgba(255, 130, 210, 0.9)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFE8F4';
    ctx.fillText(sym, 0, 0);
    ctx.restore();
  }

  private drawNeonTitle(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: TimelineState,
    textConfig: TextLayerConfig
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

    ctx.save();
    ctx.globalAlpha = state.neonTitleOpacity;
    ctx.translate(w * 0.5 + tx, h * 0.5);
    ctx.rotate(titleRotRad);
    ctx.scale(state.neonTitleScale, state.neonTitleScale);
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr';

    // Layer 1: Wide outer pink neon bloom (#FF007F)
    ctx.save();
    ctx.shadowColor = `rgba(255, 0, 127, ${Math.min(1, 0.94 * glow)})`;
    ctx.shadowBlur = Math.max(14, 28 * glow);
    ctx.fillStyle = 'rgba(255, 0, 127, 0.42)';
    ctx.fillText(title, 0, 0);
    ctx.restore();

    // Layer 2: Tight pink neon aura (#FF1493)
    ctx.save();
    ctx.shadowColor = `rgba(255, 20, 147, ${Math.min(1, 0.98 * glow)})`;
    ctx.shadowBlur = Math.max(6, 12 * glow);
    ctx.lineWidth = Math.max(2, fontSize * 0.048);
    ctx.strokeStyle = `rgba(255, 45, 155, ${Math.min(1, 0.88 * glow)})`;
    ctx.strokeText(title, 0, 0);
    ctx.restore();

    // Layer 3: Razor-sharp White Core
    ctx.save();
    ctx.shadowColor = 'rgba(255, 195, 235, 0.95)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#FFFFFF';
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
