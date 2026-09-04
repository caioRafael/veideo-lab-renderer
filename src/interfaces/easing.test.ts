import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyEasing, isEasingName, type EasingName } from './easing'

const curves: EasingName[] = ['linear', 'ease-in', 'ease-out', 'ease-in-out']

describe('applyEasing', () => {
  it('maps linear samples to themselves', () => {
    assert.equal(applyEasing('linear', 0), 0)
    assert.equal(applyEasing('linear', 0.25), 0.25)
    assert.equal(applyEasing('linear', 0.5), 0.5)
    assert.equal(applyEasing('linear', 0.75), 0.75)
    assert.equal(applyEasing('linear', 1), 1)
  })

  it('maps ease-in as t squared', () => {
    assert.equal(applyEasing('ease-in', 0), 0)
    assert.equal(applyEasing('ease-in', 0.5), 0.25)
    assert.equal(applyEasing('ease-in', 1), 1)
  })

  it('maps ease-out as 1 minus (1-t) squared', () => {
    assert.equal(applyEasing('ease-out', 0), 0)
    assert.equal(applyEasing('ease-out', 0.5), 0.75)
    assert.equal(applyEasing('ease-out', 1), 1)
  })

  it('maps ease-in-out as piecewise quadratic', () => {
    assert.equal(applyEasing('ease-in-out', 0), 0)
    assert.equal(applyEasing('ease-in-out', 0.25), 0.125)
    assert.equal(applyEasing('ease-in-out', 0.5), 0.5)
    assert.equal(applyEasing('ease-in-out', 0.75), 0.875)
    assert.equal(applyEasing('ease-in-out', 1), 1)
  })

  it('clamps t below 0 and above 1 for every curve', () => {
    for (const easing of curves) {
      assert.equal(applyEasing(easing, -1), 0)
      assert.equal(applyEasing(easing, 0), 0)
      assert.equal(applyEasing(easing, 1), 1)
      assert.equal(applyEasing(easing, 2), 1)
    }
  })

  it('stays within [0, 1] for in-range samples', () => {
    for (const easing of curves) {
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const value = applyEasing(easing, t)
        assert.equal(value >= 0 && value <= 1, true)
      }
    }
  })
})

describe('isEasingName', () => {
  it('accepts the four supported names', () => {
    assert.equal(isEasingName('linear'), true)
    assert.equal(isEasingName('ease-in'), true)
    assert.equal(isEasingName('ease-out'), true)
    assert.equal(isEasingName('ease-in-out'), true)
  })

  it('rejects unknown values', () => {
    assert.equal(isEasingName('ease'), false)
    assert.equal(isEasingName('bounce'), false)
    assert.equal(isEasingName('spring'), false)
    assert.equal(isEasingName('foo'), false)
    assert.equal(isEasingName(null), false)
    assert.equal(isEasingName(123), false)
    assert.equal(isEasingName({}), false)
  })
})
