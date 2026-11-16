import { COSMIC_SLIDE_REF_DURATION_SEC } from './cosmicSlide';

export type TransitionModuleId =
  | 'cosmic_slide_3d'
  | 'master-3d-neon-whip'
  | 'fake-zoom-geo-slide'
  | 'smooth-zoom-out-tilt'
  | 'cinematic-shake-impact'
  | 'focus_pulse_shake'
  | 'none';

export type EffectModifierId =
  | 'picture-glow-shadow-feather'
  | 'starfield-lens-flare'
  | 'focus-pulse-shake'
  | 'geometric-dissolve'
  | 'beat-bloom'
  | 'rotational-zoom-blur'
  | 'neon-glow-aura'
  | 'chromatic-aberration'
  | 'handheld-shake'
  | 'cosmic-fire';

export type EffectLayerPlacement =
  | 'behind-clip'
  | 'above-clip'
  | 'behind-text'
  | 'above-text';

export type TextTargetSlot =
  | 'all'
  | 'word1'
  | 'word2'
  | 'accentSymbol'
  | 'neonTitle'
  | 'cosmicTitle'
  | 'cosmicLine1'
  | 'cosmicLine2';

export interface SliderParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  defaultValue: number;
}

export interface ToggleParamDef {
  key: string;
  label: string;
  defaultValue: boolean;
}

export interface SelectParamDef {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue: string;
}

export interface TransitionModuleDef {
  id: TransitionModuleId;
  name: string;
  description: string;
  hasTextLayer: boolean;
  defaultDurationMs?: number;
  params: SliderParamDef[];
  toggles?: ToggleParamDef[];
  selects?: SelectParamDef[];
}

export interface EffectModifierDef {
  id: EffectModifierId;
  name: string;
  description: string;
  defaultPlacement: EffectLayerPlacement;
  params: SliderParamDef[];
}

export interface AttachedEffectInstance {
  instanceId: string;
  effectId: EffectModifierId;
  placement: EffectLayerPlacement;
  targetTextSlot?: TextTargetSlot;
  enabled: boolean;
  values: Record<string, number>;
}

export interface ClipTransitionAssignment {
  transitionId: TransitionModuleId;
  values: Record<string, number>;
  toggles?: Record<string, boolean>;
  selects?: Record<string, string>;
  effects: AttachedEffectInstance[];
}

export const SOFT_CAP_EFFECTS = 4;

export const PLACEMENT_LABELS: Record<EffectLayerPlacement, string> = {
  'behind-clip': 'خلف اللقطة',
  'above-clip': 'أمام اللقطة',
  'behind-text': 'خلف النص',
  'above-text': 'أمام النص',
};

/**
 * 1. Modular Registry: Per-Clip Transitions & Shakes
 */
