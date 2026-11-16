export interface TextLayerConfig {
  introWord1: string;
  introWord2: string;
  accentSymbol: string;
  neonTitle: string;
  autoScale: boolean;
  fontScaleMultiplier: number; // 0.6..1.5
  customFontFamily: string | null;
  customFontName: string | null;
}

export const DEFAULT_TEXT_CONFIG: TextLayerConfig = {
  introWord1: 'جف',
  introWord2: 'ونحر',
  accentSymbol: 'ع',
  neonTitle: 'أبا الفضل',
  autoScale: true,
  fontScaleMultiplier: 1.0,
  customFontFamily: null,
  customFontName: null,
};

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function isRtlText(text: string): boolean {
  return ARABIC_CHAR_REGEX.test(text);
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
    // Iterative shrink-to-fit using real canvas measureText when available
    for (let i = 0; i < 16; i++) {
      const measured = measureTextWidth(size);
      if (measured <= safeMaxWidth || size <= 16) break;
      const ratio = safeMaxWidth / Math.max(1, measured);
      size = Math.max(16, size * Math.min(0.94, ratio * 0.98));
    }
    return Math.round(size);
  }

  // Deterministic fallback heuristic for pure unit tests / offscreen estimates
  const avgGlyphRatio = isRtlText(text) ? 0.56 : 0.62;
  const estimatedWidth = text.length * size * avgGlyphRatio;
  if (estimatedWidth > safeMaxWidth) {
    size = Math.max(16, (safeMaxWidth / Math.max(1, text.length * avgGlyphRatio)) * 0.96);
  }
  return Math.round(size);
}

export function getResolvedFontFamily(customFontFamily: string | null, isArabic: boolean): string {
  if (customFontFamily) {
    return `"${customFontFamily}", "Amiri", "Noto Naskh Arabic", "Geeza Pro", "Plus Jakarta Sans", system-ui, sans-serif`;
  }
  if (isArabic) {
    return `"Amiri", "Noto Naskh Arabic", "Geeza Pro", "Cairo", "Tahoma", system-ui, serif`;
  }
  return `"Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif`;
}
