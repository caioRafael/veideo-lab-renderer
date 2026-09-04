import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_EFFECTS,
  EFFECT_LIMITS,
  hasActiveEffects,
  normalizeEffects,
  VIDEO_EFFECT_KEYS,
} from './effects'

describe('normalizeEffects', () => {
  it('applies defaults when effects are omitted', () => {
    assert.deepEqual(normalizeEffects(undefined), DEFAULT_EFFECTS)
    assert.deepEqual(normalizeEffects({}), DEFAULT_EFFECTS)
  })

  it('keeps provided values and fills the rest with defaults', () => {
    assert.deepEqual(
      normalizeEffects({
        brightness: 0.2,
        contrast: 1.2,
        blur: 2,
      }),
      {
        opacity: 1,
        brightness: 0.2,
        contrast: 1.2,
        saturation: 1,
        grayscale: 0,
        sepia: 0,
        blur: 2,
      },
    )
  })

  it('normalizes every supported effect', () => {
    const provided = {
      opacity: 0.75,
      brightness: -0.2,
      contrast: 1.4,
      saturation: 0.5,
      grayscale: 0.3,
      sepia: 0.2,
      blur: 4,
    }

    assert.deepEqual(normalizeEffects(provided), provided)
  })

  it('treats explicit defaults as inactive', () => {
    assert.equal(hasActiveEffects(undefined), false)
    assert.equal(hasActiveEffects({}), false)
    assert.equal(hasActiveEffects({ ...DEFAULT_EFFECTS }), false)
    assert.equal(hasActiveEffects({ brightness: 0, contrast: 1 }), false)
    assert.equal(hasActiveEffects({ brightness: 0.1 }), true)
  })

  it('uses a canonical key order independent of object insertion', () => {
    assert.deepEqual(VIDEO_EFFECT_KEYS, [
      'opacity',
      'brightness',
      'contrast',
      'saturation',
      'grayscale',
      'sepia',
      'blur',
    ])
    assert.equal(EFFECT_LIMITS.brightness.min, -1)
    assert.equal(EFFECT_LIMITS.brightness.max, 1)
  })
})
