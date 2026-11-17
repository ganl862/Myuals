import React from 'react';
import { FPS } from '../engine/motionMath';
import { CanvasDimensions } from '../engine/mediaTimeline';
import {
  BeatMarkerIcon,
  PauseVectorIcon,
  PlayVectorIcon,
  ResetParamIcon,
  StepBackFrameIcon,
  StepFwdFrameIcon,
} from './StudioIcons';

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

const BEAT_MARKERS = [
  { id: 'intro', label: 'دخول', ratio: 0.0 },
  { id: 'beat', label: 'نبضة', ratio: 0.196 },
  { id: 'card', label: 'بطاقة 3D', ratio: 0.564 },
  { id: 'whip', label: 'Whip', ratio: 0.70 },
  { id: 'neon', label: 'نيون', ratio: 0.84 },
];

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
  const frameStepMs = 1000 / FPS;
  const sec = (timeMs / 1000).toFixed(2);
  const totalSec = (safeTotalMs / 1000).toFixed(2);

  return (
    <section
      aria-label="منصة المعاينة"
      data-testid="studio-monitor"
      data-frame={currentFrame}
      className="flex flex-col gap-2 bg-[#181B21] border border-white/10 rounded-lg p-2.5 lg:p-4 h-full"
    >
      {/* Full-Clarity Dark Studio Viewport */}
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

      {/* Beat-Jump & 1F Frame Step Bar (Fast Edit Navigation) */}
      <div
        dir="rtl"
        aria-label="القفز السريع للنبضات وتمرير الإطارات"
        className="flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-1.5 shrink-0"
      >
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onSeekMs(Math.max(0, timeMs - frameStepMs))}
            aria-label="الرجوع إطار واحد"
            title="-1F"
            className="min-h-[32px] min-w-[34px] px-1.5 bg-[#20242C] hover:bg-[#282D37] border border-white/10 rounded-md flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
          >
            <StepBackFrameIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSeekMs(Math.min(safeTotalMs, timeMs + frameStepMs))}
            aria-label="التقدم إطار واحد"
            title="+1F"
            className="min-h-[32px] min-w-[34px] px-1.5 bg-[#20242C] hover:bg-[#282D37] border border-white/10 rounded-md flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
          >
            <StepFwdFrameIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="hidden sm:block h-4 w-px bg-white/10 shrink-0" />

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 flex-1 min-w-0">
          {BEAT_MARKERS.map((m) => {
            const targetMs = Math.round(safeTotalMs * m.ratio);
            const active = Math.abs(timeMs - targetMs) < safeTotalMs * 0.045;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSeekMs(targetMs)}
                className={`min-h-[32px] px-2 rounded-md border text-[11px] font-medium flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#20242C] border-[#FBBF24]/70 text-[#FEF08A]'
                    : 'bg-[#111317] hover:bg-[#20242C] border-white/10 text-[#9CA3AF] hover:text-white'
                }`}
              >
                <BeatMarkerIcon className="w-3 h-3 shrink-0" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simple Transport Bar (Play/Pause + Reset + Wide Scrub + Timecode) */}
      <div dir="rtl" className="flex items-center gap-2 pt-0.5 shrink-0">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'إيقاف المعاينة' : 'تشغيل المعاينة'}
          className="min-h-[44px] min-w-[44px] px-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 focus-visible:outline-2 focus-visible:outline-white"
        >
          {isPlaying ? <PauseVectorIcon className="w-4 h-4" /> : <PlayVectorIcon className="w-4 h-4" />}
          <span className="hidden sm:inline">{isPlaying ? 'إيقاف' : 'تشغيل'}</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          aria-label="إعادة للبداية"
          className="min-h-[44px] min-w-[44px] bg-[#20242C] hover:bg-[#282D37] text-[#D1D5DB] border border-white/10 rounded-lg flex items-center justify-center shrink-0 focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
        >
          <ResetParamIcon className="w-4 h-4" />
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
