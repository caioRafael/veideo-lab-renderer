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

  it('returns the end value when duration is not greater than 0', () => {
    assert.equal(lerpAt(1, 1.2, 0, 0), 1.2)
    assert.equal(lerpAt(1, 1.2, 1, -1), 1.2)
  })

  it('applies easing in lerpAt', () => {
    assert.equal(lerpAt(1, 2, 2, 4, 'ease-in'), 1.25)
    assert.equal(lerpAt(1, 2, 2, 4, 'ease-out'), 1.75)
    assert.equal(lerpAt(1, 2, 1, 4, 'ease-in-out'), 1.125)
  })

  it('stays constant when from equals to', () => {
    assert.equal(lerpAt(1.2, 1.2, 0, 4), 1.2)
    assert.equal(lerpAt(1.2, 1.2, 2, 4), 1.2)
    assert.equal(lerpAt(1.2, 1.2, 4, 4), 1.2)
    assert.equal(lerpAt(1, 1, 2, 4, 'ease-in-out'), 1)
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
      scale: { from: 1, to: 1, easing: 'linear' },
      zoom: { from: 1, to: 1, easing: 'linear' },
      x: { from: 0, to: 0, easing: 'linear' },
      y: { from: 0, to: 0, easing: 'linear' },
      panX: { from: 0, to: 0, easing: 'linear' },
      panY: { from: 0, to: 0, easing: 'linear' },
    })
    assert.equal(hasPlacementTransform(resolveTransform(undefined)), false)
  })

  it('treats zoom as the same size multiplier as scale', () => {
    assert.deepEqual(resolveTransform({ scale: 1.25 }).scale, {
      from: 1.25,
      to: 1.25,
      easing: 'linear',
    })
    assert.deepEqual(resolveTransform({ zoom: 1.25 }).zoom, {
      from: 1.25,
      to: 1.25,
      easing: 'linear',
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
    assert.deepEqual(
      evaluateTransform(resolveTransform({ x: 100, y: 50 }), 0, 1),
      {
        scale: 1,
        x: 100,
        y: 50,
      },
    )
    assert.deepEqual(
      evaluateTransform(resolveTransform({ pan: { x: 100, y: 50 } }), 0, 1),
      {
        scale: 1,
        x: 100,
        y: 50,
      },
    )
  })

  it('adds pan on top of x and y', () => {
    const resolved = resolveTransform({
      x: 10,
      y: -5,
      pan: { x: 100, y: 50 },
    })

    assert.deepEqual(resolved.x, { from: 10, to: 10, easing: 'linear' })
    assert.deepEqual(resolved.panX, { from: 100, to: 100, easing: 'linear' })
    assert.deepEqual(evaluateTransform(resolved, 0, 1), {
      scale: 1,
      x: 110,
      y: 45,
    })
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

  it('treats identity scale, zoom, position and pan as no placement', () => {
    const resolved = resolveTransform({
      scale: 1,
      zoom: 1,
      x: 0,
      y: 0,
      pan: { x: 0, y: 0 },
    })

    assert.equal(hasPlacementTransform(resolved), false)
    assert.deepEqual(evaluateTransform(resolved, 0, 4), {
      scale: 1,
      x: 0,
      y: 0,
    })
    assert.deepEqual(evaluateTransform(resolved, 4, 4), {
      scale: 1,
      x: 0,
      y: 0,
    })
  })

  it('treats from === to as a static value', () => {
    const resolved = resolveTransform({
      scale: { from: 1.2, to: 1.2 },
      x: { from: 40, to: 40 },
    })

    assert.equal(hasPlacementTransform(resolved), true)
    assert.deepEqual(evaluateTransform(resolved, 0, 5), {
      scale: 1.2,
      x: 40,
      y: 0,
    })
    assert.deepEqual(evaluateTransform(resolved, 5, 5), {
      scale: 1.2,
      x: 40,
      y: 0,
    })
  })

  it('multiplies mixed static and animated scale and zoom at each instant', () => {
    const resolved = resolveTransform({
      scale: 1.2,
      zoom: { from: 1, to: 1.1 },
    })

    assert.equal(evaluateTransform(resolved, 0, 4).scale, 1.2)
    assert.equal(evaluateTransform(resolved, 2, 4).scale, 1.2 * 1.05)
    assert.equal(evaluateTransform(resolved, 4, 4).scale, 1.32)
  })

  it('adds mixed static position and animated pan at each instant', () => {
    const resolved = resolveTransform({
      x: 10,
      pan: { from: { x: 0, y: 0 }, to: { x: 50, y: 20 } },
    })

    assert.deepEqual(evaluateTransform(resolved, 0, 4), {
      scale: 1,
      x: 10,
      y: 0,
    })
    assert.deepEqual(evaluateTransform(resolved, 2, 4), {
      scale: 1,
      x: 35,
      y: 10,
    })
    assert.deepEqual(evaluateTransform(resolved, 4, 4), {
      scale: 1,
      x: 60,
      y: 20,
    })
  })

  it('adds animated position and pan as independent interpolations', () => {
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

  it('applies ease-in to scale as t squared', () => {
    const resolved = resolveTransform({
      scale: { from: 1, to: 2, easing: 'ease-in' },
    })

    assert.equal(evaluateTransform(resolved, 0, 4).scale, 1)
    assert.equal(evaluateTransform(resolved, 2, 4).scale, 1.25)
    assert.equal(evaluateTransform(resolved, 4, 4).scale, 2)
  })

  it('applies independent easings to scale and zoom', () => {
    const resolved = resolveTransform({
      scale: { from: 1, to: 1.2, easing: 'ease-in' },
      zoom: { from: 1, to: 1.1, easing: 'ease-out' },
    })

    assert.equal(evaluateTransform(resolved, 0, 4).scale, 1)
    const mid = evaluateTransform(resolved, 2, 4).scale
    assert.ok(Math.abs(mid - 1.05 * 1.075) < 1e-12)
    assert.equal(evaluateTransform(resolved, 4, 4).scale, 1.32)
    assert.notEqual(mid, (1 + 1.32) / 2)
  })

  it('applies independent easings to position and pan', () => {
    const resolved = resolveTransform({
      x: { from: 0, to: 100, easing: 'ease-in' },
      pan: {
        from: { x: 0, y: 0 },
        to: { x: 100, y: 0 },
        easing: 'ease-out',
      },
    })

    assert.equal(evaluateTransform(resolved, 0, 4).x, 0)
    assert.equal(evaluateTransform(resolved, 2, 4).x, 25 + 75)
    assert.equal(evaluateTransform(resolved, 4, 4).x, 200)
  })

  it('keeps from === to constant even with easing', () => {
    const resolved = resolveTransform({
      scale: { from: 1, to: 1, easing: 'ease-in-out' },
    })

    assert.equal(evaluateTransform(resolved, 0, 5).scale, 1)
    assert.equal(evaluateTransform(resolved, 2.5, 5).scale, 1)
    assert.equal(evaluateTransform(resolved, 5, 5).scale, 1)
  })

  it('uses linear when easing is omitted', () => {
    const omitted = resolveTransform({ scale: { from: 1, to: 1.5 } })
    const explicit = resolveTransform({
      scale: { from: 1, to: 1.5, easing: 'linear' },
    })

    assert.equal(omitted.scale.easing, 'linear')
    assert.equal(evaluateTransform(omitted, 2, 4).scale, 1.25)
    assert.equal(
      evaluateTransform(omitted, 2, 4).scale,
      evaluateTransform(explicit, 2, 4).scale,
    )
  })
})
