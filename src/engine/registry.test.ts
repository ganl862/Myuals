import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultDemoClips } from './mediaTimeline';
import {
  applyPacingPreset,
  canAddEffectWithoutWarning,
  createClipAssignment,
  createEffectInstance,
  createSequenceTransition,
  cycleEffectPlacement,
  deriveClipAssignmentsFromSequence,
  reorderEffectsList,
  SOFT_CAP_EFFECTS,
} from './registry';
import { DEFAULT_TEXT_CONFIG, hexToRgba } from './typography';

test('4-effect soft cap permits up to 4 without warning, warns on 5th', () => {
  assert.equal(SOFT_CAP_EFFECTS, 4);
  assert.equal(canAddEffectWithoutWarning(0), true);
  assert.equal(canAddEffectWithoutWarning(3), true);
  assert.equal(canAddEffectWithoutWarning(4), false);
  assert.equal(canAddEffectWithoutWarning(5), false);
});

test('per-clip assignments maintain independent transitions and effects', () => {
  const clip1 = createClipAssignment('fake-zoom-geo-slide');
  const clip2 = createClipAssignment('cinematic-shake-impact');

  assert.equal(clip1.transitionId, 'fake-zoom-geo-slide');
  assert.equal(clip2.transitionId, 'cinematic-shake-impact');
  assert.notDeepEqual(clip1.effects, clip2.effects);

  clip1.effects.push(createEffectInstance('cosmic-fire', 'behind-text'));
  assert.equal(clip2.effects.length, 0);
});

test('cohesive SequenceTransitionState syncs all clips while preserving independent per-clip effects', () => {
  const clips = createDefaultDemoClips();
  const base = createSequenceTransition('master-3d-neon-whip', 'balanced');
  assert.equal(base.pacingPreset, 'balanced');
  assert.equal(base.values.durationScale, 1.0);

  const fast = applyPacingPreset(base, 'fast-edit');
  assert.equal(fast.pacingPreset, 'fast-edit');
  assert.ok(fast.values.durationScale < 1.0, 'Fast edit accelerates timeline pacing');
  assert.ok(fast.values.whipBlurPx > base.values.whipBlurPx);

  const hard = applyPacingPreset(base, 'hard-edit');
  assert.equal(hard.pacingPreset, 'hard-edit');
  assert.ok(hard.values.chromaticSplit > base.values.chromaticSplit);
  assert.ok(hard.values.beatBrightness > base.values.beatBrightness);

  const customClip0Fx = [createEffectInstance('beat-bloom', 'above-clip')];
  const customClip1Fx = [createEffectInstance('chromatic-aberration', 'above-text')];
  const derived = deriveClipAssignmentsFromSequence(clips, hard, {
    [clips[0].id]: customClip0Fx,
    [clips[1].id]: customClip1Fx,
  });

  for (const c of clips) {
    assert.equal(derived[c.id].transitionId, 'master-3d-neon-whip');
    assert.equal(derived[c.id].values.chromaticSplit, hard.values.chromaticSplit);
  }
  assert.deepEqual(derived[clips[0].id].effects, customClip0Fx);
  assert.deepEqual(derived[clips[1].id].effects, customClip1Fx);
});

test('reorderEffectsList swaps items cleanly without mutating original array', () => {
  const a = createEffectInstance('cosmic-fire');
  const b = createEffectInstance('beat-bloom');
  const c = createEffectInstance('neon-glow-aura');
  const list = [a, b, c];

  const movedUp = reorderEffectsList(list, 1, 'up');
  assert.deepEqual(
    movedUp.map((x) => x.effectId),
    ['beat-bloom', 'cosmic-fire', 'neon-glow-aura']
  );

  const movedDown = reorderEffectsList(list, 1, 'down');
  assert.deepEqual(
    movedDown.map((x) => x.effectId),
    ['cosmic-fire', 'neon-glow-aura', 'beat-bloom']
  );

  // Boundary clamp returns same reference
  assert.equal(reorderEffectsList(list, 0, 'up'), list);
  assert.equal(reorderEffectsList(list, 2, 'down'), list);
});

test('cycleEffectPlacement moves smoothly across Z-index layers', () => {
  assert.equal(cycleEffectPlacement('behind-clip', 'up'), 'above-clip');
  assert.equal(cycleEffectPlacement('above-clip', 'up'), 'behind-text');
  assert.equal(cycleEffectPlacement('behind-text', 'up'), 'above-text');
  assert.equal(cycleEffectPlacement('above-text', 'down'), 'behind-text');
  assert.equal(cycleEffectPlacement('behind-clip', 'down'), 'behind-clip');
});

test('hexToRgba parses 6-char, 3-char, and falls back gracefully', () => {
  assert.equal(hexToRgba('#38BDF8', 0.5), 'rgba(56, 189, 248, 0.5)');
  assert.equal(hexToRgba('#fff', 1), 'rgba(255, 255, 255, 1)');
  assert.equal(hexToRgba('invalid', 0.8), 'rgba(255, 20, 147, 0.8)');
  assert.equal(typeof DEFAULT_TEXT_CONFIG.word1Color, 'string');
  assert.equal(typeof DEFAULT_TEXT_CONFIG.neonCoreColor, 'string');
  assert.equal(typeof DEFAULT_TEXT_CONFIG.neonGlowColor, 'string');
});
