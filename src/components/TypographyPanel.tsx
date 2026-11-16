import React, { useRef } from 'react';
import { Type, Upload, RotateCcw } from 'lucide-react';
import { TextLayerConfig } from '../engine/typography';

interface TypographyPanelProps {
  config: TextLayerConfig;
  onChange: (next: TextLayerConfig) => void;
  onUploadFont: (file: File) => void;
  onClearFont: () => void;
}

export const TypographyPanel: React.FC<TypographyPanelProps> = ({
  config,
  onChange,
  onUploadFont,
  onClearFont,
}) => {
  const fontInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col gap-5">
      {/* Intro Phrase (Words 1 & 2) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#F4F5F7]">
            1. Intro Phrase (Beat-Timed Reveal)
          </span>
          <span className="text-xs text-[#9CA3AF]">0ms / 816ms</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="intro-word-1" className="text-xs text-[#9CA3AF]">
              Word 1 (Appears 0ms)
            </label>
            <input
              id="intro-word-1"
              type="text"
              dir="auto"
              value={config.introWord1}
              onChange={(e) => onChange({ ...config, introWord1: e.target.value })}
              placeholder="e.g. جف"
              className="min-h-[44px] w-full rounded-xl bg-[#0B0D12] border border-white/10 px-3.5 py-2 text-base text-[#F4F5F7] placeholder:text-[#6B7280] focus:border-[#FF1493] focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="intro-word-2" className="text-xs text-[#9CA3AF]">
              Word 2 (Beat Flash 816ms)
            </label>
            <input
              id="intro-word-2"
              type="text"
              dir="auto"
              value={config.introWord2}
              onChange={(e) => onChange({ ...config, introWord2: e.target.value })}
              placeholder="e.g. ونحر"
              className="min-h-[44px] w-full rounded-xl bg-[#0B0D12] border border-white/10 px-3.5 py-2 text-base text-[#F4F5F7] placeholder:text-[#6B7280] focus:border-[#FF1493] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Floating Accent Symbol */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="accent-symbol" className="text-sm font-semibold text-[#F4F5F7]">
            2. Floating Accent Symbol (Card 1 Side)
          </label>
          <span className="text-xs text-[#9CA3AF]">2380ms – 2950ms</span>
        </div>
        <input
          id="accent-symbol"
          type="text"
          dir="auto"
          value={config.accentSymbol}
          onChange={(e) => onChange({ ...config, accentSymbol: e.target.value })}
          placeholder="e.g. ع or ✦"
          className="min-h-[44px] w-full rounded-xl bg-[#0B0D12] border border-white/10 px-3.5 py-2 text-base text-[#F4F5F7] placeholder:text-[#6B7280] focus:border-[#FF1493] focus:outline-none"
        />
      </div>

      {/* Main Neon Calligraphy Title */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="neon-title" className="text-sm font-semibold text-[#F4F5F7]">
            3. Main Neon Title (Dual-Layer Bloom)
          </label>
          <span className="text-xs text-[#9CA3AF]">3010ms – 4166ms</span>
        </div>
        <input
          id="neon-title"
          type="text"
          dir="auto"
          value={config.neonTitle}
          onChange={(e) => onChange({ ...config, neonTitle: e.target.value })}
          placeholder="e.g. أبا الفضل"
          className="min-h-[44px] w-full rounded-xl bg-[#0B0D12] border border-white/10 px-3.5 py-2 text-base text-[#F4F5F7] placeholder:text-[#6B7280] focus:border-[#FF1493] focus:outline-none"
        />
      </div>

      {/* Auto-Scale & Manual Size Multiplier */}
      <div className="rounded-xl bg-[#0E1118] p-3.5 border border-white/8 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-[#F4F5F7]">Auto-Scale Typography</div>
            <div className="text-xs text-[#9CA3AF]">
              Prevents Arabic RTL / English clipping across ratios
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.autoScale}
            aria-label="Toggle auto-scaling typography"
            onClick={() => onChange({ ...config, autoScale: !config.autoScale })}
            className={`min-h-[32px] w-14 rounded-full p-1 transition-colors flex items-center focus-visible:outline-2 focus-visible:outline-[#FF1493] ${
              config.autoScale ? 'bg-[#FF1493] justify-end' : 'bg-[#232836] justify-start'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-white shadow" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="font-scale-slider" className="text-[#9CA3AF]">
              Typography Scale
            </label>
            <span className="font-mono tabular-nums text-[#F4F5F7]">
              {Math.round(config.fontScaleMultiplier * 100)}%
            </span>
          </div>
          <input
            id="font-scale-slider"
            type="range"
            min={0.6}
            max={1.5}
            step={0.05}
            value={config.fontScaleMultiplier}
            onChange={(e) =>
              onChange({ ...config, fontScaleMultiplier: Number(e.target.value) })
            }
            className="studio-slider"
          />
        </div>
      </div>

      {/* Local Font Loader (.ttf / .otf / .woff2) */}
      <div className="rounded-xl bg-[#0E1118] p-3.5 border border-white/8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#1C202C] flex items-center justify-center shrink-0 text-[#FF7EC3]">
            <Type className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[#F4F5F7] truncate">
              {config.customFontName ? config.customFontName : 'System Arabic & Sans'}
            </div>
            <div className="text-xs text-[#9CA3AF]">
              Load local .ttf / .otf font offline
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <input
            ref={fontInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf"
            className="hidden"
            aria-label="Load local font file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadFont(file);
                e.target.value = '';
              }
            }}
          />
          {config.customFontFamily && (
            <button
              type="button"
              onClick={onClearFont}
              aria-label="Reset to default font"
              className="min-h-[40px] min-w-[40px] rounded-xl bg-[#1C202C] hover:bg-[#252A3A] text-[#9CA3AF] hover:text-white flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => fontInputRef.current?.click()}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1C202C] hover:bg-[#252A3A] text-xs font-semibold text-[#F4F5F7] flex items-center gap-2 border border-white/10 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493]"
          >
            <Upload className="w-3.5 h-3.5 text-[#FF1493]" />
            <span>Load Font</span>
          </button>
        </div>
      </div>
    </div>
  );
};
