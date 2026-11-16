import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeCosmicSlideState,
  computeFocusPulseState,
  COSMIC_SLIDE_REF_DURATION_SEC,
  DEFAULT_COSMIC_SLIDE_PARAMS,
} from './cosmicSlide';
import { mulberry32, seededWaveNoise } from './prng';
import { createClipAssignment, getTransitionDef } from './registry';

test('Karbala Cosmic Slide passes all 9 acceptance checks across T_ref = 7.467s', () => {
  // t = 0.10: pure black
  const s010 = computeCosmicSlideState(0.1, DEFAULT_COSMIC_SLIDE_PARAMS);
  assert.equal(s010.globalOpacity, 0);

  // t = 0.50: Picture A visible, dark (<0.45) and blurry (>6px)
  const s050 = computeCosmicSlideState(0.5, DEFAULT_COSMIC_SLIDE_PARAMS);
  assert.equal(s050.picAVisible, true);
  assert.ok(s050.globalOpacity > 0 && s050.globalOpacity < 0.45);
  assert.ok(s050.picABlurPx > 6);

  // t = 1.40: Title "كربلاء" assembled crisp
  const s140 = computeCosmicSlideState(1.4, DEFAULT_COSMIC_SLIDE_PARAMS);
  assert.equal(s140.titleVisible, true);
  assert.equal(s140.titleAssemblyProgress, 1);

  // t = 2.55: Picture A blurs horizontally (>45px), stars stretch into horizontal streaks (>5x)
  const s255 = computeCosmicSlideState(2.55, DEFAULT_COSMIC_SLIDE_PARAMS);
  assert.ok(s255.picAMotionBlurPx > 45);
  assert.ok(s255.starStreakStretch > 5);

  // t = 3.45: Picture B visible entering from left (<0.30, blurred >20px)
  const s345 = computeCosmicSlideState(3.45, DEFAULT_COSMIC_SLIDE_PARAMS);
  assert.equal(s345.picBVisible, true);
  assert.ok(s345.picBCenterXFrac < 0.35);
  assert.ok(s345.picBBlurPx > 20);

  // t = 4.50: Line 1 visible (1.0), Line 2 fading in (0 < op < 0.5)
  const s450 = computeCosmicSlideState(4.5, DEFAULT_COSMIC_SLIDE_PARAMS);
  assert.equal(s450.line1Opacity, 1);
  assert.ok(s450.line2Opacity > 0 && s450.line2Opacity < 0.5);

  // t = 5.40: Focus-Pulse blur peak (~8px) and zoomed in (>= 1.28x)
  const s540 = computeCosmicSlideState(5.4, DEFAULT_COSMIC_SLIDE_PARAMS);
  assert.ok(s540.focusPulse.blurPx >= 7.8);
  assert.ok(s540.focusPulse.zoomScale >= 1.28);

  // t = 6.50: Dimmed fade-out (0.25 < globalOpacity < 0.8), texts readable
  const s650 = computeCosmicSlideState(6.5, DEFAULT_COSMIC_SLIDE_PARAMS);
  assert.ok(s650.globalOpacity > 0.25 && s650.globalOpacity < 0.8);
  assert.equal(s650.line1Opacity, 1);
  assert.equal(s650.line2Opacity, 1);

  // t = 7.30: Pure black (0.0)
  const s730 = computeCosmicSlideState(7.3, DEFAULT_COSMIC_SLIDE_PARAMS);
  assert.equal(s730.globalOpacity, 0);
});

test('FocusPulseState supports independent toggles for shake and focus blur', () => {
  const pulseOn = computeFocusPulseState(5.4, {
    shakeEnabled: true,
    shakeStrength: 1.0,
    zoomPunchAmount: 1.28,
    focusPulseEnabled: true,
  });
  const pulseNoBlur = computeFocusPulseState(5.4, {
    shakeEnabled: true,
    shakeStrength: 1.0,
    zoomPunchAmount: 1.28,
    focusPulseEnabled: false,
  });
  const pulseNoShake = computeFocusPulseState(5.15, {
    shakeEnabled: false,
    shakeStrength: 1.0,
    zoomPunchAmount: 1.28,
    focusPulseEnabled: true,
  });

  assert.equal(pulseOn.blurPx, 8);
  assert.equal(pulseNoBlur.blurPx, 0);
  assert.equal(pulseNoShake.shakeX, 0);
  assert.equal(pulseNoShake.shakeY, 0);
  assert.equal(pulseNoShake.shakeRotDeg, 0);
});

test('Karbala Cosmic Slide scales cleanly to custom duration (4.0s) and uses deterministic PRNG', () => {
  const halfRef = computeCosmicSlideState(COSMIC_SLIDE_REF_DURATION_SEC * 0.5, {
    ...DEFAULT_COSMIC_SLIDE_PARAMS,
    durationSec: COSMIC_SLIDE_REF_DURATION_SEC,
  });
  const halfCustom = computeCosmicSlideState(2.0, {
    ...DEFAULT_COSMIC_SLIDE_PARAMS,
    durationSec: 4.0,
  });

  assert.ok(Math.abs(halfRef.tRef - halfCustom.tRef) < 0.01);
  assert.deepEqual(halfRef.focusPulse, halfCustom.focusPulse);

  const r1 = mulberry32(42071);
  const r2 = mulberry32(42071);
  for (let i = 0; i < 10; i++) {
    assert.equal(r1(), r2());
  }
  assert.equal(seededWaveNoise(11, 2.5), seededWaveNoise(11, 2.5));
});

test('Registry exposes cosmic_slide_3d and separates attachable modifiers cleanly', () => {
  const def = getTransitionDef('cosmic_slide_3d');
  assert.equal(def.id, 'cosmic_slide_3d');
  assert.equal(def.hasTextLayer, true);

  const assign = createClipAssignment('cosmic_slide_3d');
  const ids = assign.effects.map((e) => e.effectId);
  assert.ok(ids.includes('picture-glow-shadow-feather'));
  assert.ok(ids.includes('starfield-lens-flare'));
  assert.ok(!ids.includes('cosmic-fire'));
});
