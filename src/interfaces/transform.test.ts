import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  evaluateTransform,
  hasPlacementTransform,
  lerpAt,
  resolveTransform,
} from './transform'

describe('lerpAt', () => {
  it('interpolates linearly and clamps to the scene duration', () => {
    assert.equal(lerpAt(1, 1.2, 0, 6), 1)
    assert.equal(lerpAt(1, 1.2, 3, 6), 1.1)
    assert.equal(lerpAt(1, 1.2, 6, 6), 1.2)
    assert.equal(lerpAt(1, 1.2, -1, 6), 1)
    assert.equal(lerpAt(1, 1.2, 9, 6), 1.2)
  })

  it('interpolates negative displacements', () => {
    assert.equal(lerpAt(100, -100, 0, 4), 100)
    assert.equal(lerpAt(100, -100, 2, 4), 0)
    assert.equal(lerpAt(100, -100, 4, 4), -100)
    assert.equal(lerpAt(-50, 100, 0, 2), -50)
    assert.equal(lerpAt(-50, 100, 1, 2), 25)
    assert.equal(lerpAt(-50, 100, 2, 2), 100)
  })
})

describe('resolveTransform', () => {
  it('defaults to identity when transform is absent', () => {
    assert.deepEqual(resolveTransform(undefined), {
      scale: { from: 1, to: 1 },
      zoom: { from: 1, to: 1 },
      x: { from: 0, to: 0 },
      y: { from: 0, to: 0 },
    })
    assert.equal(hasPlacementTransform(resolveTransform(undefined)), false)
  })

  it('treats zoom as the same size multiplier as scale', () => {
    assert.deepEqual(resolveTransform({ scale: 1.25 }).scale, {
      from: 1.25,
      to: 1.25,
    })
    assert.deepEqual(resolveTransform({ zoom: 1.25 }).zoom, {
      from: 1.25,
      to: 1.25,
    })
    assert.equal(
      evaluateTransform(resolveTransform({ scale: 1.25 }), 0, 1).scale,
      1.25,
    )
    assert.equal(
      evaluateTransform(resolveTransform({ zoom: 1.25 }), 0, 1).scale,
      1.25,
    )
  })

  it('multiplies scale and zoom when both are present', () => {
    const resolved = resolveTransform({ scale: 1.2, zoom: 1.25 })
    assert.equal(evaluateTransform(resolved, 0, 1).scale, 1.5)
  })

  it('treats pan as the same displacement as x and y', () => {
    assert.deepEqual(resolveTransform({ x: 100, y: 50 }).x, {
      from: 100,
      to: 100,
    })
    assert.deepEqual(resolveTransform({ x: 100, y: 50 }).y, {
      from: 50,
      to: 50,
    })
    assert.deepEqual(resolveTransform({ pan: { x: 100, y: 50 } }).x, {
      from: 100,
      to: 100,
    })
    assert.deepEqual(resolveTransform({ pan: { x: 100, y: 50 } }).y, {
      from: 50,
      to: 50,
    })
  })

  it('adds pan on top of x and y', () => {
    assert.deepEqual(
      resolveTransform({ x: 10, y: -5, pan: { x: 100, y: 50 } }),
      {
        scale: { from: 1, to: 1 },
        zoom: { from: 1, to: 1 },
        x: { from: 110, to: 110 },
        y: { from: 45, to: 45 },
      },
    )
  })

  it('preserves crop independently of placement', () => {
    const crop = { width: 800, height: 600, x: 4, y: 8 }
    const resolved = resolveTransform({ crop, scale: 1 })

    assert.deepEqual(resolved.crop, crop)
    assert.equal(hasPlacementTransform(resolved), false)
  })

  it('multiplies animated scale and zoom at each instant, not as lerp of products', () => {
    const resolved = resolveTransform({
      scale: { from: 1, to: 1.1 },
      zoom: { from: 1, to: 1.2 },
    })

    assert.equal(evaluateTransform(resolved, 0, 6).scale, 1)
    assert.equal(evaluateTransform(resolved, 3, 6).scale, 1.05 * 1.1)
    assert.equal(evaluateTransform(resolved, 6, 6).scale, 1.32)
    assert.notEqual(evaluateTransform(resolved, 3, 6).scale, (1 + 1.32) / 2)
  })

  it('adds animated position and pan as independent lerps', () => {
    const resolved = resolveTransform({
      x: { from: 0, to: 100 },
      y: { from: 0, to: 50 },
      pan: {
        from: { x: 0, y: 0 },
        to: { x: 50, y: 25 },
      },
    })

    assert.deepEqual(evaluateTransform(resolved, 0, 4), {
      scale: 1,
      x: 0,
      y: 0,
    })
    assert.deepEqual(evaluateTransform(resolved, 2, 4), {
      scale: 1,
      x: 75,
      y: 37.5,
    })
    assert.deepEqual(evaluateTransform(resolved, 4, 4), {
      scale: 1,
      x: 150,
      y: 75,
    })
  })
})
