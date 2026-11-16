import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CleanInspector, InspectorTab } from './components/CleanInspector';
import { ActiveContextKey, ContextSwitcher } from './components/ContextSwitcher';
import { ExportModal } from './components/ExportModal';
import { StudioMonitor } from './components/StudioMonitor';
import { TopBar } from './components/TopBar';
import {
  ComposableCanvasRenderer,
  isCosmicSlideActive,
  LoadedMediaSource,
  resolveActiveDurationMs,
} from './engine/composableRenderer';
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
import { computeTimelineState } from './engine/motionMath';
import {
  AttachedEffectInstance,
  ClipTransitionAssignment,
  createClipAssignment,
  createDefaultSelects,
  createDefaultTextEffects,
  createDefaultToggles,
  createDefaultValues,
  createEffectInstance,
  EffectModifierId,
  getTransitionDef,
  TextTargetSlot,
  TransitionModuleId,
} from './engine/registry';
import { DEFAULT_TEXT_CONFIG, TextLayerConfig } from './engine/typography';

function buildInitialAssignments(clips: MediaClipItem[]): Record<string, ClipTransitionAssignment> {
  const out: Record<string, ClipTransitionAssignment> = {};
  clips.forEach((clip, idx) => {
    const defId: TransitionModuleId =
      idx === 0
        ? 'master-3d-neon-whip'
        : idx === 1
          ? 'smooth-zoom-out-tilt'
          : 'fake-zoom-geo-slide';
    out[clip.id] = createClipAssignment(defId);
  });
  return out;
}

