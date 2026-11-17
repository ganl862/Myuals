import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_DURATION_MS,
  TOTAL_FRAMES,
  EDITORIAL_CURVES,
  computeTimelineState,
  cubicBezier,
  cubicBezierVelocity,
  dampedSpring,
  impulseSpring,
  DEFAULT_MOTION_PARAMS,
} from './motionMath';

test('cubicBezier endpoints and monotonicity for (0.16, 1, 0.3, 1)', () => {
  assert.equal(cubicBezier(0.16, 1, 0.3, 1, 0), 0);
  assert.equal(cubicBezier(0.16, 1, 0.3, 1, 1), 1);
  const mid = cubicBezier(0.16, 1, 0.3, 1, 0.5);
  assert.ok(mid > 0.8 && mid < 1.0, `Expected fast ease-out near 0.9+, got ${mid}`);
});

test('editorial cubicBezierVelocity peaks smoothly and impulseSpring starts at 0 with C0 continuity', () => {
  const [p1x, p1y, p2x, p2y] = EDITORIAL_CURVES.heavyWhipOut;
  const vStart = cubicBezierVelocity(p1x, p1y, p2x, p2y, 0.05);
  const vEnd = cubicBezierVelocity(p1x, p1y, p2x, p2y, 0.92);
  assert.ok(vEnd > vStart, `Expected whip-out velocity to accelerate: start=${vStart}, end=${vEnd}`);

  assert.equal(impulseSpring(0, 240, 20), 0);
  const peak = impulseSpring(0.08, 240, 20, 1, 40);
  assert.ok(Math.abs(peak) > 0.5);
  assert.ok(Math.abs(impulseSpring(0.7, 240, 20, 1, 40)) < 0.05);

  const beforeLock = computeTimelineState(3049);
  const afterLock = computeTimelineState(3051);
  assert.ok(
    Math.abs(afterLock.card2TranslateXPercent - beforeLock.card2TranslateXPercent) < 1.5,
    `Expected smooth C0 continuity at 3050ms, delta=${Math.abs(afterLock.card2TranslateXPercent - beforeLock.card2TranslateXPercent)}`
  );
});

test('custom chromaticBoost and tiltSwingDeg modulate Phase 5 output cleanly', () => {
  const subtle = computeTimelineState(3850, {
    ...DEFAULT_MOTION_PARAMS,
    tiltSwingDeg: 4,
    chromaticBoost: 0.5,
  });
  const hard = computeTimelineState(3850, {
    ...DEFAULT_MOTION_PARAMS,
    tiltSwingDeg: 15,
    chromaticBoost: 1.8,
  });
  assert.ok(Math.abs(hard.scene2CameraTiltDeg) > Math.abs(subtle.scene2CameraTiltDeg));
  assert.ok(hard.chromaticSplitPx > subtle.chromaticSplitPx);
});

test('dampedSpring starts at 1 and settles close to 0 with overshoot', () => {
  assert.equal(dampedSpring(0, 240, 20), 1);
  const early = dampedSpring(0.12, 240, 20);
  const settled = dampedSpring(0.5, 240, 20);
  assert.ok(Math.abs(settled) < 0.05, `Expected settled spring < 0.05, got ${settled}`);
  assert.notEqual(early, settled);
});

test('Phase 1: Fake Zoom-Out + Real Zoom-In at 0ms, then Beat Flash + Slide & Geometric Dissolve at 816-1400ms', () => {
  const f1 = computeTimelineState(0);
  assert.equal(f1.phase, 1);
  assert.equal(f1.frame, 1);
  assert.equal(f1.word1Opacity, 1);
  assert.equal(f1.word2Opacity, 0);
  assert.ok(f1.clip1FakeZoomScale < 0.9, 'Fake zoom-out should pull inner tile back at 0ms');
  assert.equal(f1.clip1RealZoomScale, 1.0);

  const f49 = computeTimelineState(816);
  assert.equal(f49.phase, 1);
  assert.ok(
    Math.abs(f49.beatBloomBrightness - DEFAULT_MOTION_PARAMS.beatBloomPeakBrightness) < 0.05,
    `Expected ~1.8 brightness at 816ms, got ${f49.beatBloomBrightness}`
  );
  assert.ok(f49.clip1RealZoomScale > 1.05, 'Real zoom-in should push inward');

  const geoMid = computeTimelineState(1350);
  assert.equal(geoMid.word2Opacity, 1);
  assert.ok(geoMid.geoDissolveAmount > 0.8, 'Geometric dissolve should be active during slide');
  assert.ok(Math.abs(geoMid.clip1SlideXPercent) > 3, 'Lateral slide should be active');
});

