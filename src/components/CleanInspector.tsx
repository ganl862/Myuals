import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Palette,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import {
  getEffectiveClipDuration,
  MAX_IMAGE_DURATION_SEC,
  MediaClipItem,
  MIN_CLIP_DURATION_SEC,
} from '../engine/mediaTimeline';
import {
  AttachedEffectInstance,
  canAddEffectWithoutWarning,
  ClipTransitionAssignment,
  cycleEffectPlacement,
  EFFECT_MODIFIER_REGISTRY,
  EffectLayerPlacement,
  EffectModifierId,
  getEffectDef,
  getTransitionDef,
  PLACEMENT_LABELS,
  reorderEffectsList,
  SOFT_CAP_EFFECTS,
  TextTargetSlot,
  TRANSITION_REGISTRY,
  TransitionModuleId,
} from '../engine/registry';
import { TEXT_COLOR_SWATCHES, TextLayerConfig } from '../engine/typography';
import { ActiveContextKey } from './ContextSwitcher';

export type InspectorTab = 'transition' | 'effects' | 'text';

interface CleanInspectorProps {
  activeContext: ActiveContextKey;
  activeTab: InspectorTab;
  onChangeTab: (tab: InspectorTab) => void;
  hasTextLayer: boolean;
  isCosmicActive: boolean;
  hasClassicTextActive: boolean;
  clips: MediaClipItem[];
  activeClip: MediaClipItem | null;
  activeClipIndex: number;
  activeAssignment: ClipTransitionAssignment | null;
  activeEffects: AttachedEffectInstance[];
  textConfig: TextLayerConfig;
  onSelectClipTransition: (clipId: string, transitionId: TransitionModuleId) => void;
  onUpdateClipTransitionParam: (clipId: string, key: string, value: number) => void;
  onUpdateClipTransitionToggle: (clipId: string, key: string, value: boolean) => void;
  onUpdateClipTransitionSelect: (clipId: string, key: string, value: string) => void;
  onUpdateImageDuration: (clipId: string, durationSec: number) => void;
  onUpdateTrim: (clipId: string, trimStart: number, trimEnd: number) => void;
  onReplaceClipFile: (clipIndex: number, files: FileList) => void;
  onRemoveClip: (clipId: string) => void;
  onUpdateActiveEffects: (next: AttachedEffectInstance[]) => void;
  onAddEffect: (effectId: EffectModifierId, targetSlot?: TextTargetSlot) => void;
  onChangeTextConfig: (next: TextLayerConfig) => void;
  onUploadFont: (file: File) => void;
  onClearFont: () => void;
}

interface TextItemEditorProps {
  idPrefix: string;
  roleLabel: string;
  textValue: string;
  onChangeText: (val: string) => void;
  primaryColorLabel: string;
  primaryColor: string;
  onChangePrimaryColor: (hex: string) => void;
  secondaryColorLabel?: string;
  secondaryColor?: string;
  onChangeSecondaryColor?: (hex: string) => void;
  openPickerKey: string | null;
  onTogglePicker: (key: string) => void;
  toggleChecked?: boolean;
  onToggleChecked?: (val: boolean) => void;
}