export const TRANSITION_REGISTRY: TransitionModuleDef[] = [
  {
    id: 'cosmic_slide_3d',
    name: 'سلايد كربلاء الكوني (Karbala Cosmic Slide)',
    description: 'دخول 3D للقطة 1 وتجميع حروف عربي ثم سلايد فضائي وتوهج العدسة واهتزاز نبضة التركيز.',
    hasTextLayer: true,
    defaultDurationMs: Math.round(COSMIC_SLIDE_REF_DURATION_SEC * 1000),
    params: [
      { key: 'durationSec', label: 'المدة الكلية للانتقال', min: 3.0, max: 12.0, step: 0.1, unit: 's', defaultValue: COSMIC_SLIDE_REF_DURATION_SEC },
      { key: 'motionBlurStrength', label: 'قوة التمويه الحركي', min: 0, max: 100, step: 5, unit: '%', defaultValue: 100 },
      { key: 'starDensity', label: 'كثافة النجوم', min: 0.2, max: 1.5, step: 0.1, defaultValue: 1.0 },
      { key: 'starSpeed', label: 'سرعة النجوم', min: 0.2, max: 2.0, step: 0.1, defaultValue: 1.0 },
      { key: 'letterScatterAmount', label: 'تشتت حروف العنوان', min: 0, max: 1.5, step: 0.1, defaultValue: 1.0 },
      { key: 'assemblyDurationSec', label: 'مدة تجميع الحروف', min: 0.2, max: 1.4, step: 0.05, unit: 's', defaultValue: 0.6 },
      { key: 'glowIntensity', label: 'شدة التوهج', min: 0, max: 2.0, step: 0.1, defaultValue: 1.0 },
      { key: 'shadowStrength', label: 'قوة الظل', min: 0, max: 1.5, step: 0.1, defaultValue: 1.0 },
      { key: 'edgeFeatherAmount', label: 'تنعيم حواف الصورة', min: 0, max: 15, step: 1, unit: '%', defaultValue: 6 },
      { key: 'fadeInDurationSec', label: 'مدة الدخول (Fade-In)', min: 0.2, max: 2.5, step: 0.1, unit: 's', defaultValue: 1.0 },
      { key: 'fadeOutDurationSec', label: 'مدة الخروج (Fade-Out)', min: 0.3, max: 2.5, step: 0.1, unit: 's', defaultValue: 1.3 },
    ],
    toggles: [
      { key: 'lensFlareEnabled', label: 'توهج العدسة الفضائي (Lens Flare)', defaultValue: true },
      { key: 'ghostFramesEnabled', label: 'إطارات الصدى خلف اللقطة 2', defaultValue: true },
      { key: 'scanlineGlitchEnabled', label: 'شرائح جليتش دقيقة (0.9-1.3ث)', defaultValue: false },
    ],
    selects: [
      {
        key: 'slideDirection',
        label: 'اتجاه السلايد',
        defaultValue: 'right',
        options: [
          { value: 'right', label: 'يمين (الافتراضي)' },
          { value: 'left', label: 'يسار' },
          { value: 'up', label: 'أعلى' },
          { value: 'down', label: 'أسفل' },
        ],
      },
      {
        key: 'line2Align',
        label: 'محاذاة السطر الثاني',
        defaultValue: 'left',
        options: [
          { value: 'left', label: 'يسار (الأصل)' },
          { value: 'center', label: 'توسيط' },
          { value: 'right', label: 'يمين' },
        ],
      },
    ],
  },
  {
    id: 'master-3d-neon-whip',
    name: 'البطاقة العائمة وموجة النيون (3D Neon Whip)',
    description: 'زوم مزيف + بطاقة ثلاثية الأبعاد مائلة مع سحب جانبي سريع ونصوص النيون.',
    hasTextLayer: true,
    params: [
      { key: 'cardTiltDeg', label: 'ميلان البطاقة 3D', min: -18, max: 0, step: 0.5, unit: '°', defaultValue: -8.5 },
      { key: 'cardScale', label: 'حجم البطاقة العائمة', min: 0.45, max: 0.85, step: 0.01, defaultValue: 0.62 },
      { key: 'whipBlurPx', label: 'تمويه السحب الأفقي', min: 0, max: 36, step: 1, unit: 'px', defaultValue: 24 },
      { key: 'radialBlurPx', label: 'تمويه الإشعاع', min: 0, max: 24, step: 1, unit: 'px', defaultValue: 14 },
    ],
  },
  {
    id: 'fake-zoom-geo-slide',
    name: 'زوم مزيف وسلايد هندسي (Fake Zoom & Geo)',
    description: 'سحب مرآتي للخارج ثم اندفاع للداخل مع تلاشي بأشكال هندسية.',
    hasTextLayer: true,
    params: [
      { key: 'zoomPush', label: 'قوة الزوم للداخل', min: 1.0, max: 1.4, step: 0.02, defaultValue: 1.18 },
      { key: 'slideAmount', label: 'مدى السلايد الجانبي', min: 0, max: 20, step: 1, unit: '%', defaultValue: 10 },
      { key: 'geoStrength', label: 'كثافة الأشكال الهندسية', min: 0, max: 1.5, step: 0.1, defaultValue: 1.0 },
    ],
  },
  {
    id: 'smooth-zoom-out-tilt',
    name: 'زوم أوت سلس وميلان (Smooth Zoom-Out Tilt)',
    description: 'تصغير سلس ومستمر للبطاقة مع دخول مائل وتوهج نيون في المنتصف.',
    hasTextLayer: true,
    params: [
      { key: 'startScale', label: 'حجم البداية', min: 0.55, max: 0.95, step: 0.02, defaultValue: 0.72 },
      { key: 'endScale', label: 'حجم الاستقرار', min: 0.4, max: 0.75, step: 0.02, defaultValue: 0.54 },
      { key: 'tiltSwingDeg', label: 'زاوية ميلان اللقطة', min: 0, max: 18, step: 0.5, unit: '°', defaultValue: 9.5 },
    ],
  },
  {
    id: 'focus_pulse_shake',
    name: 'اهتزاز نبضة التركيز (Focus-Pulse Shake)',
    description: 'ضربة زوم سريعة مع نبضة غباش التركيز واهتزاز كاميرا متلاشي.',
    hasTextLayer: false,
    params: [
      { key: 'zoomPunchAmount', label: 'قوة ضربة الزوم', min: 1.0, max: 1.5, step: 0.02, defaultValue: 1.28 },
      { key: 'shakeStrength', label: 'شدة الاهتزاز', min: 0, max: 2.0, step: 0.1, defaultValue: 1.0 },
    ],
    toggles: [
      { key: 'shakeEnabled', label: 'تفعيل الاهتزاز', defaultValue: true },
      { key: 'focusPulseEnabled', label: 'تفعيل نبضة الغباش والبوكيه', defaultValue: true },
    ],
  },
  {
    id: 'cinematic-shake-impact',
    name: 'صدمة اهتزاز ووميض (Impact Shake)',
    description: 'اهتزاز كاميرا إيقاعي مع وميض تعريض سريع عند دخول اللقطة.',
    hasTextLayer: false,
    params: [
      { key: 'shakeAmp', label: 'شدة الاهتزاز', min: 2, max: 35, step: 1, unit: 'px', defaultValue: 18 },
      { key: 'shakeFreq', label: 'سرعة التردد', min: 4, max: 28, step: 1, defaultValue: 16 },
      { key: 'flashPeak', label: 'قوة الوميض', min: 0, max: 1.0, step: 0.05, defaultValue: 0.65 },
    ],
  },
  {
    id: 'none',
    name: 'قطع نظيف بدون انتقال (Clean Cut)',
    description: 'عرض اللقطة كما هي بالقص الزمني دون تحريك أو تشويه انتقالي.',
    hasTextLayer: false,
    params: [],
  },
];

