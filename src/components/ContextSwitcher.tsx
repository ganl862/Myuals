import React from 'react';
import { ArrowLeftRight, Film, Type } from 'lucide-react';
import { MediaClipItem } from '../engine/mediaTimeline';

export type ActiveContextKey = 'clip-0' | 'clip-1' | 'clip-2' | 'text';

interface ContextSwitcherProps {
  clips: MediaClipItem[];
  activeContext: ActiveContextKey;
  hasTextLayer: boolean;
  onSelectContext: (ctx: ActiveContextKey) => void;
  onSwapClips: () => void;
}

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  clips,
  activeContext,
  hasTextLayer,
  onSelectContext,
  onSwapClips,
}) => {
  const isMulti = clips.length >= 2;

  return (
    <nav
      dir="rtl"
      aria-label="تحديد العنصر النشط"
      className="bg-[#181B21] border border-white/10 rounded-lg p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0"
    >
      {clips.map((clip, idx) => {
        const key: ActiveContextKey = idx === 0 ? 'clip-0' : idx === 1 ? 'clip-1' : 'clip-2';
        const active = activeContext === key;
        const label = clips.length === 1 ? 'اللقطة' : `اللقطة ${idx + 1}`;

        return (
          <React.Fragment key={clip.id}>
            <button
              type="button"
              onClick={() => onSelectContext(key)}
              aria-pressed={active}
              className={`min-h-[44px] flex-1 min-w-[66px] px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap border focus-visible:outline-2 focus-visible:outline-[#3B82F6] ${
                active
                  ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                  : 'bg-[#20242C] text-[#D1D5DB] hover:text-white border-white/10'
              }`}
            >
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{label}</span>
            </button>

            {isMulti && idx === 0 && (
              <button
                type="button"
                onClick={onSwapClips}
                aria-label="تبديل اللقطة 1 واللقطة 2"
                title="تبديل ترتيب اللقطتين"
                className="min-h-[44px] min-w-[40px] sm:min-w-[44px] bg-[#20242C] hover:bg-[#282D37] text-[#D1D5DB] border border-white/10 rounded-lg flex items-center justify-center shrink-0 focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            )}
          </React.Fragment>
        );
      })}

      {hasTextLayer && (
        <button
          type="button"
          onClick={() => onSelectContext('text')}
          aria-pressed={activeContext === 'text'}
          className={`min-h-[44px] flex-1 min-w-[66px] px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap border focus-visible:outline-2 focus-visible:outline-[#3B82F6] ${
            activeContext === 'text'
              ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
              : 'bg-[#20242C] text-[#D1D5DB] hover:text-white border-white/10'
          }`}
        >
          <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>النص</span>
        </button>
      )}
    </nav>
  );
};
