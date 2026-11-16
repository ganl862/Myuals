import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Repeat,
  RotateCcw,
} from 'lucide-react';
import { TOTAL_DURATION_MS, TOTAL_FRAMES, TimelineState } from '../engine/motionMath';
import { CanvasDimensions } from '../engine/mediaTimeline';

interface TransitionViewportProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  dimensions: CanvasDimensions;
  timelineState: TimelineState;
  isPlaying: boolean;
  isLooping: boolean;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onReset: () => void;
  onSeekMs: (ms: number) => void;
  onStepFrame: (delta: number) => void;
}

const PHASE_MARKERS: Array<{ phase: number; label: string; timeMs: number }> = [
  { phase: 1, label: 'P1 Beat', timeMs: 816 },
  { phase: 2, label: 'P2 Blast', timeMs: 2083 },
  { phase: 3, label: 'P3 Card 1', timeMs: 2583 },
  { phase: 4, label: 'P4 Whip', timeMs: 2916 },
  { phase: 5, label: 'P5 Neon', timeMs: 3500 },
];

export const TransitionViewport: React.FC<TransitionViewportProps> = ({
  canvasRef,
  dimensions,
  timelineState,
  isPlaying,
  isLooping,
  onTogglePlay,
  onToggleLoop,
  onReset,
  onSeekMs,
  onStepFrame,
}) => {
  const aspectStyle = {
    aspectRatio: `${dimensions.width} / ${dimensions.height}`,
  };

  return (
    <section
      aria-label="Live Transition Preview"
      className="flex flex-col gap-3 rounded-2xl bg-[#13161F] p-4 border border-white/8"
      data-testid="viewport-section"
      data-phase={timelineState.phase}
      data-frame={timelineState.frame}
      data-time-ms={Math.round(timelineState.timeMs)}
    >
      {/* Clean unboxed telemetry header */}
      <div className="flex items-center justify-between gap-2 text-xs text-[#9CA3AF]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-[#F4F5F7] whitespace-nowrap">
            Phase {timelineState.phase}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{timelineState.keyframeLabel}</span>
        </div>
        <div className="font-mono tabular-nums whitespace-nowrap shrink-0 text-[#F4F5F7]">
          F{String(timelineState.frame).padStart(3, '0')}/{TOTAL_FRAMES}
          <span className="text-[#6B7280] mx-1">/</span>
          {Math.round(timelineState.timeMs)}ms
        </div>
      </div>

      {/* Centered Responsive Canvas Stage */}
      <div className="w-full flex items-center justify-center rounded-xl bg-[#07090D] p-2 sm:p-2.5 overflow-hidden border border-white/6">
        <div
          className="relative w-full max-h-[46vh] lg:max-h-[430px] flex items-center justify-center"
          style={aspectStyle}
        >
          <canvas
            ref={canvasRef}
            data-testid="transition-canvas"
            width={dimensions.width}
            height={dimensions.height}
            onClick={onTogglePlay}
            className="w-full h-full object-contain rounded-lg cursor-pointer shadow-2xl shadow-black/80"
            aria-label="Transition playback canvas"
          />
        </div>
      </div>

      {/* Single-Touch Timeline Scrubber */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="timeline-scrubber" className="sr-only">
          Timeline Scrubber
        </label>
        <input
          id="timeline-scrubber"
          type="range"
          min={0}
          max={TOTAL_DURATION_MS}
          step={1}
          value={Math.round(timelineState.timeMs)}
          onChange={(e) => onSeekMs(Number(e.target.value))}
          className="studio-slider"
          aria-label="Scrub transition timeline in milliseconds"
        />

        {/* Quick Phase Jump Buttons (44px touch targets) */}
        <div className="grid grid-cols-5 gap-1.5">
          {PHASE_MARKERS.map((m) => {
            const active = timelineState.phase === m.phase;
            return (
              <button
                key={m.phase}
                type="button"
                onClick={() => onSeekMs(m.timeMs)}
                className={`min-h-[40px] px-1.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493] ${
                  active
                    ? 'bg-[#FF1493]/20 text-[#FF7EC3] border border-[#FF1493]/50'
                    : 'bg-[#1C202C] text-[#9CA3AF] hover:text-[#F4F5F7] border border-transparent'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ergonomic Thumb Playback Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset to start frame"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#1C202C] text-[#D1D5DB] hover:text-white hover:bg-[#252A3A] transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(-1)}
            aria-label="Previous frame"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#1C202C] text-[#D1D5DB] hover:text-white hover:bg-[#252A3A] transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause transition' : 'Play transition'}
          className="min-h-[46px] flex-1 max-w-[200px] px-5 py-2.5 rounded-xl bg-[#FF1493] hover:bg-[#E60E83] active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#FF1493]/20 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Play 60fps</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onStepFrame(1)}
            aria-label="Next frame"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#1C202C] text-[#D1D5DB] hover:text-white hover:bg-[#252A3A] transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onToggleLoop}
            aria-pressed={isLooping}
            aria-label={isLooping ? 'Disable loop playback' : 'Enable loop playback'}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493] ${
              isLooping
                ? 'bg-[#FF1493]/20 text-[#FF7EC3] border border-[#FF1493]/40'
                : 'bg-[#1C202C] text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
