import React, { useRef } from 'react';
import { ArrowLeft, ArrowRight, Film, Image as ImageIcon, Plus, Trash2, Upload } from 'lucide-react';
import {
  AspectRatioOption,
  getEffectiveClipDuration,
  MAX_IMAGE_DURATION_SEC,
  MediaClipItem,
  MIN_CLIP_DURATION_SEC,
} from '../engine/mediaTimeline';

interface MediaPanelProps {
  clips: MediaClipItem[];
  aspectRatio: AspectRatioOption;
  onChangeAspectRatio: (ratio: AspectRatioOption) => void;
  onUploadFiles: (files: FileList, replaceIndex?: number) => void;
  onReorderClip: (fromIndex: number, toIndex: number) => void;
  onUpdateImageDuration: (clipId: string, durationSec: number) => void;
  onUpdateTrim: (clipId: string, trimStart: number, trimEnd: number) => void;
  onRemoveClip: (clipId: string) => void;
}

const ASPECT_OPTIONS: Array<{ value: AspectRatioOption; label: string }> = [
  { value: 'auto', label: 'Auto (Source)' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
];

export const MediaPanel: React.FC<MediaPanelProps> = ({
  clips,
  aspectRatio,
  onChangeAspectRatio,
  onUploadFiles,
  onReorderClip,
  onUpdateImageDuration,
  onUpdateTrim,
  onRemoveClip,
}) => {
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <div className="flex flex-col gap-5">
      {/* Aspect Ratio Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
          <span className="font-semibold text-[#F4F5F7] text-sm">Aspect Ratio</span>
          <span>Canvas Frame</span>
        </div>
        <div
          role="group"
          aria-label="Aspect ratio selector"
          className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#0B0D12] border border-white/8"
        >
          {ASPECT_OPTIONS.map((opt) => {
            const active = aspectRatio === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeAspectRatio(opt.value)}
                className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493] ${
                  active
                    ? 'bg-[#FF1493] text-white shadow-sm'
                    : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload 2 or 3 Clips / Images */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#F4F5F7]">
            Media Clips ({clips.length}/3)
          </h3>
          <p className="text-xs text-[#9CA3AF]">
            Images auto-convert to 3.0s clips. Upload 2 or 3 local files.
          </p>
        </div>

        <input
          ref={bulkInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          aria-label="Upload clips or images"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <button
          type="button"
          onClick={() => bulkInputRef.current?.click()}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1C202C] hover:bg-[#252A3A] text-[#F4F5F7] text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 border border-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493]"
        >
          {clips.length < 3 ? <Plus className="w-4 h-4 text-[#FF1493]" /> : <Upload className="w-4 h-4 text-[#FF1493]" />}
          <span>{clips.length < 3 ? 'Add / Upload Media' : 'Replace Media'}</span>
        </button>
      </div>

      {/* Clip List with Trim & Reorder */}
      <div className="flex flex-col gap-3">
        {clips.map((clip, idx) => {
          const maxDur = clip.kind === 'image' ? clip.imageDurationSec : clip.sourceDurationSec;
          const effDur = getEffectiveClipDuration(clip);

          return (
            <div
              key={clip.id}
              data-testid={`clip-card-${idx}`}
              className="rounded-xl bg-[#0E1118] p-3.5 border border-white/8 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#1C202C] flex items-center justify-center shrink-0 text-[#FF7EC3]">
                    {clip.kind === 'video' ? (
                      <Film className="w-4 h-4" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#F4F5F7] truncate">
                      {idx === 0 ? 'Card 1 · ' : idx === 1 ? 'Card 2 · ' : 'Clip 3 · '}
                      {clip.name}
                    </div>
                    <div className="text-xs text-[#9CA3AF] font-mono tabular-nums">
                      {clip.width}×{clip.height} · {effDur.toFixed(1)}s active
                    </div>
                  </div>
                </div>

                {/* Reorder & Replace Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    ref={(el) => {
                      replaceInputRefs.current[clip.id] = el;
                    }}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    aria-label={`Replace ${clip.name}`}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        onUploadFiles(e.target.files, idx);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => replaceInputRefs.current[clip.id]?.click()}
                    aria-label={`Replace slot ${idx + 1} media`}
                    className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg bg-[#1C202C] hover:bg-[#262C3D] text-xs font-medium text-[#E5E7EB] flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493]"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onReorderClip(idx, idx - 1)}
                    aria-label={`Move ${clip.name} earlier`}
                    className="min-h-[40px] min-w-[40px] rounded-lg bg-[#1C202C] hover:bg-[#262C3D] disabled:opacity-35 text-[#E5E7EB] flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === clips.length - 1}
                    onClick={() => onReorderClip(idx, idx + 1)}
                    aria-label={`Move ${clip.name} later`}
                    className="min-h-[40px] min-w-[40px] rounded-lg bg-[#1C202C] hover:bg-[#262C3D] disabled:opacity-35 text-[#E5E7EB] flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493]"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {clips.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onRemoveClip(clip.id)}
                      aria-label={`Remove ${clip.name}`}
                      className="min-h-[40px] min-w-[40px] rounded-lg bg-[#1C202C] hover:bg-red-500/20 text-[#9CA3AF] hover:text-red-300 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#FF1493]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Static Image Duration Slider (default 3.0s) */}
              {clip.kind === 'image' && (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor={`img-dur-${clip.id}`} className="text-[#9CA3AF]">
                      Image Clip Duration
                    </label>
                    <span className="font-mono tabular-nums text-[#F4F5F7]">
                      {clip.imageDurationSec.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    id={`img-dur-${clip.id}`}
                    type="range"
                    min={MIN_CLIP_DURATION_SEC}
                    max={MAX_IMAGE_DURATION_SEC}
                    step={0.1}
                    value={clip.imageDurationSec}
                    onChange={(e) => onUpdateImageDuration(clip.id, Number(e.target.value))}
                    className="studio-slider"
                  />
                </div>
              )}

              {/* Trim Start / End Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor={`trim-start-${clip.id}`} className="text-[#9CA3AF]">
                      Trim Start
                    </label>
                    <span className="font-mono tabular-nums text-[#F4F5F7]">
                      {clip.trimStartSec.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    id={`trim-start-${clip.id}`}
                    type="range"
                    min={0}
                    max={Math.max(0, maxDur - 0.2)}
                    step={0.1}
                    value={clip.trimStartSec}
                    onChange={(e) =>
                      onUpdateTrim(clip.id, Number(e.target.value), clip.trimEndSec)
                    }
                    className="studio-slider"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor={`trim-end-${clip.id}`} className="text-[#9CA3AF]">
                      Trim End
                    </label>
                    <span className="font-mono tabular-nums text-[#F4F5F7]">
                      {clip.trimEndSec.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    id={`trim-end-${clip.id}`}
                    type="range"
                    min={Math.min(maxDur, clip.trimStartSec + 0.2)}
                    max={maxDur}
                    step={0.1}
                    value={clip.trimEndSec}
                    onChange={(e) =>
                      onUpdateTrim(clip.id, clip.trimStartSec, Number(e.target.value))
                    }
                    className="studio-slider"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
