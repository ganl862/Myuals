import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createImageClip,
  createVideoClip,
  getEffectiveClipDuration,
  mapProgressToClipTimeSec,
  reorderClips,
  resolveCanvasDimensions,
  updateClipTrim,
  updateImageClipDuration,
} from './mediaTimeline';
import { computeAutoFontSize, isRtlText } from './typography';

test('static images default to 3.0s clip duration and update cleanly', () => {
  const img = createImageClip('1', 'frame.png', 'blob:1', 1080, 1920);
  assert.equal(img.imageDurationSec, 3.0);
  assert.equal(getEffectiveClipDuration(img), 3.0);

  const updated = updateImageClipDuration(img, 5.5);
  assert.equal(updated.imageDurationSec, 5.5);
  assert.equal(updated.trimEndSec, 5.5);
  assert.equal(getEffectiveClipDuration(updated), 5.5);
});

test('trim start/end and progress mapping stay bounded', () => {
  const vid = createVideoClip('v1', 'clip.mp4', 'blob:v1', 1920, 1080, 10);
  const trimmed = updateClipTrim(vid, 2.0, 6.0);
  assert.equal(getEffectiveClipDuration(trimmed), 4.0);
  assert.equal(mapProgressToClipTimeSec(trimmed, 0), 2.0);
  assert.equal(mapProgressToClipTimeSec(trimmed, 0.5), 4.0);
  assert.equal(mapProgressToClipTimeSec(trimmed, 1), 6.0);
});

test('reorderClips swaps clip order cleanly', () => {
  const a = createImageClip('a', 'A', 'blob:a', 720, 1280);
  const b = createImageClip('b', 'B', 'blob:b', 720, 1280);
  const c = createImageClip('c', 'C', 'blob:c', 720, 1280);
  const reordered = reorderClips([a, b, c], 0, 2);
  assert.deepEqual(
    reordered.map((x) => x.id),
    ['b', 'c', 'a']
  );
});

test('resolveCanvasDimensions matches auto, 9:16, 1:1, and 16:9', () => {
  const wide = createImageClip('w', 'W', 'blob:w', 1920, 1080);
  assert.deepEqual(resolveCanvasDimensions('9:16', wide), {
    width: 720,
    height: 1280,
    aspectRatio: 9 / 16,
  });
  assert.deepEqual(resolveCanvasDimensions('1:1', wide), {
    width: 1080,
    height: 1080,
    aspectRatio: 1,
  });
  assert.deepEqual(resolveCanvasDimensions('16:9', wide), {
    width: 1280,
    height: 720,
    aspectRatio: 16 / 9,
  });
  const autoWide = resolveCanvasDimensions('auto', wide);
  assert.equal(autoWide.width, 1280);
  assert.equal(autoWide.height, 720);
});

test('Arabic RTL detection and auto-scaling prevent clipping', () => {
  assert.equal(isRtlText('أبا الفضل'), true);
  assert.equal(isRtlText('Neon Whip'), false);

  const shrunk = computeAutoFontSize('أبا الفضل المقدام في الميدان', 96, 360, true, 1.0);
  assert.ok(shrunk < 96, `Expected long phrase to auto-shrink below 96px, got ${shrunk}`);
  assert.ok(shrunk >= 16);
});