const CompactTextCard: React.FC<TextItemEditorProps> = ({
  idPrefix,
  roleLabel,
  textValue,
  onChangeText,
  primaryColorLabel,
  primaryColor,
  onChangePrimaryColor,
  secondaryColorLabel,
  secondaryColor,
  onChangeSecondaryColor,
  openPickerKey,
  onTogglePicker,
  toggleChecked,
  onToggleChecked,
}) => {
  const pKey = `${idPrefix}-primary`;
  const sKey = `${idPrefix}-secondary`;
  const quoted = textValue.trim() ? `«${textValue.trim()}»` : 'فارغ';

  const renderPaletteDrawer = (
    activeHex: string,
    titleLabel: string,
    onPick: (hex: string) => void
  ) => (
    <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-[11px] text-[#D1D5DB]">
        <span className="truncate">
          {titleLabel} ({quoted})
        </span>
        <span dir="ltr" className="font-mono text-[#9CA3AF] uppercase shrink-0">
          {activeHex}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {TEXT_COLOR_SWATCHES.map((sw) => {
          const selected = activeHex.toLowerCase() === sw.hex.toLowerCase();
          return (
            <button
              key={sw.hex}
              type="button"
              title={sw.label}
              aria-label={`${titleLabel} ${quoted}: ${sw.label}`}
              onClick={() => onPick(sw.hex)}
              className={`min-h-[36px] min-w-[36px] rounded-md border ${
                selected ? 'border-white ring-2 ring-[#3B82F6]' : 'border-white/20'
              }`}
              style={{ backgroundColor: sw.hex }}
            />
          );
        })}
        <label
          aria-label={`اختيار لون مخصص: ${titleLabel} ${quoted}`}
          className="min-h-[36px] min-w-[36px] rounded-md bg-[#20242C] border border-white/20 flex items-center justify-center cursor-pointer overflow-hidden px-1"
        >
          <Palette className="w-4 h-4 text-[#D1D5DB]" />
          <input
            type="color"
            value={activeHex}
            onChange={(e) => onPick(e.target.value)}
            aria-label={`${titleLabel} ${quoted}`}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );

  return (
    <div className="bg-[#111317] border border-white/10 rounded-lg p-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`${idPrefix}-input`} className="text-xs font-medium text-[#E5E7EB] truncate">
          {roleLabel}: <span className="text-[#3B82F6] font-semibold">{quoted}</span>
        </label>

        {typeof toggleChecked === 'boolean' && onToggleChecked && (
          <button
            type="button"
            role="switch"
            aria-checked={toggleChecked}
            aria-label={`تفعيل ${roleLabel}`}
            onClick={() => onToggleChecked(!toggleChecked)}
            className={`min-h-[28px] w-12 rounded-full p-0.5 flex items-center shrink-0 ${
              toggleChecked ? 'bg-[#3B82F6] justify-end' : 'bg-[#20242C] justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`${idPrefix}-input`}
          type="text"
          dir="auto"
          value={textValue}
          onChange={(e) => onChangeText(e.target.value)}
          className="min-h-[44px] flex-1 min-w-0 px-3 bg-[#181B21] border border-white/10 rounded-lg text-sm text-white focus:border-[#3B82F6] focus:outline-none"
        />

        <button
          type="button"
          onClick={() => onTogglePicker(pKey)}
          aria-expanded={openPickerKey === pKey}
          aria-label={`تغيير ${primaryColorLabel} (${quoted})`}
          title={`${primaryColorLabel} ${quoted}`}
          className={`min-h-[44px] px-2.5 rounded-lg border flex items-center gap-1.5 text-xs shrink-0 ${
            openPickerKey === pKey
              ? 'bg-[#20242C] border-[#3B82F6] text-white'
              : 'bg-[#181B21] border-white/15 text-[#D1D5DB]'
          }`}
        >
          <span
            className="w-5 h-5 rounded border border-white/30 shrink-0"
            style={{ backgroundColor: primaryColor }}
          />
          <span className="hidden sm:inline">{primaryColorLabel}</span>
        </button>

        {secondaryColorLabel && secondaryColor && onChangeSecondaryColor && (
          <button
            type="button"
            onClick={() => onTogglePicker(sKey)}
            aria-expanded={openPickerKey === sKey}
            aria-label={`تغيير ${secondaryColorLabel} (${quoted})`}
            title={`${secondaryColorLabel} ${quoted}`}
            className={`min-h-[44px] px-2.5 rounded-lg border flex items-center gap-1.5 text-xs shrink-0 ${
              openPickerKey === sKey
                ? 'bg-[#20242C] border-[#3B82F6] text-white'
                : 'bg-[#181B21] border-white/15 text-[#D1D5DB]'
            }`}
          >
            <span
              className="w-5 h-5 rounded border border-white/30 shrink-0"
              style={{ backgroundColor: secondaryColor }}
            />
            <span className="hidden sm:inline">{secondaryColorLabel}</span>
          </button>
        )}
      </div>

      {openPickerKey === pKey && renderPaletteDrawer(primaryColor, primaryColorLabel, onChangePrimaryColor)}
      {secondaryColorLabel &&
        secondaryColor &&
        onChangeSecondaryColor &&
        openPickerKey === sKey &&
        renderPaletteDrawer(secondaryColor, secondaryColorLabel, onChangeSecondaryColor)}
    </div>
  );
};

export const CleanInspector: React.FC<CleanInspectorProps> = ({
  activeContext,
  activeTab,
  onChangeTab,
  hasTextLayer,
  isCosmicActive,
  hasClassicTextActive,
  clips,
  activeClip,
  activeClipIndex,
  activeAssignment,
  activeEffects,
  textConfig,
  onSelectClipTransition,
  onUpdateClipTransitionParam,
  onUpdateClipTransitionToggle,
  onUpdateClipTransitionSelect,
  onUpdateImageDuration,
  onUpdateTrim,
  onReplaceClipFile,
  onRemoveClip,
  onUpdateActiveEffects,
  onAddEffect,
  onChangeTextConfig,
  onUploadFont,
  onClearFont,
}) => {
  const [expandedEffectId, setExpandedEffectId] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [pendingTargetSlot, setPendingTargetSlot] = useState<TextTargetSlot>('all');
  const [showSoftCapModal, setShowSoftCapModal] = useState(false);
  const [softCapApprovedOnce, setSoftCapApprovedOnce] = useState(false);
  const [openColorPickerKey, setOpenColorPickerKey] = useState<string | null>(null);

  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const fontInputRef = useRef<HTMLInputElement | null>(null);

  const isEditingText = activeContext === 'text';

  const effectiveTab: InspectorTab =
    isEditingText && activeTab === 'transition'
      ? 'text'
      : !hasTextLayer && activeTab === 'text'
        ? 'transition'
        : activeTab;

  // Build explicit readable text-target options with live quoted text so user ALWAYS knows which text an effect applies to
  const textTargetOptions = useMemo<Array<{ value: TextTargetSlot; label: string }>>(() => {
    const opts: Array<{ value: TextTargetSlot; label: string }> = [
      { value: 'all', label: 'كل النصوص في المشهد' },
    ];
    if (isCosmicActive) {
      opts.push(
        {
          value: 'cosmicTitle',
          label: `العنوان الرئيسي «${textConfig.cosmicTitleText || 'كربلاء'}»`,
        },
        {
          value: 'cosmicLine1',
          label: `السطر الأول «${textConfig.cosmicLine1Text || 'دار النوايب'}»`,
        },
        {
          value: 'cosmicLine2',
          label: `السطر الثاني «${textConfig.cosmicLine2Text || 'والبلى'}»`,
        }
      );
    }
    if (hasClassicTextActive) {
      opts.push(
        {
          value: 'word1',
          label: `الكلمة الأولى «${textConfig.introWord1 || 'جف'}»`,
        },
        {
          value: 'word2',
          label: `الكلمة الثانية «${textConfig.introWord2 || 'ونحر'}»`,
        },
        {
          value: 'accentSymbol',
          label: `الرمز الجانبي «${textConfig.accentSymbol || 'ع'}»`,
        },
        {
          value: 'neonTitle',
          label: `العنوان الرئيسي «${textConfig.neonTitle || 'أبا الفضل'}»`,
        }
      );
    }
    return opts;
  }, [isCosmicActive, hasClassicTextActive, textConfig]);

  const getTargetLabelForEffect = (fx: AttachedEffectInstance): string => {
    if (!isEditingText) {
      return activeClip ? `اللقطة ${activeClipIndex + 1} (${activeClip.name})` : 'اللقطة';
    }
    const slot = fx.targetTextSlot ?? 'all';
    const found = textTargetOptions.find((o) => o.value === slot);
    if (found) return found.label;
    if (slot === 'neonTitle') return `العنوان الرئيسي «${textConfig.neonTitle}»`;
    return 'طبقة النص';
  };

  const handleRequestAddEffect = () => {
    if (canAddEffectWithoutWarning(activeEffects.length) || softCapApprovedOnce) {
      setShowAddPicker((prev) => !prev);
    } else {
      setShowSoftCapModal(true);
    }
  };

  const handleMoveEffect = (idx: number, dir: 'up' | 'down') => {
    const reordered = reorderEffectsList(activeEffects, idx, dir);
    if (reordered !== activeEffects) {
      onUpdateActiveEffects(reordered);
    } else {
      const next = activeEffects.map((fx, i) =>
        i === idx ? { ...fx, placement: cycleEffectPlacement(fx.placement, dir) } : fx
      );
      onUpdateActiveEffects(next);
    }
  };

  const handleCyclePlacement = (instanceId: string) => {
    const order: EffectLayerPlacement[] = [
      'behind-clip',
      'above-clip',
      'behind-text',
      'above-text',
    ];
    onUpdateActiveEffects(
      activeEffects.map((fx) => {
        if (fx.instanceId !== instanceId) return fx;
        const nextIdx = (order.indexOf(fx.placement) + 1) % order.length;
        return { ...fx, placement: order[nextIdx] };
      })
    );
  };

  const selectedTransDef = activeAssignment
    ? getTransitionDef(activeAssignment.transitionId)
    : null;

  return (
    <section
      dir="rtl"
      aria-label="لوحة المفتش"
      className="flex-1 min-h-0 flex flex-col bg-[#181B21] border border-white/10 rounded-lg overflow-hidden"
    >
      {/* Inspector Top Tab Bar */}
      <div
        role="tablist"
        aria-label="أقسام التعديل"
        className="p-2 bg-[#111317] border-b border-white/10 flex items-center gap-1.5 sm:gap-2 shrink-0"
      >
        {!isEditingText && (
          <button
            type="button"
            role="tab"
            aria-selected={effectiveTab === 'transition'}
            onClick={() => onChangeTab('transition')}
            className={`min-h-[44px] flex-1 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap border ${
              effectiveTab === 'transition'
                ? 'bg-[#20242C] text-white border-[#3B82F6]'
                : 'bg-transparent text-[#9CA3AF] hover:text-white border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#3B82F6] shrink-0" />
            <span className="sm:hidden">الانتقال</span>
            <span className="hidden sm:inline">الانتقال / الشيك</span>
          </button>
        )}

        <button
          type="button"
          role="tab"
          aria-selected={effectiveTab === 'effects'}
          onClick={() => onChangeTab('effects')}
          className={`min-h-[44px] flex-1 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap border ${
            effectiveTab === 'effects'
              ? 'bg-[#20242C] text-white border-[#3B82F6]'
              : 'bg-transparent text-[#9CA3AF] hover:text-white border-transparent'
          }`}
        >
          <Layers className="w-4 h-4 text-[#3B82F6] shrink-0" />
          <span className="sm:hidden">التأثيرات ({activeEffects.length})</span>
          <span className="hidden sm:inline">التأثيرات المُركَّبة ({activeEffects.length})</span>
        </button>

        {hasTextLayer && (
          <button
            type="button"
            role="tab"
            aria-selected={effectiveTab === 'text'}
            onClick={() => onChangeTab('text')}
            className={`min-h-[44px] flex-1 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap border ${
              effectiveTab === 'text'
                ? 'bg-[#20242C] text-white border-[#3B82F6]'
                : 'bg-transparent text-[#9CA3AF] hover:text-white border-transparent'
            }`}
          >
            <Type className="w-4 h-4 text-[#3B82F6] shrink-0" />
            <span className="sm:hidden">النص والألوان</span>
            <span className="hidden sm:inline">النص والخط والألوان</span>
          </button>
        )}
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-4 flex flex-col gap-3">
        {/* TAB 1: Independent Per-Clip Transition / Shake */}
        {effectiveTab === 'transition' && activeClip && activeAssignment && selectedTransDef && (
          <div className="flex flex-col gap-3">
            {/* Active Clip Info + Image Duration + Trim */}
            <div className="bg-[#111317] border border-white/10 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-semibold text-[#F3F4F6] truncate">
                    {activeClip.name}
                  </div>
                  <div dir="ltr" className="text-[11px] text-[#9CA3AF] font-mono tabular-nums text-right">
                    {activeClip.width}×{activeClip.height} · {getEffectiveClipDuration(activeClip).toFixed(1)}s
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    aria-label="استبدال اللقطة"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        onReplaceClipFile(activeClipIndex, e.target.files);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => replaceInputRef.current?.click()}
                    className="min-h-[44px] px-3 bg-[#20242C] hover:bg-[#282D37] text-[#E5E7EB] border border-white/10 rounded-lg text-xs font-medium whitespace-nowrap"
                  >
                    تبديل الملف
                  </button>
                  {clips.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveClip(activeClip.id)}
                      aria-label={`حذف ${activeClip.name}`}
                      className="min-h-[44px] min-w-[44px] bg-[#20242C] hover:bg-red-500/20 text-[#9CA3AF] hover:text-red-300 border border-white/10 rounded-lg flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {activeClip.kind === 'image' && (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor={`clip-dur-${activeClip.id}`} className="text-[#9CA3AF]">
                      مدة الصورة (الافتراضي 3.0ث)
                    </label>
                    <span dir="ltr" className="font-mono tabular-nums text-[#F3F4F6]">
                      {activeClip.imageDurationSec.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    id={`clip-dur-${activeClip.id}`}
                    type="range"
                    min={MIN_CLIP_DURATION_SEC}
                    max={MAX_IMAGE_DURATION_SEC}
                    step={0.1}
                    value={activeClip.imageDurationSec}
                    onChange={(e) => onUpdateImageDuration(activeClip.id, Number(e.target.value))}
                    className="studio-slider"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(() => {
                  const maxDur =
                    activeClip.kind === 'image'
                      ? activeClip.imageDurationSec
                      : activeClip.sourceDurationSec;
                  return (
                    <>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <label htmlFor={`trim-s-${activeClip.id}`} className="text-[#9CA3AF]">
                            بداية القص
                          </label>
                          <span dir="ltr" className="font-mono tabular-nums text-[#F3F4F6]">
                            {activeClip.trimStartSec.toFixed(1)}s
                          </span>
                        </div>
                        <input
                          id={`trim-s-${activeClip.id}`}
                          type="range"
                          min={0}
                          max={Math.max(0, maxDur - 0.2)}
                          step={0.1}
                          value={activeClip.trimStartSec}
                          onChange={(e) =>
                            onUpdateTrim(activeClip.id, Number(e.target.value), activeClip.trimEndSec)
                          }
                          className="studio-slider"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <label htmlFor={`trim-e-${activeClip.id}`} className="text-[#9CA3AF]">
                            نهاية القص
                          </label>
                          <span dir="ltr" className="font-mono tabular-nums text-[#F3F4F6]">
                            {activeClip.trimEndSec.toFixed(1)}s
                          </span>
                        </div>
                        <input
                          id={`trim-e-${activeClip.id}`}
                          type="range"
                          min={Math.min(maxDur, activeClip.trimStartSec + 0.2)}
                          max={maxDur}
                          step={0.1}
                          value={activeClip.trimEndSec}
                          onChange={(e) =>
                            onUpdateTrim(activeClip.id, activeClip.trimStartSec, Number(e.target.value))
                          }
                          className="studio-slider"
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Clean Module Cards (Name + 1-line description ONLY) */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold text-[#9CA3AF]">
                اختر انتقال أو شيك لـ «{clips.length === 1 ? 'اللقطة' : `اللقطة ${activeClipIndex + 1}`}» بشكل مستقل
              </div>
              {TRANSITION_REGISTRY.map((mod) => {
                const selected = activeAssignment.transitionId === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => onSelectClipTransition(activeClip.id, mod.id)}
                    className={`min-h-[56px] w-full text-right p-3 rounded-lg border flex flex-col gap-1 ${
                      selected
                        ? 'bg-[#20242C] border-[#3B82F6] text-white'
                        : 'bg-[#111317] border-white/10 text-[#D1D5DB] hover:bg-[#1C2027]'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-semibold">{mod.name}</span>
                    <span className="text-xs text-[#9CA3AF] truncate w-full">
                      {mod.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dedicated Controls ONLY for selected Transition */}
            {(selectedTransDef.params.length > 0 ||
              (selectedTransDef.toggles?.length ?? 0) > 0 ||
              (selectedTransDef.selects?.length ?? 0) > 0) && (
              <div className="bg-[#111317] border border-white/10 rounded-lg p-3 flex flex-col gap-2.5">
                <div className="text-xs font-semibold text-[#F3F4F6]">
                  إعدادات: {selectedTransDef.name}
                </div>

                {selectedTransDef.selects?.map((sel) => {
                  const val = activeAssignment.selects?.[sel.key] ?? sel.defaultValue;
                  return (
                    <div key={sel.key} className="flex items-center justify-between gap-2">
                      <label htmlFor={`tr-sel-${sel.key}`} className="text-xs text-[#9CA3AF]">
                        {sel.label}
                      </label>
                      <select
                        id={`tr-sel-${sel.key}`}
                        value={val}
                        onChange={(e) =>
                          onUpdateClipTransitionSelect(activeClip.id, sel.key, e.target.value)
                        }
                        className="min-h-[44px] px-3 bg-[#181B21] border border-white/10 rounded-lg text-xs text-white"
                      >
                        {sel.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}

                {selectedTransDef.toggles?.map((tog) => {
                  const checked = activeAssignment.toggles?.[tog.key] ?? tog.defaultValue;
                  return (
                    <div key={tog.key} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#D1D5DB]">{tog.label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        aria-label={tog.label}
                        onClick={() =>
                          onUpdateClipTransitionToggle(activeClip.id, tog.key, !checked)
                        }
                        className={`min-h-[32px] w-14 rounded-full p-1 flex items-center shrink-0 ${
                          checked ? 'bg-[#3B82F6] justify-end' : 'bg-[#20242C] justify-start'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-white" />
                      </button>
                    </div>
                  );
                })}

                {selectedTransDef.params.map((p) => {
                  const val = activeAssignment.values[p.key] ?? p.defaultValue;
                  return (
                    <div key={p.key} className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor={`tr-${p.key}`} className="text-[#9CA3AF]">
                          {p.label}
                        </label>
                        <span dir="ltr" className="font-mono tabular-nums text-[#F3F4F6]">
                          {val}
                          {p.unit ?? ''}
                        </span>
                      </div>
                      <input
                        id={`tr-${p.key}`}
                        type="range"
                        min={p.min}
                        max={p.max}
                        step={p.step}
                        value={val}
                        onChange={(e) =>
                          onUpdateClipTransitionParam(
                            activeClip.id,
                            p.key,
                            Number(e.target.value)
                          )
                        }
                        className="studio-slider"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Attachable Effect Modifiers (with EXPLICIT Target Label on every row) */}
        {effectiveTab === 'effects' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-[#9CA3AF] bg-[#111317] border border-white/10 rounded-lg px-3 py-2">
              <span className="truncate">
                التأثيرات النشطة على:{' '}
                <strong className="text-[#F3F4F6]">
                  {isEditingText
                    ? 'طبقات النصوص'
                    : `${clips.length === 1 ? 'اللقطة' : `اللقطة ${activeClipIndex + 1}`} (${activeClip?.name ?? ''})`}
                </strong>
              </span>
              <span dir="ltr" className="font-mono tabular-nums shrink-0">
                {activeEffects.length} / {SOFT_CAP_EFFECTS}
              </span>
            </div>

            {activeEffects.length === 0 ? (
              <div className="bg-[#111317] border border-white/10 rounded-lg p-4 text-center text-xs text-[#9CA3AF]">
                لا توجد تأثيرات مُركَّبة هنا حالياً. اضغط (+ إضافة تأثير) لإضافة ميزة مستقلة.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeEffects.map((fx, idx) => {
                  const def = getEffectDef(fx.effectId);
                  const expanded = expandedEffectId === fx.instanceId;
                  const targetLabel = getTargetLabelForEffect(fx);

                  return (
                    <div
                      key={fx.instanceId}
                      data-testid={`effect-row-${idx}`}
                      className="bg-[#111317] border border-white/10 rounded-lg p-2.5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-semibold text-[#F3F4F6] truncate">
                            {def.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] pt-0.5">
                            <span className="text-[#E5E7EB]">
                              الهدف: <strong className="text-[#3B82F6]">{targetLabel}</strong>
                            </span>
                            <span className="text-[#6B7280]">·</span>
                            <button
                              type="button"
                              onClick={() => handleCyclePlacement(fx.instanceId)}
                              className="text-[#9CA3AF] hover:text-white underline decoration-dotted"
                              title="تغيير موضع الطبقة (خلف/أمام اللقطة أو النص)"
                            >
                              {PLACEMENT_LABELS[fx.placement]}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveEffect(idx, 'up')}
                            aria-label={`تحريك ${def.name} للأعلى`}
                            className="min-h-[44px] min-w-[40px] bg-[#20242C] hover:bg-[#282D37] text-[#E5E7EB] border border-white/10 rounded-lg flex items-center justify-center"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveEffect(idx, 'down')}
                            aria-label={`تحريك ${def.name} للأسفل`}
                            className="min-h-[44px] min-w-[40px] bg-[#20242C] hover:bg-[#282D37] text-[#E5E7EB] border border-white/10 rounded-lg flex items-center justify-center"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedEffectId(expanded ? null : fx.instanceId)
                            }
                            aria-expanded={expanded}
                            aria-label={`تعديل إعدادات ${def.name}`}
                            className={`min-h-[44px] px-2.5 border rounded-lg text-xs font-medium ${
                              expanded
                                ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                                : 'bg-[#20242C] text-[#E5E7EB] border-white/10'
                            }`}
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateActiveEffects(
                                activeEffects.filter((e) => e.instanceId !== fx.instanceId)
                              )
                            }
                            aria-label={`إزالة ${def.name}`}
                            className="min-h-[44px] min-w-[40px] bg-[#20242C] hover:bg-red-500/20 text-[#9CA3AF] hover:text-red-300 border border-white/10 rounded-lg flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                          {isEditingText && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-[#9CA3AF]">النص المستهدف</span>
                              <select
                                aria-label={`النص المستهدف لتأثير ${def.name}`}
                                value={fx.targetTextSlot ?? 'all'}
                                onChange={(e) =>
                                  onUpdateActiveEffects(
                                    activeEffects.map((item) =>
                                      item.instanceId === fx.instanceId
                                        ? { ...item, targetTextSlot: e.target.value as TextTargetSlot }
                                        : item
                                    )
                                  )
                                }
                                className="min-h-[44px] max-w-[210px] px-2 bg-[#181B21] border border-white/10 rounded-lg text-xs text-[#F3F4F6]"
                              >
                                {textTargetOptions.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#9CA3AF]">موضع الطبقة (Z-Index)</span>
                            <select
                              aria-label={`موضع طبقة ${def.name}`}
                              value={fx.placement}
                              onChange={(e) =>
                                onUpdateActiveEffects(
                                  activeEffects.map((item) =>
                                    item.instanceId === fx.instanceId
                                      ? { ...item, placement: e.target.value as EffectLayerPlacement }
                                      : item
                                  )
                                )
                              }
                              className="min-h-[44px] px-2 bg-[#181B21] border border-white/10 rounded-lg text-xs text-[#F3F4F6]"
                            >
                              <option value="behind-clip">خلف اللقطة</option>
                              <option value="above-clip">أمام اللقطة</option>
                              <option value="behind-text">خلف النص</option>
                              <option value="above-text">أمام النص</option>
                            </select>
                          </div>

                          {def.params.map((p) => {
                            const val = fx.values[p.key] ?? p.defaultValue;
                            return (
                              <div key={p.key} className="flex flex-col gap-0.5">
                                <div className="flex items-center justify-between text-xs">
                                  <label
                                    htmlFor={`fx-${fx.instanceId}-${p.key}`}
                                    className="text-[#9CA3AF]"
                                  >
                                    {p.label}
                                  </label>
                                  <span dir="ltr" className="font-mono tabular-nums text-[#F3F4F6]">
                                    {val}
                                    {p.unit ?? ''}
                                  </span>
                                </div>
                                <input
                                  id={`fx-${fx.instanceId}-${p.key}`}
                                  type="range"
                                  min={p.min}
                                  max={p.max}
                                  step={p.step}
                                  value={val}
                                  onChange={(e) =>
                                    onUpdateActiveEffects(
                                      activeEffects.map((item) =>
                                        item.instanceId === fx.instanceId
                                          ? {
                                              ...item,
                                              values: {
                                                ...item.values,
                                                [p.key]: Number(e.target.value),
                                              },
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className="studio-slider"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* + إضافة تأثير button */}
            <button
              type="button"
              onClick={handleRequestAddEffect}
              className="min-h-[44px] w-full px-4 bg-[#20242C] hover:bg-[#282D37] text-white border border-white/15 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-[#3B82F6]" />
              <span>إضافة تأثير</span>
            </button>

            {/* Effect Registry Picker */}
            {showAddPicker && (
              <div
                data-testid="effect-picker"
                className="bg-[#111317] border border-[#3B82F6]/40 rounded-lg p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#F3F4F6]">
                    اختر تأثيراً لإضافته
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddPicker(false)}
                    aria-label="إغلاق قائمة التأثيرات"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#9CA3AF] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isEditingText && (
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <label htmlFor="pending-text-target" className="text-xs text-[#9CA3AF]">
                      تطبيق التأثير على:
                    </label>
                    <select
                      id="pending-text-target"
                      value={pendingTargetSlot}
                      onChange={(e) => setPendingTargetSlot(e.target.value as TextTargetSlot)}
                      className="min-h-[44px] max-w-[210px] px-2 bg-[#181B21] border border-white/10 rounded-lg text-xs text-white"
                    >
                      {textTargetOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {EFFECT_MODIFIER_REGISTRY.map((eff) => (
                  <button
                    key={eff.id}
                    type="button"
                    onClick={() => {
                      onAddEffect(eff.id, isEditingText ? pendingTargetSlot : undefined);
                      setShowAddPicker(false);
                    }}
                    className="min-h-[52px] w-full text-right p-2.5 bg-[#181B21] hover:bg-[#20242C] border border-white/10 rounded-lg flex flex-col gap-0.5"
                  >
                    <span className="text-xs font-semibold text-[#F3F4F6]">{eff.name}</span>
                    <span className="text-[11px] text-[#9CA3AF] truncate w-full">
                      {eff.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Clean Self-Documenting Text + Color Chips (Zero Wall-of-Buttons Clutter) */}
        {effectiveTab === 'text' && hasTextLayer && (
          <div className="flex flex-col gap-2.5">
            {isCosmicActive && (
              <>
                <div className="text-xs font-semibold text-[#9CA3AF]">
                  نصوص وألوان «سلايد كربلاء الكوني»
                </div>
                <CompactTextCard
                  idPrefix="cosmic-title"
                  roleLabel="العنوان الرئيسي (على اللقطة 1)"
                  textValue={textConfig.cosmicTitleText}
                  onChangeText={(val) => onChangeTextConfig({ ...textConfig, cosmicTitleText: val })}
                  primaryColorLabel="لون العنوان"
                  primaryColor={textConfig.cosmicAccentColor}
                  onChangePrimaryColor={(hex) =>
                    onChangeTextConfig({ ...textConfig, cosmicAccentColor: hex })
                  }
                  openPickerKey={openColorPickerKey}
                  onTogglePicker={(k) =>
                    setOpenColorPickerKey((prev) => (prev === k ? null : k))
                  }
                />
                <CompactTextCard
                  idPrefix="cosmic-line1"
                  roleLabel="السطر الأول (على اللقطة 2)"
                  textValue={textConfig.cosmicLine1Text}
                  onChangeText={(val) => onChangeTextConfig({ ...textConfig, cosmicLine1Text: val })}
                  primaryColorLabel="لون السطر 1"
                  primaryColor={textConfig.cosmicLine1Color}
                  onChangePrimaryColor={(hex) =>
                    onChangeTextConfig({ ...textConfig, cosmicLine1Color: hex })
                  }
                  openPickerKey={openColorPickerKey}
                  onTogglePicker={(k) =>
                    setOpenColorPickerKey((prev) => (prev === k ? null : k))
                  }
                />
                <CompactTextCard
                  idPrefix="cosmic-line2"
                  roleLabel="السطر الثاني (تحت السطر 1)"
                  textValue={textConfig.cosmicLine2Text}
                  onChangeText={(val) => onChangeTextConfig({ ...textConfig, cosmicLine2Text: val })}
                  primaryColorLabel="لون التمييز"
                  primaryColor={textConfig.cosmicAccentColor}
                  onChangePrimaryColor={(hex) =>
                    onChangeTextConfig({ ...textConfig, cosmicAccentColor: hex })
                  }
                  openPickerKey={openColorPickerKey}
                  onTogglePicker={(k) =>
                    setOpenColorPickerKey((prev) => (prev === k ? null : k))
                  }
                />
                <CompactTextCard
                  idPrefix="cosmic-credit"
                  roleLabel="نص الحقوق (أسفل الشاشة)"
                  textValue={textConfig.cosmicCreditText}
                  onChangeText={(val) =>
                    onChangeTextConfig({ ...textConfig, cosmicCreditText: val })
                  }
                  primaryColorLabel="لون التمييز"
                  primaryColor={textConfig.cosmicAccentColor}
                  onChangePrimaryColor={(hex) =>
                    onChangeTextConfig({ ...textConfig, cosmicAccentColor: hex })
                  }
                  openPickerKey={openColorPickerKey}
                  onTogglePicker={(k) =>
                    setOpenColorPickerKey((prev) => (prev === k ? null : k))
                  }
                  toggleChecked={textConfig.cosmicCreditEnabled}
                  onToggleChecked={(checked) =>
                    onChangeTextConfig({ ...textConfig, cosmicCreditEnabled: checked })
                  }
                />
              </>
            )}

            {hasClassicTextActive && (
              <>
                <div className="text-xs font-semibold text-[#9CA3AF] pt-1">
                  نصوص وألوان «البطاقة العائمة والزوم»
                </div>
                <CompactTextCard
                  idPrefix="classic-w1"
                  roleLabel="الكلمة الأولى (0ms)"
                  textValue={textConfig.introWord1}
                  onChangeText={(val) => onChangeTextConfig({ ...textConfig, introWord1: val })}
                  primaryColorLabel="اللون"
                  primaryColor={textConfig.word1Color}
                  onChangePrimaryColor={(hex) =>
                    onChangeTextConfig({ ...textConfig, word1Color: hex })
                  }
                  openPickerKey={openColorPickerKey}
                  onTogglePicker={(k) =>
                    setOpenColorPickerKey((prev) => (prev === k ? null : k))
                  }
                />
                <CompactTextCard
                  idPrefix="classic-w2"
                  roleLabel="الكلمة الثانية (816ms)"
                  textValue={textConfig.introWord2}
                  onChangeText={(val) => onChangeTextConfig({ ...textConfig, introWord2: val })}
                  primaryColorLabel="اللون"
                  primaryColor={textConfig.word2Color}
                  onChangePrimaryColor={(hex) =>
                    onChangeTextConfig({ ...textConfig, word2Color: hex })
                  }
                  openPickerKey={openColorPickerKey}
                  onTogglePicker={(k) =>
                    setOpenColorPickerKey((prev) => (prev === k ? null : k))
                  }
                />
                <CompactTextCard
                  idPrefix="classic-accent"
                  roleLabel="الرمز الجانبي (Card 1)"
                  textValue={textConfig.accentSymbol}
                  onChangeText={(val) => onChangeTextConfig({ ...textConfig, accentSymbol: val })}
                  primaryColorLabel="اللون"
                  primaryColor={textConfig.accentColor}
                  onChangePrimaryColor={(hex) =>
                    onChangeTextConfig({ ...textConfig, accentColor: hex })
                  }
                  openPickerKey={openColorPickerKey}
                  onTogglePicker={(k) =>
                    setOpenColorPickerKey((prev) => (prev === k ? null : k))
                  }
                />
                <CompactTextCard
                  idPrefix="classic-neon"
                  roleLabel="العنوان الرئيسي (النيون)"
                  textValue={textConfig.neonTitle}
                  onChangeText={(val) => onChangeTextConfig({ ...textConfig, neonTitle: val })}
                  primaryColorLabel="القلب"
                  primaryColor={textConfig.neonCoreColor}
                  onChangePrimaryColor={(hex) =>
                    onChangeTextConfig({ ...textConfig, neonCoreColor: hex })
                  }
                  secondaryColorLabel="التوهج"
                  secondaryColor={textConfig.neonGlowColor}
                  onChangeSecondaryColor={(hex) =>
                    onChangeTextConfig({ ...textConfig, neonGlowColor: hex })
                  }
                  openPickerKey={openColorPickerKey}
                  onTogglePicker={(k) =>
                    setOpenColorPickerKey((prev) => (prev === k ? null : k))
                  }
                />
              </>
            )}

            {/* Auto-scale & Local Font Loader */}
            <div className="bg-[#111317] border border-white/10 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#E5E7EB]">ضبط الحجم تلقائياً لمنع القص</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={textConfig.autoScale}
                  aria-label="تفعيل ضبط الحجم تلقائياً"
                  onClick={() =>
                    onChangeTextConfig({ ...textConfig, autoScale: !textConfig.autoScale })
                  }
                  className={`min-h-[32px] w-14 rounded-full p-1 flex items-center ${
                    textConfig.autoScale
                      ? 'bg-[#3B82F6] justify-end'
                      : 'bg-[#20242C] justify-start'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-white" />
                </button>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-xs">
                  <label htmlFor="txt-scale" className="text-[#9CA3AF]">
                    حجم الخط
                  </label>
                  <span dir="ltr" className="font-mono tabular-nums text-[#F3F4F6]">
                    {Math.round(textConfig.fontScaleMultiplier * 100)}%
                  </span>
                </div>
                <input
                  id="txt-scale"
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.05}
                  value={textConfig.fontScaleMultiplier}
                  onChange={(e) =>
                    onChangeTextConfig({
                      ...textConfig,
                      fontScaleMultiplier: Number(e.target.value),
                    })
                  }
                  className="studio-slider"
                />
              </div>
            </div>

            <div className="bg-[#111317] border border-white/10 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#F3F4F6] truncate">
                  {textConfig.customFontName || 'Noto Naskh Arabic / Cairo (افتراضي)'}
                </div>
                <div className="text-[11px] text-[#9CA3AF]">
                  رفع خط محلي (.ttf / .otf) بدون إنترنت
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={fontInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf"
                  className="hidden"
                  aria-label="رفع خط محلي"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      onUploadFont(f);
                      e.target.value = '';
                    }
                  }}
                />
                {textConfig.customFontFamily && (
                  <button
                    type="button"
                    onClick={onClearFont}
                    aria-label="إرجاع الخط الافتراضي"
                    className="min-h-[44px] min-w-[44px] bg-[#20242C] text-[#D1D5DB] border border-white/10 rounded-lg flex items-center justify-center"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fontInputRef.current?.click()}
                  className="min-h-[44px] px-3 bg-[#20242C] hover:bg-[#282D37] text-[#F3F4F6] border border-white/10 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Upload className="w-4 h-4 text-[#3B82F6]" />
                  <span>رفع خط</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4-Effect Soft Cap Warning Modal */}
      {showSoftCapModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="soft-cap-title"
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm bg-[#181B21] border border-white/15 rounded-lg p-4 flex flex-col gap-3">
            <h3 id="soft-cap-title" className="text-sm font-semibold text-white">
              تنبيه الأداء (حد 4 تأثيرات)
            </h3>
            <p className="text-xs text-[#D1D5DB] leading-relaxed">
              إضافة أكثر من 4 تأثيرات مدمجة على نفس العنصر قد يسبب بطئاً في المعاينة على الهواتف
              الضعيفة.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSoftCapApprovedOnce(true);
                  setShowSoftCapModal(false);
                  setShowAddPicker(true);
                }}
                className="min-h-[44px] flex-1 px-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-xs font-semibold"
              >
                السماح والإكمال
              </button>
              <button
                type="button"
                onClick={() => setShowSoftCapModal(false)}
                className="min-h-[44px] flex-1 px-3 bg-[#20242C] hover:bg-[#282D37] text-[#E5E7EB] border border-white/10 rounded-lg text-xs font-semibold"
              >
                البقاء على 4 تأثيرات
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