export default function App() {
  const [clips, setClips] = useState<MediaClipItem[]>(() => createDefaultDemoClips());
  const [clipAssignments, setClipAssignments] = useState<
    Record<string, ClipTransitionAssignment>
  >(() => buildInitialAssignments(createDefaultDemoClips()));
  const [textEffects, setTextEffects] = useState<AttachedEffectInstance[]>(() =>
    createDefaultTextEffects()
  );

  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('auto');
  const [textConfig, setTextConfig] = useState<TextLayerConfig>(DEFAULT_TEXT_CONFIG);
  const [useWebGL, setUseWebGL] = useState<boolean>(true);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  const [activeContext, setActiveContext] = useState<ActiveContextKey>('clip-0');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('transition');

  const [timeMs, setTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('autostart') === '1';
    }
    return false;
  });

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ComposableCanvasRenderer | null>(null);
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

  // Ensure every clip always has an assignment entry
  useEffect(() => {
    setClipAssignments((prev) => {
      let changed = false;
      const next = { ...prev };
      clips.forEach((c, idx) => {
        if (!next[c.id]) {
          changed = true;
          next[c.id] = createClipAssignment(
            idx === 0
              ? 'master-3d-neon-whip'
              : idx === 1
                ? 'smooth-zoom-out-tilt'
                : 'fake-zoom-geo-slide'
          );
        }
      });
      return changed ? next : prev;
    });
  }, [clips]);

  const isCosmicActive = useMemo(
    () => isCosmicSlideActive(clips, clipAssignments),
    [clips, clipAssignments]
  );

  const hasClassicTextActive = useMemo(() => {
    return clips.some((clip) => {
      const id = clipAssignments[clip.id]?.transitionId ?? 'master-3d-neon-whip';
      return id !== 'cosmic_slide_3d' && getTransitionDef(id).hasTextLayer;
    });
  }, [clips, clipAssignments]);

  const hasTextLayer = useMemo(() => {
    return clips.some((clip) => {
      const assign = clipAssignments[clip.id];
      if (!assign) return true;
      return getTransitionDef(assign.transitionId).hasTextLayer;
    });
  }, [clips, clipAssignments]);

  const totalDurationMs = useMemo(
    () => resolveActiveDurationMs(clips, clipAssignments),
    [clips, clipAssignments]
  );

  // Clamp timeMs when user shortens total duration
  useEffect(() => {
    setTimeMs((prev) => (prev > totalDurationMs ? totalDurationMs : prev));
  }, [totalDurationMs]);

  // Keep activeContext and inspectorTab consistent when text layer disappears or clips shrink
  useEffect(() => {
    if (!hasTextLayer && activeContext === 'text') {
      setActiveContext('clip-0');
      setInspectorTab('transition');
    } else if (activeContext === 'clip-1' && clips.length < 2) {
      setActiveContext('clip-0');
    } else if (activeContext === 'clip-2' && clips.length < 3) {
      setActiveContext(clips.length >= 2 ? 'clip-1' : 'clip-0');
    }
  }, [hasTextLayer, activeContext, clips.length]);

  const dimensions = useMemo(() => {
    if (
      aspectRatio === 'auto' &&
      isCosmicActive &&
      clips.every((c) => c.kind === 'procedural')
    ) {
      return { width: 1280, height: 720, aspectRatio: 16 / 9 };
    }
    return resolveCanvasDimensions(aspectRatio, clips[0]);
  }, [aspectRatio, clips, isCosmicActive]);

  const renderInputsRef = useRef({
    timeMs,
    totalDurationMs,
    isCosmicActive,
    dimensions,
    clips,
    clipAssignments,
    textEffects,
    textConfig,
    useWebGL,
  });

  renderInputsRef.current = {
    timeMs,
    totalDurationMs,
    isCosmicActive,
    dimensions,
    clips,
    clipAssignments,
    textEffects,
    textConfig,
    useWebGL,
  };

  const drawNow = useCallback((targetMs: number) => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;
    const inputs = renderInputsRef.current;
    const st = computeTimelineState(targetMs);
    renderer.syncVideoTimes(
      inputs.clips,
      mediaSourcesRef.current,
      st,
      targetMs,
      inputs.totalDurationMs,
      inputs.isCosmicActive
    );
    renderer.renderFrame(canvas, {
      timeMs: targetMs,
      totalDurationMs: inputs.totalDurationMs,
      dimensions: inputs.dimensions,
      clips: inputs.clips,
      clipAssignments: inputs.clipAssignments,
      textEffects: inputs.textEffects,
      mediaSources: mediaSourcesRef.current,
      textConfig: inputs.textConfig,
      useWebGL: inputs.useWebGL,
    });
  }, []);

  // Mount GPU/Canvas2D renderer once
  useEffect(() => {
    const dims = renderInputsRef.current.dimensions;
    const renderer = new ComposableCanvasRenderer(dims.width, dims.height);
    rendererRef.current = renderer;
    setWebglSupported(renderer.isWebGLAvailable());
    drawNow(renderInputsRef.current.timeMs);

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [drawNow]);

  // Re-render whenever inputs change while paused
  useEffect(() => {
    if (!isPlaying) {
      drawNow(timeMs);
    }
  }, [
    isPlaying,
    timeMs,
    totalDurationMs,
    dimensions,
    clips,
    clipAssignments,
    textEffects,
    textConfig,
    useWebGL,
    drawNow,
  ]);

  // 60fps real-time playback loop
  useEffect(() => {
    if (!isPlaying) return;

    let rafId = 0;
    let lastStamp = performance.now();
    const startDur = Math.max(1000, renderInputsRef.current.totalDurationMs);
    let currentMs = renderInputsRef.current.timeMs;
    if (currentMs >= startDur) {
      currentMs = 0;
      setTimeMs(0);
    }
    let lastHudSync = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(100, Math.max(0, now - lastStamp));
      lastStamp = now;

      const activeDur = Math.max(1000, renderInputsRef.current.totalDurationMs);
      currentMs = (currentMs + dt) % activeDur;
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
      const maxDur = Math.max(1000, renderInputsRef.current.totalDurationMs);
      const clamped = Math.max(0, Math.min(maxDur, nextMs));
      setIsPlaying(false);
      setTimeMs(clamped);
      drawNow(clamped);
    },
    [drawNow]
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
          video.muted = true; // 100% zero audio pipeline
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
          setClipAssignments((aPrev) => {
            const aNext = { ...aPrev };
            const oldAssign = aNext[old.id];
            delete aNext[old.id];
            aNext[loaded[0].id] =
              oldAssign ??
              createClipAssignment(
                replaceIndex === 0 ? 'master-3d-neon-whip' : 'smooth-zoom-out-tilt'
              );
            return aNext;
          });
          return next;
        }

        // Bulk upload of 2 or 3 files replaces the sequence cleanly
        if (loaded.length >= 2) {
          for (const old of prev) {
            if (old.srcUrl) URL.revokeObjectURL(old.srcUrl);
            mediaSourcesRef.current.delete(old.id);
          }
          const nextClips = loaded.slice(0, 3);
          setClipAssignments(buildInitialAssignments(nextClips));
          setActiveContext('clip-0');
          return nextClips;
        }

        // Single file upload: if currently on procedural demo clips, enter single-clip mode cleanly;
        // otherwise append up to 3 clips or replace clip-0.
        const onlyDemo = prev.every((c) => c.kind === 'procedural');
        if (onlyDemo) {
          for (const old of prev) {
            mediaSourcesRef.current.delete(old.id);
          }
          const single = [loaded[0]];
          setClipAssignments(buildInitialAssignments(single));
          setActiveContext('clip-0');
          return single;
        }

        if (prev.length < 3) {
          const appended = [...prev, loaded[0]];
          setClipAssignments((aPrev) => ({
            ...aPrev,
            [loaded[0].id]: createClipAssignment(
              appended.length === 2 ? 'smooth-zoom-out-tilt' : 'fake-zoom-geo-slide'
            ),
          }));
          setActiveContext(appended.length === 2 ? 'clip-1' : 'clip-2');
          return appended;
        }

        const next = [...prev];
        if (next[0].srcUrl) URL.revokeObjectURL(next[0].srcUrl);
        mediaSourcesRef.current.delete(next[0].id);
        const oldId = next[0].id;
        next[0] = loaded[0];
        setClipAssignments((aPrev) => {
          const aNext = { ...aPrev };
          const preserved = aNext[oldId];
          delete aNext[oldId];
          aNext[loaded[0].id] = preserved ?? createClipAssignment('master-3d-neon-whip');
          return aNext;
        });
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
        clipAssignments,
        textEffects,
        mediaSources: mediaSourcesRef.current,
        textConfig,
        useWebGL,
        onProgress: (p) => setExportProgress(p),
        abortSignal: controller.signal,
      });
      setExportResult(result);
    } catch (err) {
      if ((err as Error)?.message !== 'Export cancelled') {
        setExportError(
          err instanceof Error ? err.message : 'تعذر التصدير المحلي على هذا المتصفح.'
        );
      }
    } finally {
      setIsExporting(false);
      exportAbortRef.current = null;
    }
  }, [isExporting, exportFormat, dimensions, clips, clipAssignments, textEffects, textConfig, useWebGL]);

  // Context Switcher derived targets
  const activeClipIndex =
    activeContext === 'clip-1' && clips.length >= 2
      ? 1
      : activeContext === 'clip-2' && clips.length >= 3
        ? 2
        : 0;
  const activeClip = activeContext === 'text' ? null : (clips[activeClipIndex] ?? null);
  const activeAssignment = activeClip ? (clipAssignments[activeClip.id] ?? null) : null;
  const activeEffects =
    activeContext === 'text' ? textEffects : (activeAssignment?.effects ?? []);

  const handleSelectContext = useCallback(
    (ctx: ActiveContextKey) => {
      setActiveContext(ctx);
      if (ctx === 'text') {
        setInspectorTab((prev) => (prev === 'transition' ? 'text' : prev));
      } else {
        setInspectorTab((prev) => (prev === 'text' ? 'transition' : prev));
      }
    },
    []
  );

  const handleSelectClipTransition = useCallback(
    (clipId: string, transitionId: TransitionModuleId) => {
      const def = getTransitionDef(transitionId);
      setTimeMs(0);
      setClipAssignments((prev) => {
        const next: Record<string, ClipTransitionAssignment> = {
          ...prev,
          [clipId]: {
            transitionId,
            values: createDefaultValues(def.params),
            toggles: createDefaultToggles(def.toggles),
            selects: createDefaultSelects(def.selects),
            effects: createClipAssignment(transitionId).effects,
          },
        };
        if (transitionId === 'cosmic_slide_3d' && clips[0]?.id === clipId && clips[1]) {
          const c2Prev = prev[clips[1].id];
          if (!c2Prev || c2Prev.transitionId === 'smooth-zoom-out-tilt') {
            next[clips[1].id] = createClipAssignment('focus_pulse_shake');
          }
        }
        return next;
      });
    },
    [clips]
  );

  const handleUpdateClipTransitionParam = useCallback(
    (clipId: string, key: string, value: number) => {
      setClipAssignments((prev) => {
        const existing = prev[clipId];
        if (!existing) return prev;
        return {
          ...prev,
          [clipId]: {
            ...existing,
            values: {
              ...existing.values,
              [key]: value,
            },
          },
        };
      });
    },
    []
  );

  const handleUpdateClipTransitionToggle = useCallback(
    (clipId: string, key: string, value: boolean) => {
      setClipAssignments((prev) => {
        const existing = prev[clipId];
        if (!existing) return prev;
        return {
          ...prev,
          [clipId]: {
            ...existing,
            toggles: {
              ...(existing.toggles ?? {}),
              [key]: value,
            },
          },
        };
      });
    },
    []
  );

  const handleUpdateClipTransitionSelect = useCallback(
    (clipId: string, key: string, value: string) => {
      setClipAssignments((prev) => {
        const existing = prev[clipId];
        if (!existing) return prev;
        return {
          ...prev,
          [clipId]: {
            ...existing,
            selects: {
              ...(existing.selects ?? {}),
              [key]: value,
            },
          },
        };
      });
    },
    []
  );

  const handleUpdateActiveEffects = useCallback(
    (next: AttachedEffectInstance[]) => {
      if (activeContext === 'text') {
        setTextEffects(next);
      } else if (activeClip) {
        setClipAssignments((prev) => {
          const existing = prev[activeClip.id];
          if (!existing) return prev;
          return {
            ...prev,
            [activeClip.id]: {
              ...existing,
              effects: next,
            },
          };
        });
      }
    },
    [activeContext, activeClip]
  );

  const handleAddEffect = useCallback(
    (effectId: EffectModifierId, targetSlot?: TextTargetSlot) => {
      const instance = createEffectInstance(
        effectId,
        activeContext === 'text' ? 'behind-text' : undefined,
        activeContext === 'text' ? (targetSlot ?? 'all') : undefined
      );
      if (activeContext === 'text') {
        setTextEffects((prev) => [...prev, instance]);
      } else if (activeClip) {
        setClipAssignments((prev) => {
          const existing = prev[activeClip.id];
          if (!existing) return prev;
          return {
            ...prev,
            [activeClip.id]: {
              ...existing,
              effects: [...existing.effects, instance],
            },
          };
        });
      }
    },
    [activeContext, activeClip]
  );

  return (
    <div className="min-h-screen lg:h-screen bg-[#111317] text-[#F3F4F6] flex flex-col overflow-x-hidden">
      {/* Zone 1: Fixed Top Bar (~8%, strictly 3 controls) */}
      <TopBar
        aspectRatio={aspectRatio}
        onChangeAspectRatio={setAspectRatio}
        onUploadFiles={(files) => handleUploadFiles(files)}
        onOpenExport={() => setExportModalOpen(true)}
      />

      {/* 4-Zone Architecture Workspace:
          Mobile: Vertical stack (Monitor + Context + Inspector)
          Desktop (lg): 2 Columns (Left 55% Studio Monitor, Right 45% Context Switcher + Inspector) */}
      <main
        dir="ltr"
        className="flex-1 min-h-0 p-3 lg:p-4 flex flex-col lg:grid lg:grid-cols-[55fr_45fr] gap-3 lg:gap-4"
      >
        {/* Zone 2: Studio Monitor (Left 55% on desktop, generously sized on mobile for sharp clarity) */}
        <div className="shrink-0 h-[43vh] min-h-[265px] max-h-[420px] lg:h-full lg:max-h-none lg:min-h-0">
          <StudioMonitor
            canvasRef={canvasRef}
            dimensions={dimensions}
            timeMs={timeMs}
            totalDurationMs={totalDurationMs}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onReset={() => handleSeekMs(0)}
            onSeekMs={handleSeekMs}
          />
        </div>

        {/* Right 45% Column (Desktop) / Bottom Column (Mobile): Zone 3 + Zone 4 */}
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Zone 3: Context Switcher */}
          <ContextSwitcher
            clips={clips}
            activeContext={activeContext}
            hasTextLayer={hasTextLayer}
            onSelectContext={handleSelectContext}
            onSwapClips={() => setClips((prev) => reorderClips(prev, 0, 1))}
          />

          {/* Zone 4: Clean Inspector */}
          <div className="flex-1 min-h-[340px] lg:min-h-0 flex flex-col">
            <CleanInspector
              activeContext={activeContext}
              activeTab={inspectorTab}
              onChangeTab={setInspectorTab}
              hasTextLayer={hasTextLayer}
              isCosmicActive={isCosmicActive}
              hasClassicTextActive={hasClassicTextActive}
              clips={clips}
              activeClip={activeClip}
              activeClipIndex={activeClipIndex}
              activeAssignment={activeAssignment}
              activeEffects={activeEffects}
              textConfig={textConfig}
              onSelectClipTransition={handleSelectClipTransition}
              onUpdateClipTransitionParam={handleUpdateClipTransitionParam}
              onUpdateClipTransitionToggle={handleUpdateClipTransitionToggle}
              onUpdateClipTransitionSelect={handleUpdateClipTransitionSelect}
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
              onReplaceClipFile={(idx, files) => handleUploadFiles(files, idx)}
              onRemoveClip={(id) =>
                setClips((prev) => {
                  if (prev.length <= 1) return prev;
                  const target = prev.find((c) => c.id === id);
                  if (target?.srcUrl) URL.revokeObjectURL(target.srcUrl);
                  mediaSourcesRef.current.delete(id);
                  setClipAssignments((aPrev) => {
                    const aNext = { ...aPrev };
                    delete aNext[id];
                    return aNext;
                  });
                  setActiveContext('clip-0');
                  return prev.filter((c) => c.id !== id);
                })
              }
              onUpdateActiveEffects={handleUpdateActiveEffects}
              onAddEffect={handleAddEffect}
              onChangeTextConfig={setTextConfig}
              onUploadFont={handleUploadFont}
              onClearFont={() =>
                setTextConfig((prev) => ({
                  ...prev,
                  customFontFamily: null,
                  customFontName: null,
                }))
              }
            />
          </div>
        </div>
      </main>

      {/* Export Dialog (100% offline WebCodecs MP4 / WebM) */}
      <ExportModal
        open={exportModalOpen}
        exportFormat={exportFormat}
        useWebGL={useWebGL}
        webglSupported={webglSupported}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportResult={exportResult}
        exportError={exportError}
        onChangeFormat={setExportFormat}
        onToggleWebGL={setUseWebGL}
        onStartExport={handleStartExport}
        onCancelExport={() => exportAbortRef.current?.abort()}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
