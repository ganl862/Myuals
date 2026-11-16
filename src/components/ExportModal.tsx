import React from 'react';
import { Download, X } from 'lucide-react';
import { ExportFormat, ExportProgress, ExportResult } from '../engine/exporter';

interface ExportModalProps {
  open: boolean;
  exportFormat: ExportFormat;
  useWebGL: boolean;
  webglSupported: boolean;
  isExporting: boolean;
  exportProgress: ExportProgress | null;
  exportResult: ExportResult | null;
  exportError: string | null;
  onChangeFormat: (fmt: ExportFormat) => void;
  onToggleWebGL: (val: boolean) => void;
  onStartExport: () => void;
  onCancelExport: () => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  exportFormat,
  useWebGL,
  webglSupported,
  isExporting,
  exportProgress,
  exportResult,
  exportError,
  onChangeFormat,
  onToggleWebGL,
  onStartExport,
  onCancelExport,
  onClose,
}) => {
  if (!open) return null;

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-[#181B21] border border-white/10 rounded-lg p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
          <h2 id="export-modal-title" className="text-base font-semibold text-white">
            تصدير الفيديو محلياً (60fps)
          </h2>
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            aria-label="إغلاق نافذة التصدير"
            className="min-h-[44px] min-w-[44px] bg-[#20242C] hover:bg-[#282D37] disabled:opacity-40 text-[#D1D5DB] rounded-lg flex items-center justify-center border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#9CA3AF]">
          معالجة محلية 100% عبر WebCodecs VideoEncoder بدون إنترنت وبدون صوت.
        </p>

        {/* Format Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={() => onChangeFormat('mp4')}
            className={`min-h-[44px] rounded-lg text-xs font-semibold border ${
              exportFormat === 'mp4'
                ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                : 'bg-[#20242C] text-[#D1D5DB] border-white/10'
            }`}
          >
            MP4 (H.264)
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => onChangeFormat('webm')}
            className={`min-h-[44px] rounded-lg text-xs font-semibold border ${
              exportFormat === 'webm'
                ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                : 'bg-[#20242C] text-[#D1D5DB] border-white/10'
            }`}
          >
            WebM (VP9)
          </button>
        </div>

        {/* WebGL GPU Toggle */}
        <div className="flex items-center justify-between gap-2 bg-[#111317] border border-white/10 rounded-lg p-3">
          <div className="text-xs">
            <div className="font-medium text-[#F3F4F6]">تسريع WebGL Shader</div>
            <div className="text-[#9CA3AF]">
              {webglSupported ? 'مفعّل للتمويه الدوراني والإشعاع' : 'غير متاح — وضع Canvas2D'}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            disabled={!webglSupported || isExporting}
            aria-checked={useWebGL && webglSupported}
            aria-label="تفعيل تسريع WebGL"
            onClick={() => onToggleWebGL(!useWebGL)}
            className={`min-h-[32px] w-14 rounded-full p-1 flex items-center ${
              useWebGL && webglSupported
                ? 'bg-[#3B82F6] justify-end'
                : 'bg-[#20242C] justify-start'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-white" />
          </button>
        </div>

        {isExporting && exportProgress && (
          <div data-testid="export-progress" className="flex flex-col gap-2 bg-[#111317] p-3 rounded-lg border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#E5E7EB]">
                جاري المعالجة ({exportProgress.frame}/{exportProgress.totalFrames})
              </span>
              <span className="font-mono tabular-nums text-[#3B82F6]">
                {exportProgress.percent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#20242C] overflow-hidden">
              <div
                className="h-full bg-[#3B82F6]"
                style={{ width: `${exportProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {exportError && (
          <div role="alert" className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {exportError}
          </div>
        )}

        {exportResult && !isExporting && (
          <div
            data-testid="export-complete"
            className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-emerald-300 truncate">
                جاهز: {exportResult.filename}
              </div>
              <div dir="ltr" className="text-[11px] text-[#9CA3AF] font-mono tabular-nums">
                {(exportResult.blob.size / 1024).toFixed(0)} KB · {exportResult.encoderUsed}
              </div>
            </div>
            <button
              type="button"
              onClick={triggerDownload}
              className="min-h-[44px] px-3 bg-emerald-500 hover:bg-emerald-400 text-[#07130D] rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>حفظ الملف</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isExporting}
            onClick={onStartExport}
            className="min-h-[44px] flex-1 px-4 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'جاري التصدير…' : `بدء التصدير (${exportFormat.toUpperCase()})`}</span>
          </button>
          {isExporting && (
            <button
              type="button"
              onClick={onCancelExport}
              className="min-h-[44px] px-4 bg-[#20242C] hover:bg-[#282D37] text-white border border-white/10 rounded-lg text-xs font-semibold"
            >
              إلغاء
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