/**
 * 2. Modular Registry: Attachable Effect Modifiers (Reusable on any clip or text)
 */
export const EFFECT_MODIFIER_REGISTRY: EffectModifierDef[] = [
  {
    id: 'picture-glow-shadow-feather',
    name: 'توهج وظل وتلاشي الحواف (Glow-Shadow-Feather)',
    description: 'توهج خارجي مع ظل عميق وتنعيم ناعم لحواف اللقطة بالخلفية.',
    defaultPlacement: 'behind-clip',
    params: [
      { key: 'glowIntensity', label: 'شدة التوهج', min: 0, max: 2.0, step: 0.1, defaultValue: 1.0 },
      { key: 'shadowStrength', label: 'قوة الظل', min: 0, max: 1.5, step: 0.1, defaultValue: 1.0 },
      { key: 'featherPercent', label: 'نسبة تنعيم الحواف', min: 0, max: 15, step: 1, unit: '%', defaultValue: 6 },
    ],
  },
  {
    id: 'starfield-lens-flare',
    name: 'خلفية النجوم وتوهج العدسة (Starfield + Lens Flare)',
    description: 'فضاء نجوم ثلاثي الأبعاد مع توهج عدسة أنامورفي متحرك.',
    defaultPlacement: 'behind-clip',
    params: [
      { key: 'starDensity', label: 'كثافة النجوم', min: 0.2, max: 1.5, step: 0.1, defaultValue: 1.0 },
      { key: 'starSpeed', label: 'سرعة النجوم', min: 0.2, max: 2.0, step: 0.1, defaultValue: 1.0 },
    ],
  },
  {
    id: 'focus-pulse-shake',
    name: 'اهتزاز نبضة التركيز (Focus-Pulse Shake)',
    description: 'زوم سريع مع نبضة غباش التركيز وبوكيه النجوم واهتزاز متلاشي.',
    defaultPlacement: 'above-clip',
    params: [
      { key: 'zoomPunchAmount', label: 'قوة ضربة الزوم', min: 1.0, max: 1.5, step: 0.02, defaultValue: 1.28 },
      { key: 'shakeStrength', label: 'شدة الاهتزاز', min: 0, max: 2.0, step: 0.1, defaultValue: 1.0 },
    ],
  },
  {
    id: 'neon-glow-aura',
    name: 'توهج النيون المزدوج (Neon Bloom)',
    description: 'هالة نيون مضيئة للنصوص بقلب نقي وإشعاع خارجي قابل للتلوين.',
    defaultPlacement: 'behind-text',
    params: [
      { key: 'power', label: 'سطوع الهالة', min: 0.4, max: 1.8, step: 0.1, defaultValue: 1.0 },
    ],
  },
  {
    id: 'beat-bloom',
    name: 'وميض النبضة (Beat Bloom Flash)',
    description: 'توهج إضاءة دافئ وسطوع متصاعد متزامن مع الإيقاع.',
    defaultPlacement: 'above-clip',
    params: [
      { key: 'brightness', label: 'ذروة السطوع', min: 1.1, max: 2.4, step: 0.05, defaultValue: 1.8 },
    ],
  },
  {
    id: 'geometric-dissolve',
    name: 'تلاشي الأشكال الهندسية (Geo Facets)',
    description: 'شظايا ومضلعات هندسية شفافة بحواف مضيئة فوق اللقطة.',
    defaultPlacement: 'above-clip',
    params: [
      { key: 'opacity', label: 'وضوح الأشكال', min: 0.2, max: 1.4, step: 0.1, defaultValue: 1.0 },
    ],
  },
  {
    id: 'rotational-zoom-blur',
    name: 'روتيشن زوم بلور (Spin Zoom Blur)',
    description: 'تمويه حركي دائري وشعاعي على كامل الكادر باستخدام WebGL.',
    defaultPlacement: 'above-text',
    params: [
      { key: 'strength', label: 'قوة التمويه', min: 0.2, max: 1.6, step: 0.1, defaultValue: 1.0 },
    ],
  },
  {
    id: 'chromatic-aberration',
    name: 'انفصال الألوان (Chromatic Split)',
    description: 'تشتيت لوني بصري RGB على الحواف عند الحركة السريعة.',
    defaultPlacement: 'above-text',
    params: [
      { key: 'spread', label: 'مسافة التشتيت', min: 1, max: 16, step: 0.5, unit: 'px', defaultValue: 6 },
    ],
  },
  {
    id: 'handheld-shake',
    name: 'اهتزاز كاميرا إضافي (Camera Shake)',
    description: 'حركة اهتزاز عضوية مستمرة تُضاف على اللقطة أو النص.',
    defaultPlacement: 'above-clip',
    params: [
      { key: 'amount', label: 'مدى الاهتزاز', min: 1, max: 20, step: 1, unit: 'px', defaultValue: 6 },
    ],
  },
];

