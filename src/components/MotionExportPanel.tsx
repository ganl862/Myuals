import React from 'react';
import { Download, RotateCcw, Sparkles, X } from 'lucide-react';
import { DEFAULT_MOTION_PARAMS, MotionParams } from '../engine/motionMath';
import { ExportFormat, ExportProgress, ExportResult } from '../engine/exporter';

interface MotionExportPanelProps {
  motionParams: MotionParams;
  useWebGL: boolean;
  webglSupported: boolean;
  onChangeMotionParams: (next: MotionParams) => void;
  onToggleWebGL: (next: boolean) => void;
  exportFormat: ExportFormat;
  onChangeExportFormat: (fmt: ExportFormat) => void;
  isExporting: boolean;
  exportProgress: ExportProgress | null;
  exportResult: ExportResult | null;
  exportError: string | null;
  onStartExport: () => void;
  onCancelExport: () => void;
}

export const MotionExportPanel: React.FC<MotionExportPanelProps> = ({
  motionParams,
  useWebGL,
  webglSupported,
  onChangeMotionParams,
  onToggleWebGL,
  exportFormat,
  onChangeExportFormat,
  isExporting,
  exportProgress,
  exportResult,
  exportError,
  onStartExport,
  onCancelExport,
}) => {
  const triggerDownload = () => {
    if (!exportResult) return;
    const url = URL.createObjectURL(exportResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* WebGL Hardware Pipeline Toggle */}
      <div className="rounded-xl bg-[#0E1118] p-3.5 border border-white/8 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[#F4F5F7]">
            WebGL Shader Post-Processing
          </div>
          <div className="text-xs text-[#9CA3AF]">
            {webglSupported
              ? 'GPU radial blur, 24px whip blur & screen blast'
              : 'WebGL unavailable — using Canvas2D fallback'}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          disabled={!webglSupported}
          aria-checked={useWebGL && webglSupported}
          aria-label="Toggle WebGL shader post-processing"
          onClick={() => onToggleWebGL(!useWebGL)}
          className={`min-h-[32px] w-14 rounded-full p-1 transition-colors flex items-center disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#FF1493] ${
            useWebGL && webglSupported
              ? 'bg-[#FF1493] justify-end'
              : 'bg-[#232836] justify-start'
          }`}
        >
          <span className="w-6 h-6 rounded-full bg-white shadow" />
        </button>
      </div>

      {/* Parametric Motion Sliders */}
      <div className="rounded-xl bg-[#0E1118] p-3.5 border border-white/8 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#F4F5F7]">
            Parametric Motion Tuning
          </span>
          <button
            type="button"
            onClick={() => onChangeMotionParams(DEFAULT_MOTION_PARAMS)}
            className="min-h-[36px] px-2.5 rounded-lg bg-[#1C202C] hover:bg-[#252A3A] text-xs font-medium text-[#D1D5DB] flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <div className="flex justify-between text-xs">
              <label htmlFor="param-bloom" className="text-[#9CA3AF]">
                Beat Bloom Peak
              </label>
              <span className="font-mono tabular-nums text-[#F4F5F7]">
                {Math.round(motionParams.beatBloomPeakBrightness * 100)}%
              </span>
            </div>
            <input
              id="param-bloom"
              type="range"
              min={1.2}
              max={2.4}
              step={0.05}
              value={motionParams.beatBloomPeakBrightness}
              onChange={(e) =>
                onChangeMotionParams({
                  ...motionParams,
                  beatBloomPeakBrightness: Number(e.target.value),
                })
              }
              className="studio-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <label htmlFor="param-radial" className="text-[#9CA3AF]">
                Radial Blur Max
              </label>
              <span className="font-mono tabular-nums text-[#F4F5F7]">
                {motionParams.radialBlurMaxPx}px
              </span>
            </div>
            <input
              id="param-radial"
              type="range"
              min={0}
              max={24}
              step={1}
              value={motionParams.radialBlurMaxPx}
              onChange={(e) =>
                onChangeMotionParams({
                  ...motionParams,
                  radialBlurMaxPx: Number(e.target.value),
                })
              }
              className="studio-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <label htmlFor="param-tilt" className="text-[#9CA3AF]">
                3D Card Tilt
              </label>
              <span className="font-mono tabular-nums text-[#F4F5F7]">
                {motionParams.cardTargetTiltDeg.toFixed(1)}°
              </span>
            </div>
            <input
              id="param-tilt"
              type="range"
              min={-18}
              max={0}
              step={0.5}
              value={motionParams.cardTargetTiltDeg}
              onChange={(e) =>
                onChangeMotionParams({
                  ...motionParams,
                  cardTargetTiltDeg: Number(e.target.value),
                })
              }
              className="studio-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <label htmlFor="param-whip" className="text-[#9CA3AF]">
                Whip Motion Blur
              </label>
              <span className="font-mono tabular-nums text-[#F4F5F7]">
                {motionParams.whipBlurMaxPx}px
              </span>
            </div>
            <input
              id="param-whip"
              type="range"
              min={0}
              max={36}
              step={1}
              value={motionParams.whipBlurMaxPx}
              onChange={(e) =>
                onChangeMotionParams({
                  ...motionParams,
                  whipBlurMaxPx: Number(e.target.value),
                })
              }
              className="studio-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <label htmlFor="param-stiffness" className="text-[#9CA3AF]">
                Spring Stiffness
              </label>
              <span className="font-mono tabular-nums text-[#F4F5F7]">
                {motionParams.springStiffness}
              </span>
            </div>
            <input
              id="param-stiffness"
              type="range"
              min={120}
              max={400}
              step={10}
              value={motionParams.springStiffness}
              onChange={(e) =>
                onChangeMotionParams({
                  ...motionParams,
                  springStiffness: Number(e.target.value),
                })
              }
              className="studio-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <label htmlFor="param-neon" className="text-[#9CA3AF]">
                Neon Bloom Power
              </label>
              <span className="font-mono tabular-nums text-[#F4F5F7]">
                {motionParams.neonGlowIntensity.toFixed(1)}×
              </span>
            </div>
            <input
              id="param-neon"
              type="range"
              min={0.4}
              max={1.8}
              step={0.1}
              value={motionParams.neonGlowIntensity}
              onChange={(e) =>
                onChangeMotionParams({
                  ...motionParams,
                  neonGlowIntensity: Number(e.target.value),
                })
              }
              className="studio-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <label htmlFor="param-cosmic" className="text-[#9CA3AF]">
                Cosmic Fire
              </label>
              <span className="font-mono tabular-nums text-[#F4F5F7]">
                {Math.round(motionParams.cosmicFirePower * 100)}%
              </span>
            </div>
            <input
              id="param-cosmic"
              type="range"
              min={0}
              max={1.6}
              step={0.1}
              value={motionParams.cosmicFirePower}
              onChange={(e) =>
                onChangeMotionParams({
                  ...motionParams,
                  cosmicFirePower: Number(e.target.value),
                })
              }
              className="studio-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <label htmlFor="param-spin-zoom" className="text-[#9CA3AF]">
                Spin Zoom Blur
              </label>
              <span className="font-mono tabular-nums text-[#F4F5F7]">
                {Math.round(motionParams.spinZoomBlurMax * 100)}%
              </span>
            </div>
            <input
              id="param-spin-zoom"
              type="range"
              min={0}
              max={1.6}
              step={0.1}
              value={motionParams.spinZoomBlurMax}
              onChange={(e) =>
                onChangeMotionParams({
                  ...motionParams,
                  spinZoomBlurMax: Number(e.target.value),
                })
              }
              className="studio-slider"
            />
          </div>
        </div>
      </div>

      {/* Offline WebCodecs Local Export */}
      <div className="rounded-xl bg-[#0E1118] p-4 border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#F4F5F7]">
              Local Offline Export (60fps)
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              Encoded locally via WebCodecs VideoEncoder · Zero cloud upload
            </p>
          </div>
        </div>

        <div
          role="group"
          aria-label="Export video format"
          className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#07090D] border border-white/8"
        >
          <button
            type="button"
            onClick={() => onChangeExportFormat('mp4')}
            className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
              exportFormat === 'mp4'
                ? 'bg-[#1C202C] text-white border border-white/15'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            MP4 (H.264)
          </button>
          <button
            type="button"
            onClick={() => onChangeExportFormat('webm')}
            className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
              exportFormat === 'webm'
                ? 'bg-[#1C202C] text-white border border-white/15'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            WebM (VP9)
          </button>
        </div>

        {isExporting && exportProgress && (
          <div className="flex flex-col gap-2" data-testid="export-progress">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#E5E7EB] capitalize">
                {exportProgress.stage} frame {exportProgress.frame}/{exportProgress.totalFrames}
              </span>
              <span className="font-mono tabular-nums text-[#FF7EC3]">
                {exportProgress.percent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#1C202C] overflow-hidden">
              <div
                className="h-full bg-[#FF1493] transition-all duration-150"
                style={{ width: `${exportProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {exportError && (
          <div
            role="alert"
            className="text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg p-2.5"
          >
            {exportError}
          </div>
        )}

        {exportResult && !isExporting && (
          <div
            data-testid="export-complete"
            className="flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-emerald-300 truncate">
                Ready: {exportResult.filename}
              </div>
              <div className="text-[11px] text-[#9CA3AF] font-mono tabular-nums">
                {(exportResult.blob.size / 1024).toFixed(0)} KB · {exportResult.encoderUsed} · {exportResult.durationMs}ms
              </div>
            </div>
            <button
              type="button"
              onClick={triggerDownload}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#07130D] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save File</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={onStartExport}
            className="min-h-[46px] flex-1 px-4 py-2.5 rounded-xl bg-[#FF1493] hover:bg-[#E60E83] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-white"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isExporting ? 'Rendering 250 Frames…' : `Render & Export ${exportFormat.toUpperCase()}`}</span>
          </button>
          {isExporting && (
            <button
              type="button"
              onClick={onCancelExport}
              aria-label="Cancel export"
              className="min-h-[46px] min-w-[46px] rounded-xl bg-[#1C202C] hover:bg-[#2A3042] text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
