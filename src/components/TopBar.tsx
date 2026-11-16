import React, { useRef } from 'react';
import { Download, Plus } from 'lucide-react';
import { AspectRatioOption } from '../engine/mediaTimeline';

interface TopBarProps {
  aspectRatio: AspectRatioOption;
  onChangeAspectRatio: (ratio: AspectRatioOption) => void;
  onUploadFiles: (files: FileList) => void;
  onOpenExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  aspectRatio,
  onChangeAspectRatio,
  onUploadFiles,
  onOpenExport,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <header
      dir="rtl"
      className="sticky top-0 z-30 h-14 px-3 lg:px-4 bg-[#111317] border-b border-white/10 flex items-center justify-between gap-2 shrink-0"
    >
      {/* 1. [+ رفع ملف] */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        aria-label="رفع ملف فيديو أو صورة"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="min-h-[44px] px-3 bg-[#20242C] hover:bg-[#282D37] text-[#F3F4F6] border border-white/10 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
      >
        <Plus className="w-4 h-4 text-[#3B82F6]" />
        <span>رفع ملف</span>
      </button>

      {/* 2. [المقاس: تلقائي / يدوي] */}
      <div className="flex items-center gap-2 min-w-0">
        <label htmlFor="aspect-select" className="sr-only">
          المقاس
        </label>
        <select
          id="aspect-select"
          aria-label="المقاس: تلقائي أو يدوي"
          value={aspectRatio}
          onChange={(e) => onChangeAspectRatio(e.target.value as AspectRatioOption)}
          className="min-h-[44px] px-3 bg-[#181B21] text-[#F3F4F6] border border-white/10 rounded-lg text-xs sm:text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
        >
          <option value="auto">المقاس: تلقائي</option>
          <option value="9:16">يدوي 9:16 (طولي)</option>
          <option value="1:1">يدوي 1:1 (مربع)</option>
          <option value="16:9">يدوي 16:9 (عرضي)</option>
        </select>
      </div>

      {/* 3. [تصدير MP4] */}
      <button
        type="button"
        onClick={onOpenExport}
        className="min-h-[44px] px-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
      >
        <Download className="w-4 h-4" />
        <span>تصدير MP4</span>
      </button>
    </header>
  );
};
