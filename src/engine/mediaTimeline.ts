export type AspectRatioOption = 'auto' | '9:16' | '1:1' | '16:9';

export type MediaKind = 'image' | 'video' | 'procedural';

export interface MediaClipItem {
  id: string;
  name: string;
  kind: MediaKind;
  srcUrl?: string;
  width: number;
  height: number;
  /** Original video duration in seconds (for images, tracks adjustable duration) */
  sourceDurationSec: number;
  /** Default 3.0s for uploaded static images; adjustable via slider */
  imageDurationSec: number;
  /** Trim start in seconds */
  trimStartSec: number;
  /** Trim end in seconds */
  trimEndSec: number;
  /** Procedural palette variant when using built-in offline demo clips */
  demoVariant?: 'amber-sculpt' | 'crimson-silk' | 'obsidian-gold';
}

export const DEFAULT_IMAGE_DURATION_SEC = 3.0;
export const MIN_CLIP_DURATION_SEC = 0.5;
export const MAX_IMAGE_DURATION_SEC = 10.0;

export function createImageClip(
  id: string,
  name: string,
  srcUrl: string,
  width: number,
  height: number,
  durationSec = DEFAULT_IMAGE_DURATION_SEC
): MediaClipItem {
  const safeDur = Math.max(MIN_CLIP_DURATION_SEC, Math.min(MAX_IMAGE_DURATION_SEC, durationSec));
  return {
    id,
    name,
    kind: 'image',
    srcUrl,
    width: Math.max(1, width),
    height: Math.max(1, height),
    sourceDurationSec: safeDur,
    imageDurationSec: safeDur,
    trimStartSec: 0,
    trimEndSec: safeDur,
  };
}

export function createVideoClip(
  id: string,
  name: string,
  srcUrl: string,
  width: number,
  height: number,
  durationSec: number
): MediaClipItem {
  const safeDur = Math.max(MIN_CLIP_DURATION_SEC, durationSec || 3.0);
  return {
    id,
    name,
    kind: 'video',
    srcUrl,
    width: Math.max(1, width),
    height: Math.max(1, height),
    sourceDurationSec: safeDur,
    imageDurationSec: safeDur,
    trimStartSec: 0,
    trimEndSec: safeDur,
  };
}

export function getEffectiveClipDuration(clip: MediaClipItem): number {
  const rawEnd = clip.kind === 'image' ? Math.min(clip.trimEndSec, clip.imageDurationSec) : clip.trimEndSec;
  return Math.max(0.2, rawEnd - clip.trimStartSec);
}

export function updateImageClipDuration(clip: MediaClipItem, newDurationSec: number): MediaClipItem {
  if (clip.kind !== 'image') return clip;
  const clamped = Math.max(MIN_CLIP_DURATION_SEC, Math.min(MAX_IMAGE_DURATION_SEC, newDurationSec));
  const nextTrimStart = Math.min(clip.trimStartSec, Math.max(0, clamped - 0.2));
  const nextTrimEnd =
    clip.trimEndSec >= clip.imageDurationSec - 0.05
      ? clamped
      : Math.max(nextTrimStart + 0.2, Math.min(clamped, clip.trimEndSec));

  return {
    ...clip,
    sourceDurationSec: clamped,
    imageDurationSec: clamped,
    trimStartSec: Number(nextTrimStart.toFixed(2)),
    trimEndSec: Number(nextTrimEnd.toFixed(2)),
  };
}

export function updateClipTrim(
  clip: MediaClipItem,
  trimStartSec: number,
  trimEndSec: number
): MediaClipItem {
  const maxDur = clip.kind === 'image' ? clip.imageDurationSec : clip.sourceDurationSec;
  const minSpan = Math.min(0.2, maxDur);
  const clampedStart = Math.max(0, Math.min(maxDur - minSpan, trimStartSec));
  const clampedEnd = Math.max(clampedStart + minSpan, Math.min(maxDur, trimEndSec));
  return {
    ...clip,
    trimStartSec: Number(clampedStart.toFixed(2)),
    trimEndSec: Number(clampedEnd.toFixed(2)),
  };
}

export function reorderClips(
  clips: MediaClipItem[],
  fromIndex: number,
  toIndex: number
): MediaClipItem[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= clips.length ||
    toIndex >= clips.length ||
    fromIndex === toIndex
  ) {
    return clips;
  }
  const copy = [...clips];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

/**
 * Given a normalized progress (0..1) through a clip's transition slot,
 * compute the exact source media timestamp (in seconds) respecting Trim Start/End.
 */
export function mapProgressToClipTimeSec(clip: MediaClipItem, progress01: number): number {
  const p = progress01 < 0 ? 0 : progress01 > 1 ? 1 : progress01;
  const span = getEffectiveClipDuration(clip);
  return clip.trimStartSec + p * span;
}

export interface CanvasDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Resolves export/render canvas dimensions at crisp HD/vertical resolution
 * based on user aspect ratio selection.
 */
export function resolveCanvasDimensions(
  mode: AspectRatioOption,
  primaryClip?: MediaClipItem
): CanvasDimensions {
  if (mode === '9:16') {
    return { width: 720, height: 1280, aspectRatio: 9 / 16 };
  }
  if (mode === '1:1') {
    return { width: 1080, height: 1080, aspectRatio: 1 };
  }
  if (mode === '16:9') {
    return { width: 1280, height: 720, aspectRatio: 16 / 9 };
  }

  // 'auto': match primary clip aspect ratio within a 720p-class pixel budget
  const srcW = primaryClip?.width || 720;
  const srcH = primaryClip?.height || 1280;
  const ratio = srcW / srcH;

  if (ratio <= 0.75) {
    const width = 720;
    const height = Math.round(width / ratio / 2) * 2;
    return { width, height: Math.min(1440, Math.max(720, height)), aspectRatio: ratio };
  }
  if (ratio >= 1.33) {
    const height = 720;
    const width = Math.round((height * ratio) / 2) * 2;
    return { width: Math.min(1440, Math.max(720, width)), height, aspectRatio: ratio };
  }
  const base = 960;
  if (ratio >= 1) {
    const h = Math.round(base / ratio / 2) * 2;
    return { width: base, height: h, aspectRatio: ratio };
  } else {
    const w = Math.round(base * ratio / 2) * 2;
    return { width: w, height: base, aspectRatio: ratio };
  }
}

export function createDefaultDemoClips(): MediaClipItem[] {
  return [
    {
      id: 'demo-clip-1',
      name: 'Clip 1 · Warm Sculpt',
      kind: 'procedural',
      width: 720,
      height: 1280,
      sourceDurationSec: 3.0,
      imageDurationSec: 3.0,
      trimStartSec: 0,
      trimEndSec: 3.0,
      demoVariant: 'amber-sculpt',
    },
    {
      id: 'demo-clip-2',
      name: 'Clip 2 · Crimson Silk',
      kind: 'procedural',
      width: 720,
      height: 1280,
      sourceDurationSec: 3.0,
      imageDurationSec: 3.0,
      trimStartSec: 0,
      trimEndSec: 3.0,
      demoVariant: 'crimson-silk',
    },
  ];
}