test('Phase 2: 1916-2350ms radial blur hits 14px, whiteout hits 1.0 at 2083ms, card shrinks to 0.62 & -8.5deg', () => {
  const peak = computeTimelineState(2083);
  assert.equal(peak.phase, 2);
  assert.ok(peak.radialBlurPx >= 13.5, `Expected ~14px radial blur, got ${peak.radialBlurPx}`);
  assert.ok(peak.whiteoutOpacity >= 0.98, `Expected ~1.0 whiteout blast at 2083ms, got ${peak.whiteoutOpacity}`);

  const endPhase2 = computeTimelineState(2350);
  assert.ok(Math.abs(endPhase2.card1Scale - 0.62) < 0.06, `Expected ~0.62 scale, got ${endPhase2.card1Scale}`);
  assert.ok(Math.abs(endPhase2.card1RotateZDeg - -8.5) < 2.2, `Expected ~-8.5deg tilt, got ${endPhase2.card1RotateZDeg}`);
  assert.equal(endPhase2.radialBlurPx, 0);
});

test('Phase 3: 2350-2850ms Card 1 settles with glowing border and Accent Symbol appears', () => {
  const settled = computeTimelineState(2783);
  assert.equal(settled.phase, 3);
  assert.ok(settled.card1BorderGlow > 0.95);
  assert.ok(settled.accentOpacity > 0.95);
  assert.ok(Math.abs(settled.card1Scale - 0.62) < 0.02);
  assert.ok(Math.abs(settled.card1RotateZDeg - -8.5) < 0.6);
});

test('Phase 4: 2850-2966ms Card 1 whip-slides right to +160% with up to 24px horizontal blur', () => {
  const midWhip = computeTimelineState(2916);
  assert.equal(midWhip.phase, 4);
  assert.ok(midWhip.card1TranslateXPercent > 40);
  assert.ok(midWhip.horizontalMotionBlurPx > 14);

  const endWhip = computeTimelineState(2966);
  assert.ok(Math.abs(endWhip.card1TranslateXPercent - 160) < 0.1);
  assert.ok(Math.abs(endWhip.horizontalMotionBlurPx - 24) < 0.5);
});

test('Phase 5: Smooth Zoom-Out Card 2 + Tilted Title Entrance + Cosmic Fire + Rotational Zoom Blur', () => {
  const startWhipIn = computeTimelineState(2983);
  assert.equal(startWhipIn.phase, 5);
  assert.equal(startWhipIn.showClip2, true);
  assert.ok(startWhipIn.card2TranslateXPercent <= -150);

  const titleEnter = computeTimelineState(3120);
  assert.ok(titleEnter.neonTitleRotateDeg < -5, 'Title should enter with tilt rotation');

  const locked = computeTimelineState(3500);
  assert.equal(locked.phase, 5);
  assert.ok(Math.abs(locked.card2TranslateXPercent) < 2.5);
  assert.equal(locked.neonTitleOpacity, 1);
  assert.ok(locked.neonGlowAlpha >= 0.95);
  assert.ok(locked.cosmicFireIntensity >= 0.95, 'Cosmic fire should burn strongly behind Neon Title');
  assert.ok(locked.card2Scale < startWhipIn.card2Scale, 'Card 2 should continuously zoom out smoothly');

  const finale = computeTimelineState(3850);
  assert.ok(Math.abs(finale.scene2CameraTiltDeg) > 2.5, 'Finale whole-shot tilt animation should be active');
  assert.ok(finale.rotationalBlurAngleRad > 0.02, 'WebGL rotational blur should be active');
  assert.ok(finale.rotationalZoomAmount > 0.02, 'WebGL radial zoom blur should be active');

  const outro = computeTimelineState(TOTAL_DURATION_MS);
  assert.equal(outro.frame, TOTAL_FRAMES);
});
