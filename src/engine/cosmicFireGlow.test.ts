import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFirePalette,
  computeCosmicFireEnvelope,
  DEFAULT_COSMIC_FIRE_GLOW_PARAMS,
  evaluateFireColorRamp,
  fbmNoise3D,
  splitTrailingHeart,
} from './cosmicFireGlow';
import { createEffectInstance, getEffectDef, getTransitionDef } from './registry';

test('Cosmic Fire Glow FBM noise is 100% deterministic and scrolls smoothly', () => {
  const n1 = fbmNoise3D(1.5, 2.5, 0.4, 1337, 3);
  const n2 = fbmNoise3D(1.5, 2.5, 0.4, 1337, 3);
  const nScrolled = fbmNoise3D(1.5, 3.2, 0.6, 1337, 3);

  assert.equal(n1, n2);
  assert.ok(n1 >= 0 && n1 <= 1);
  assert.notEqual(n1, nScrolled);
});

test('Cosmic Fire Glow density color ramp matches exact crimson stops and dark blotch holes', () => {
  const palette = buildFirePalette('crimson', '#D81B45');
  assert.deepEqual(palette.core, { r: 255, g: 74, b: 106 }); // #FF4A6A
  assert.deepEqual(palette.bodyMid, { r: 216, g: 27, b: 69 }); // #D81B45

  const empty = evaluateFireColorRamp(0.1, 0.5, palette, true);
  assert.equal(empty.a, 0);

  const core = evaluateFireColorRamp(0.9, 0.5, palette, true);
  assert.equal(core.r, 255);
  assert.equal(core.g, 74);
  assert.equal(core.b, 106);
  assert.equal(core.a, 0.9);

  const withHole = evaluateFireColorRamp(0.7, 0.05, palette, true);
  const withoutHole = evaluateFireColorRamp(0.7, 0.05, palette, false);
  assert.ok(withHole.a < withoutHole.a);
  assert.ok(withHole.r < withoutHole.r);

  const bluePalette = buildFirePalette('cosmic-blue', '#38BDF8');
  assert.ok(bluePalette.core.b > bluePalette.core.r);
});

test('Cosmic Fire Glow envelope implements ±8% breathing, 30fps look, and optional intro/outro', () => {
  const e0 = computeCosmicFireEnvelope(0, 4.0, DEFAULT_COSMIC_FIRE_GLOW_PARAMS);
  const ePeak = computeCosmicFireEnvelope(0.2, 4.0, DEFAULT_COSMIC_FIRE_GLOW_PARAMS); // sin(pi/2) = +1
  assert.equal(e0.envelopeAlpha, 1);
  assert.ok(Math.abs(ePeak.breathingScale - 1.08) < 1e-6);

  const e30 = computeCosmicFireEnvelope(0.111, 4.0, {
    ...DEFAULT_COSMIC_FIRE_GLOW_PARAMS,
    look30fps: true,
  });
  assert.equal(e30.quantizedTimeSec, Math.floor(0.111 * 30) / 30);

  const eIntro = computeCosmicFireEnvelope(0.1, 4.0, {
    ...DEFAULT_COSMIC_FIRE_GLOW_PARAMS,
    introSec: 0.4,
  });
  assert.ok(eIntro.envelopeAlpha > 0 && eIntro.envelopeAlpha < 0.7);
  assert.ok(eIntro.envelopeOffsetY > 0);
});

test('splitTrailingHeart cleanly isolates Arabic text + digits from trailing heart emoji', () => {
  const split = splitTrailingHeart('عاشوراء 2025❤️');
  assert.equal(split.mainText, 'عاشوراء 2025');
  assert.equal(split.hasHeart, true);

  const plain = splitTrailingHeart('دار النوايب');
  assert.equal(plain.mainText, 'دار النوايب');
  assert.equal(plain.hasHeart, false);
});

test('Registry defines cosmic_fire_glow modifier and unified cosmic_slide_3d Focus-Pulse params', () => {
  const fxDef = getEffectDef('cosmic_fire_glow');
  assert.equal(fxDef.id, 'cosmic_fire_glow');
  assert.equal(fxDef.supportsColor, true);

  const inst = createEffectInstance('cosmic_fire_glow', 'behind-text', 'overlayText');
  assert.equal(inst.effectId, 'cosmic_fire_glow');
  assert.equal(inst.targetTextSlot, 'overlayText');
  assert.equal(inst.toggles?.smokeEnabled, true);
  assert.equal(inst.toggles?.holesEnabled, true);
  assert.equal(inst.toggles?.look30fps, false);
  assert.equal(inst.selects?.preset, 'crimson');

  const cosmicDef = getTransitionDef('cosmic_slide_3d');
  assert.ok(cosmicDef.params.some((p) => p.key === 'zoomPunchAmount'));
  assert.ok(cosmicDef.params.some((p) => p.key === 'shakeStrength'));
  assert.ok(cosmicDef.toggles?.some((t) => t.key === 'focusPulseEnabled'));
  assert.ok(cosmicDef.toggles?.some((t) => t.key === 'shakeEnabled'));
});