export function getTransitionDef(id: TransitionModuleId): TransitionModuleDef {
  return TRANSITION_REGISTRY.find((t) => t.id === id) ?? TRANSITION_REGISTRY[0];
}

export function getEffectDef(id: EffectModifierId): EffectModifierDef {
  return EFFECT_MODIFIER_REGISTRY.find((e) => e.id === id) ?? EFFECT_MODIFIER_REGISTRY[0];
}

export function createDefaultValues(params: SliderParamDef[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of params) {
    out[p.key] = p.defaultValue;
  }
  return out;
}

export function createDefaultToggles(toggles?: ToggleParamDef[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!toggles) return out;
  for (const t of toggles) {
    out[t.key] = t.defaultValue;
  }
  return out;
}

export function createDefaultSelects(selects?: SelectParamDef[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!selects) return out;
  for (const s of selects) {
    out[s.key] = s.defaultValue;
  }
  return out;
}

export function createEffectInstance(
  effectId: EffectModifierId,
  placementOverride?: EffectLayerPlacement,
  targetTextSlot?: TextTargetSlot
): AttachedEffectInstance {
  const def = getEffectDef(effectId);
  return {
    instanceId: `fx-${effectId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    effectId,
    placement: placementOverride ?? def.defaultPlacement,
    targetTextSlot,
    enabled: true,
    values: createDefaultValues(def.params),
  };
}

export function createClipAssignment(transitionId: TransitionModuleId): ClipTransitionAssignment {
  const def = getTransitionDef(transitionId);
  const effects: AttachedEffectInstance[] = [];

  if (transitionId === 'cosmic_slide_3d') {
    effects.push(createEffectInstance('picture-glow-shadow-feather', 'behind-clip'));
    effects.push(createEffectInstance('starfield-lens-flare', 'behind-clip'));
  } else if (transitionId === 'focus_pulse_shake') {
    effects.push(createEffectInstance('focus-pulse-shake', 'above-clip'));
  } else if (transitionId === 'master-3d-neon-whip') {
    effects.push(createEffectInstance('beat-bloom', 'above-clip'));
  } else if (transitionId === 'smooth-zoom-out-tilt') {
    effects.push(createEffectInstance('rotational-zoom-blur', 'above-text'));
  } else if (transitionId === 'fake-zoom-geo-slide') {
    effects.push(createEffectInstance('geometric-dissolve', 'above-clip'));
  }

  return {
    transitionId,
    values: createDefaultValues(def.params),
    toggles: createDefaultToggles(def.toggles),
    selects: createDefaultSelects(def.selects),
    effects,
  };
}

export function createDefaultTextEffects(): AttachedEffectInstance[] {
  return [createEffectInstance('neon-glow-aura', 'behind-text', 'neonTitle')];
}

export function canAddEffectWithoutWarning(currentCount: number): boolean {
  return currentCount < SOFT_CAP_EFFECTS;
}

export function reorderEffectsList(
  list: AttachedEffectInstance[],
  index: number,
  direction: 'up' | 'down'
): AttachedEffectInstance[] {
  const targetIdx = direction === 'up' ? index - 1 : index + 1;
  if (targetIdx < 0 || targetIdx >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(targetIdx, 0, item);
  return copy;
}

export function cycleEffectPlacement(
  current: EffectLayerPlacement,
  direction: 'up' | 'down'
): EffectLayerPlacement {
  const order: EffectLayerPlacement[] = [
    'behind-clip',
    'above-clip',
    'behind-text',
    'above-text',
  ];
  const idx = order.indexOf(current);
  const nextIdx = direction === 'up' ? Math.min(order.length - 1, idx + 1) : Math.max(0, idx - 1);
  return order[nextIdx];
}
