export interface TextLayerConfig {
  // Existing 3D Neon Whip / Smooth Zoom-Out / Fake Zoom text layers
  introWord1: string;
  introWord2: string;
  accentSymbol: string;
  neonTitle: string;
  word1Color: string;
  word2Color: string;
  accentColor: string;
  neonCoreColor: string;
  neonGlowColor: string;

  // Karbala Cosmic Slide (cosmic_slide_3d) text layers
  cosmicTitleText: string;
  cosmicLine1Text: string;
  cosmicLine2Text: string;
  cosmicCreditText: string;
  cosmicCreditEnabled: boolean;
  cosmicAccentColor: string;
  cosmicLine1Color: string;

  autoScale: boolean;
  fontScaleMultiplier: number; // 0.6..1.5
  customFontFamily: string | null;
  customFontName: string | null;
}

export const TEXT_COLOR_SWATCHES: Array<{ label: string; hex: string }> = [
  { label: 'أبيض نقي', hex: '#FFFFFF' },
  { label: 'أحمر كربلائي', hex: '#FF2D2D' },
  { label: 'وردي نيون', hex: '#FF1493' },
  { label: 'ماجنتا مشرق', hex: '#FF4D9E' },
  { label: 'ذهبي دافئ', hex: '#FFD166' },
  { label: 'سماوي ثلجي', hex: '#38BDF8' },
  { label: 'ناري برتقالي', hex: '#FF6B35' },
  { label: 'بنفسجي كوني', hex: '#A855F7' },
];

export const DEFAULT_TEXT_CONFIG: TextLayerConfig = {
  introWord1: 'جف',
  introWord2: 'ونحر',
  accentSymbol: 'ع',
  neonTitle: 'أبا الفضل',
  word1Color: '#FFFFFF',
  word2Color: '#FF4D9E',
  accentColor: '#FFFFFF',
  neonCoreColor: '#FFFFFF',
  neonGlowColor: '#FF1493',

  cosmicTitleText: 'كربلاء',
  cosmicLine1Text: 'دار النوايب',
  cosmicLine2Text: 'والبلى',
  cosmicCreditText: 'الايدتور الحسيني كاسدو',
  cosmicCreditEnabled: true,
  cosmicAccentColor: '#FF2D2D',
  cosmicLine1Color: '#FFFFFF',

  autoScale: true,
  fontScaleMultiplier: 1.0,
  customFontFamily: null,
  customFontName: null,
};

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function isRtlText(text: string): boolean {
  return ARABIC_CHAR_REGEX.test(text);
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return `rgba(255, 20, 147, ${alpha})`;
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Computes an auto-scaled font size in px that fits safely within maxWidthPx
 * without clipping, respecting RTL/Arabic glyph width heuristics and user multiplier.
 */
export function computeAutoFontSize(
  text: string,
  baseSizePx: number,
  maxWidthPx: number,
  autoScale: boolean,
  multiplier = 1.0,
  measureTextWidth?: (fontSizePx: number) => number
): number {
  const scaledBase = Math.max(14, baseSizePx * multiplier);
  if (!autoScale || !text.trim()) {
    return Math.round(scaledBase);
  }

  let size = scaledBase;
  const safeMaxWidth = Math.max(40, maxWidthPx);

  if (measureTextWidth) {
    for (let i = 0; i < 16; i++) {
      const measured = measureTextWidth(size);
      if (measured <= safeMaxWidth || size <= 16) break;
      const ratio = safeMaxWidth / Math.max(1, measured);
      size = Math.max(16, size * Math.min(0.94, ratio * 0.98));
    }
    return Math.round(size);
  }

  const avgGlyphRatio = isRtlText(text) ? 0.56 : 0.62;
  const estimatedWidth = text.length * size * avgGlyphRatio;
  if (estimatedWidth > safeMaxWidth) {
    size = Math.max(16, (safeMaxWidth / Math.max(1, text.length * avgGlyphRatio)) * 0.96);
  }
  return Math.round(size);
}

export function getResolvedFontFamily(customFontFamily: string | null, isArabic: boolean): string {
  if (customFontFamily) {
    return `"${customFontFamily}", "Noto Naskh Arabic", "Cairo", Tahoma, sans-serif`;
  }
  if (isArabic) {
    return `"Noto Naskh Arabic", "Cairo", "Amiri", Tahoma, sans-serif`;
  }
  return `"Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif`;
}
