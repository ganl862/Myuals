import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Film, Sliders, Type } from 'lucide-react';
import { MediaPanel } from './components/MediaPanel';
import { MotionExportPanel } from './components/MotionExportPanel';
import { TransitionViewport } from './components/TransitionViewport';
import { TypographyPanel } from './components/TypographyPanel';
import {
  exportTransitionVideo,
  ExportFormat,
  ExportProgress,
  ExportResult,
} from './engine/exporter';
import {
  AspectRatioOption,
  createDefaultDemoClips,
  createImageClip,
  createVideoClip,
  MediaClipItem,
  reorderClips,
  resolveCanvasDimensions,
  updateClipTrim,
  updateImageClipDuration,
} from './engine/mediaTimeline';
import {
  computeTimelineState,
  DEFAULT_MOTION_PARAMS,
  FPS,
  MotionParams,
  TOTAL_DURATION_MS,
  TOTAL_FRAMES,
} from './engine/motionMath';
import { LoadedMediaSource, TransitionCanvasRenderer } from './engine/renderer';
import { DEFAULT_TEXT_CONFIG, TextLayerConfig } from './engine/typography';

type ControlTab = 'media' | 'typography' | 'motion';

export default function App() {
  const [clips, setClips] = useState<MediaClipItem[]>(() => createDefaultDemoClips());
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('auto');
  const [textConfig, setTextConfig] = useState<TextLayerConfig>(DEFAULT_TEXT_CONFIG);
  const [motionParams, setMotionParams] = useState<MotionParams>(DEFAULT_MOTION_PARAMS);
  const [useWebGL, setUseWebGL] = useState<boolean>(true);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<ControlTab>('media');
  const [timeMs, setTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('autostart') === '1';
    }
    return false;
  });
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<TransitionCanvasRenderer | null>(null);
  const mediaSourcesRef = useRef<Map<string, LoadedMediaSource>>(new Map());

  // Initialize procedural demo sources in ref
  useEffect(() => {
    const map = mediaSourcesRef.current;
    for (const clip of clips) {
      if (!map.has(clip.id) && clip.kind === 'procedural') {
        map.set(clip.id, {
          kind: 'procedural',
          variant: clip.demoVariant ?? 'amber-sculpt',
        });
      }
    }
  }, [clips]);

  const dimensions = useMemo(
    () => resolveCanvasDimensions(aspectRatio, clips[0]),
    [aspectRatio, clips]
  );

  const timelineState = useMemo(
    () => computeTimelineState(timeMs, motionParams),
    [timeMs, motionParams]
  );

  // Latest state refs so rAF loop & mount-once renderer never tear down
  const renderInputsRef = useRef({
    timeMs,
    dimensions,
    clips,
    textConfig,
    motionParams,
    useWebGL,
    isPlaying,
    isLooping,
  });

  renderInputsRef.current = {
    timeMs,
    dimensions,
    clips,
    textConfig,
    motionParams,
    useWebGL,
    isPlaying,
    isLooping,
  };

  const drawNow = useCallback((targetMs: number) => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;
    const inputs = renderInputsRef.current;
    const st = computeTimelineState(targetMs, inputs.motionParams);
    renderer.syncVideoTimes(inputs.clips, mediaSourcesRef.current, st);
    renderer.renderFrame(canvas, {
      timeMs: targetMs,
      dimensions: inputs.dimensions,
      clips: inputs.clips,
      mediaSources: mediaSourcesRef.current,
      textConfig: inputs.textConfig,
      motionParams: inputs.motionParams,
      useWebGL: inputs.useWebGL,
    });
  }, []);

  // Mount WebGL + Canvas2D renderer once
  useEffect(() => {
    const dims = renderInputsRef.current.dimensions;
    const renderer = new TransitionCanvasRenderer(dims.width, dims.height);
    rendererRef.current = renderer;
    setWebglSupported(renderer.isWebGLAvailable());
    drawNow(renderInputsRef.current.timeMs);

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [drawNow]);

  // Re-render whenever non-playback inputs change while paused
  useEffect(() => {
    if (!isPlaying) {
      drawNow(timeMs);
    }
  }, [isPlaying, timeMs, dimensions, clips, textConfig, motionParams, useWebGL, drawNow]);

  // Smooth 60fps playback loop
  useEffect(() => {
    if (!isPlaying) return;

    let rafId = 0;
    let lastStamp = performance.now();
    let currentMs = renderInputsRef.current.timeMs;
    if (currentMs >= TOTAL_DURATION_MS) {
      currentMs = 0;
      setTimeMs(0);
    }
    let lastHudSync = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(100, Math.max(0, now - lastStamp));
      lastStamp = now;

      currentMs += dt;
      if (currentMs >= TOTAL_DURATION_MS) {
        if (renderInputsRef.current.isLooping) {
          currentMs = currentMs % TOTAL_DURATION_MS;
        } else {
          currentMs = TOTAL_DURATION_MS;
          drawNow(currentMs);
          setTimeMs(currentMs);
          setIsPlaying(false);
          return;
        }
      }

      drawNow(currentMs);

      if (now - lastHudSync >= 33) {
        lastHudSync = now;
        setTimeMs(currentMs);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, drawNow]);

  const handleSeekMs = useCallback(
    (nextMs: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_DURATION_MS, nextMs));
      setIsPlaying(false);
      setTimeMs(clamped);
      drawNow(clamped);
    },
    [drawNow]
  );

  const handleStepFrame = useCallback(
    (delta: number) => {
      setIsPlaying(false);
      const stepMs = TOTAL_DURATION_MS / (TOTAL_FRAMES - 1);
      const next = Math.max(0, Math.min(TOTAL_DURATION_MS, timeMs + delta * stepMs));
      setTimeMs(next);
      drawNow(next);
    },
    [timeMs, drawNow]
  );

  const loadSingleLocalFile = useCallback(
    async (file: File): Promise<MediaClipItem | null> => {
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const url = URL.createObjectURL(file);

      if (file.type.startsWith('image/')) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            mediaSourcesRef.current.set(id, { kind: 'image', element: img });
            resolve(
              createImageClip(
                id,
                file.name.replace(/\.[^.]+$/, ''),
                url,
                img.naturalWidth || 720,
                img.naturalHeight || 1280
              )
            );
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.src = url;
        });
      }

      if (file.type.startsWith('video/')) {
        return new Promise((resolve) => {
          const video = document.createElement('video');
          video.muted = true; // Zero audio processing pipeline
          video.playsInline = true;
          video.preload = 'auto';
          video.onloadedmetadata = () => {
            mediaSourcesRef.current.set(id, { kind: 'video', element: video });
            resolve(
              createVideoClip(
                id,
                file.name.replace(/\.[^.]+$/, ''),
                url,
                video.videoWidth || 720,
                video.videoHeight || 1280,
                video.duration || 3.0
              )
            );
          };
          video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          video.src = url;
        });
      }

      URL.revokeObjectURL(url);
      return null;
    },
    []
  );

  const handleUploadFiles = useCallback(
    async (fileList: FileList, replaceIndex?: number) => {
      const files = Array.from(fileList).slice(0, 3);
      const loaded = (await Promise.all(files.map(loadSingleLocalFile))).filter(
        (c): c is MediaClipItem => c !== null
      );
      if (loaded.length === 0) return;

      setClips((prev) => {
        if (typeof replaceIndex === 'number' && prev[replaceIndex]) {
          const next = [...prev];
          const old = next[replaceIndex];
          if (old.srcUrl) URL.revokeObjectURL(old.srcUrl);
          mediaSourcesRef.current.delete(old.id);
          next[replaceIndex] = loaded[0];
          return next;
        }

        // Bulk upload: if user uploads 2 or 3 files, replace slots or append up to 3
        if (loaded.length >= 2) {
          for (const old of prev) {
            if (old.srcUrl) URL.revokeObjectURL(old.srcUrl);
            mediaSourcesRef.current.delete(old.id);
          }
          return loaded.slice(0, 3);
        }

        // Single file added
        if (prev.length < 3) {
          return [...prev, loaded[0]];
        }
        const next = [...prev];
        if (next[0].srcUrl) URL.revokeObjectURL(next[0].srcUrl);
        mediaSourcesRef.current.delete(next[0].id);
        next[0] = loaded[0];
        return next;
      });
    },
    [loadSingleLocalFile]
  );

  const handleUploadFont = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const familyName = `CustomStudioFont_${Date.now()}`;
      const face = new FontFace(familyName, buffer);
      await face.load();
      document.fonts.add(face);
      setTextConfig((prev) => ({
        ...prev,
        customFontFamily: familyName,
        customFontName: file.name,
      }));
    } catch {
      // Ignore invalid font files silently
    }
  }, []);

  const handleStartExport = useCallback(async () => {
    if (isExporting) return;
    setIsPlaying(false);
    setExportError(null);
    setExportResult(null);
    setIsExporting(true);

    const controller = new AbortController();
    exportAbortRef.current = controller;

    try {
      const result = await exportTransitionVideo({
        format: exportFormat,
        dimensions,
        clips,
        mediaSources: mediaSourcesRef.current,
        textConfig,
        motionParams,
        useWebGL,
        onProgress: (p) => setExportProgress(p),
        abortSignal: controller.signal,
      });
      setExportResult(result);
    } catch (err) {
      if ((err as Error)?.message !== 'Export cancelled') {
        setExportError(
          err instanceof Error ? err.message : 'Local export failed on this browser.'
        );
      }
    } finally {
      setIsExporting(false);
      exportAbortRef.current = null;
    }
  }, [isExporting, exportFormat, dimensions, clips, textConfig, motionParams, useWebGL]);

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F4F5F7] flex flex-col">
      {/* Compact Sticky Top Bar (<= 56px, well under 15% mobile cap) */}
      <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 bg-[#0B0D12]/90 backdrop-blur-md border-b border-white/8 flex items-center justify-between gap-4">
        <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          KinetiCard Studio
        </span>

        <button
          type="button"
          onClick={() => {
            setActiveTab('motion');
            if (!isExporting) {
              void handleStartExport();
            }
          }}
          className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#FF1493] hover:bg-[#E60E83] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-white"
        >
          <Download className="w-4 h-4" />
          <span>Export {FPS}fps</span>
        </button>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-4">
        {/* Distinct Modular Transition Preset Card */}
        <article
          aria-label="Transition Preset Overview"
          className="rounded-2xl bg-[#13161F] border border-white/8 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col gap-1.5"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
            <span className="text-[#FF7EC3] font-medium">Transition Preset Module</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">4,166ms</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">250 frames @ 60fps</span>
            <span aria-hidden="true">·</span>
            <span>Offline WebGL &amp; WebCodecs</span>
          </div>
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-white text-balance">
            Master 3D Floating Card &amp; Neon Whip Cinematic Transition Flow
          </h1>
          <p className="text-xs text-[#9CA3AF] leading-relaxed max-w-4xl">
            One-shot modular preset combining an intro beat-flash, full-to-card 3D perspective
            shrink with bloom blast, a lateral whip-pan dash with motion blur, and a settling card
            with animated Arabic neon calligraphy.
          </p>
        </article>

        {/* Responsive Studio Grid: Vertical on Mobile, 2-Column on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Preview & Scrubber */}
          <div className="lg:col-span-6 w-full">
            <TransitionViewport
              canvasRef={canvasRef}
              dimensions={dimensions}
              timelineState={timelineState}
              isPlaying={isPlaying}
              isLooping={isLooping}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onToggleLoop={() => setIsLooping((l) => !l)}
              onReset={() => handleSeekMs(0)}
              onSeekMs={handleSeekMs}
              onStepFrame={handleStepFrame}
            />
          </div>

          {/* Alight-Motion-Style Single-Touch Control Deck */}
          <section
            aria-label="Transition Controls"
            className="lg:col-span-6 w-full rounded-2xl bg-[#13161F] border border-white/8 p-4 sm:p-5 flex flex-col gap-5"
          >
            {/* Segmented Tab Bar */}
            <div
              role="tablist"
              aria-label="Editor sections"
              className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0B0D12] border border-white/8"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'media'}
                onClick={() => setActiveTab('media')}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493] ${
                  activeTab === 'media'
                    ? 'bg-[#1C202C] text-white border border-white/12'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Film className="w-4 h-4 text-[#FF1493]" />
                <span>Media</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'typography'}
                onClick={() => setActiveTab('typography')}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493] ${
                  activeTab === 'typography'
                    ? 'bg-[#1C202C] text-white border border-white/12'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Type className="w-4 h-4 text-[#FF1493]" />
                <span>Typography</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'motion'}
                onClick={() => setActiveTab('motion')}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493] ${
                  activeTab === 'motion'
                    ? 'bg-[#1C202C] text-white border border-white/12'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4 text-[#FF1493]" />
                <span>FX &amp; Export</span>
              </button>
            </div>

            {activeTab === 'media' && (
              <MediaPanel
                clips={clips}
                aspectRatio={aspectRatio}
                onChangeAspectRatio={setAspectRatio}
                onUploadFiles={handleUploadFiles}
                onReorderClip={(from, to) =>
                  setClips((prev) => reorderClips(prev, from, to))
                }
                onUpdateImageDuration={(id, dur) =>
                  setClips((prev) =>
                    prev.map((c) => (c.id === id ? updateImageClipDuration(c, dur) : c))
                  )
                }
                onUpdateTrim={(id, s, e) =>
                  setClips((prev) =>
                    prev.map((c) => (c.id === id ? updateClipTrim(c, s, e) : c))
                  )
                }
                onRemoveClip={(id) =>
                  setClips((prev) => {
                    if (prev.length <= 2) return prev;
                    const target = prev.find((c) => c.id === id);
                    if (target?.srcUrl) URL.revokeObjectURL(target.srcUrl);
                    mediaSourcesRef.current.delete(id);
                    return prev.filter((c) => c.id !== id);
                  })
                }
              />
            )}

            {activeTab === 'typography' && (
              <TypographyPanel
                config={textConfig}
                onChange={setTextConfig}
                onUploadFont={handleUploadFont}
                onClearFont={() =>
                  setTextConfig((prev) => ({
                    ...prev,
                    customFontFamily: null,
                    customFontName: null,
                  }))
                }
              />
            )}

            {activeTab === 'motion' && (
              <MotionExportPanel
                motionParams={motionParams}
                useWebGL={useWebGL}
                webglSupported={webglSupported}
                onChangeMotionParams={setMotionParams}
                onToggleWebGL={setUseWebGL}
                exportFormat={exportFormat}
                onChangeExportFormat={setExportFormat}
                isExporting={isExporting}
                exportProgress={exportProgress}
                exportResult={exportResult}
                exportError={exportError}
                onStartExport={handleStartExport}
                onCancelExport={() => exportAbortRef.current?.abort()}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
