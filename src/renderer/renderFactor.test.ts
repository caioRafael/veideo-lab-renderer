import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clampProgress, renderFactor } from './renderFactor'

describe('renderFactor', () => {
  it('divides render seconds by video duration', () => {
    assert.equal(renderFactor(18_000, 60), 0.3)
    assert.equal(renderFactor(1200, 5), 0.24)
  })

  it('returns 0 for invalid durations', () => {
    assert.equal(renderFactor(1000, 0), 0)
    assert.equal(renderFactor(-1, 10), 0)
    assert.equal(renderFactor(Number.NaN, 10), 0)
    assert.equal(renderFactor(1000, Number.POSITIVE_INFINITY), 0)
  })
})

describe('clampProgress', () => {
  it('keeps values between 0 and 1', () => {
    assert.equal(clampProgress(-1), 0)
    assert.equal(clampProgress(0.4), 0.4)
    assert.equal(clampProgress(2), 1)
    assert.equal(clampProgress(Number.NaN), 0)
  })
})
