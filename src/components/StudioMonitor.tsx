import React from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { FPS } from '../engine/motionMath';
import { CanvasDimensions } from '../engine/mediaTimeline';

interface StudioMonitorProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  dimensions: CanvasDimensions;
  timeMs: number;
  totalDurationMs: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onSeekMs: (ms: number) => void;
}

export const StudioMonitor: React.FC<StudioMonitorProps> = ({
  canvasRef,
  dimensions,
  timeMs,
  totalDurationMs,
  isPlaying,
  onTogglePlay,
  onReset,
  onSeekMs,
}) => {
  const safeTotalMs = Math.max(1000, totalDurationMs);
  const totalFrames = Math.max(2, Math.round((safeTotalMs / 1000) * FPS));
  const currentFrame = Math.min(
    totalFrames,
    Math.max(1, Math.round((timeMs / safeTotalMs) * (totalFrames - 1)) + 1)
  );
  const sec = (timeMs / 1000).toFixed(2);
  const totalSec = (safeTotalMs / 1000).toFixed(2);

  return (
    <section
      aria-label="منصة المعاينة"
      data-testid="studio-monitor"
      data-frame={currentFrame}
      className="flex flex-col gap-2 bg-[#181B21] border border-white/10 rounded-lg p-2.5 lg:p-4 h-full"
    >
      {/* Full-Clarity Dark Studio Viewport (no tiny height bottleneck) */}
      <div className="flex-1 min-h-0 w-full bg-[#07080B] border border-white/10 rounded-md flex items-center justify-center p-1.5 overflow-hidden">
        <canvas
          ref={canvasRef}
          data-testid="transition-canvas"
          width={dimensions.width}
          height={dimensions.height}
          onClick={onTogglePlay}
          className="max-w-full max-h-full w-auto h-auto object-contain cursor-pointer"
          style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
          aria-label="شاشة معاينة المونتاج"
        />
      </div>

      {/* Simple Transport Bar (Play/Pause + Reset + Wide Scrub + Timecode) */}
      <div dir="rtl" className="flex items-center gap-2 pt-0.5 shrink-0">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'إيقاف المعاينة' : 'تشغيل المعاينة'}
          className="min-h-[44px] min-w-[44px] px-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 focus-visible:outline-2 focus-visible:outline-white"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span className="hidden sm:inline">{isPlaying ? 'إيقاف' : 'تشغيل'}</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          aria-label="إعادة للبداية"
          className="min-h-[44px] min-w-[44px] bg-[#20242C] hover:bg-[#282D37] text-[#D1D5DB] border border-white/10 rounded-lg flex items-center justify-center shrink-0 focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0 flex items-center">
          <label htmlFor="monitor-scrub" className="sr-only">
            المرور السريع على المعاينة
          </label>
          <input
            id="monitor-scrub"
            type="range"
            min={0}
            max={safeTotalMs}
            step={1}
            value={Math.round(Math.min(safeTotalMs, timeMs))}
            onChange={(e) => onSeekMs(Number(e.target.value))}
            className="studio-slider"
            aria-label="المرور السريع"
          />
        </div>

        <div
          dir="ltr"
          className="font-mono tabular-nums text-[11px] sm:text-xs text-[#D1D5DB] whitespace-nowrap shrink-0 px-1 sm:px-2"
        >
          <span>
            {sec}s/{totalSec}s
          </span>
          <span className="hidden sm:inline">
            {' '}
            · F{String(currentFrame).padStart(3, '0')}/{totalFrames}
          </span>
        </div>
      </div>
    </section>
  );
};
