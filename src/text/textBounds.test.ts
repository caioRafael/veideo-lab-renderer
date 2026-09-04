import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { TextItem } from '../interfaces/render-plan'
import { computeTextRasterBounds } from './textBounds'
import { rasterizeTextConfig } from './rasterizeConfig'

function item(overrides: Partial<TextItem> = {}): TextItem {
  return {
    id: 'text-0',
    content: 'Hello',
    start: 0,
    duration: 4,
    x: 800,
    y: 400,
    fontSize: 48,
    color: '#FFFFFF',
    fontPath: '/tmp/Arial.ttf',
    align: 'left',
    verticalAlign: 'top',
    lineSpacing: 1,
    ...overrides,
  }
}

describe('computeTextRasterBounds', () => {
  it('keeps a small text PNG much smaller than the canvas', () => {
    const bounds = computeTextRasterBounds(item(), 1920, 1080)

    assert.ok(bounds.width < 400)
    assert.ok(bounds.height < 160)
    assert.ok(bounds.width * bounds.height < 1920 * 1080 * 0.05)
  })

  it('covers multiline content with a taller box', () => {
    const single = computeTextRasterBounds(item(), 1920, 1080)
    const multi = computeTextRasterBounds(
      item({ content: 'Hello\nWorld\nAgain' }),
      1920,
      1080,
    )

    assert.ok(multi.height > single.height)
  })

  it('grows for wrapping boxes', () => {
    const bounds = computeTextRasterBounds(
      item({
        content: 'Hello wrapped line',
        box: { width: 120 },
      }),
      1920,
      1080,
    )

    assert.ok(bounds.width >= 120)
  })

  it('shifts left when aligned to the right of a point', () => {
    const left = computeTextRasterBounds(
      item({ align: 'left', x: 800 }),
      1920,
      1080,
    )
    const right = computeTextRasterBounds(
      item({ align: 'right', x: 800 }),
      1920,
      1080,
    )

    assert.ok(right.x < left.x)
    assert.ok(right.x + right.width < left.x + left.width)
  })

  it('centers around the reference point', () => {
    const bounds = computeTextRasterBounds(
      item({
        x: 'center',
        y: 'center',
        align: 'center',
        verticalAlign: 'middle',
      }),
      1920,
      1080,
    )

    const centerX = 960
    const centerY = 540
    assert.ok(bounds.x < centerX)
    assert.ok(bounds.x + bounds.width > centerX)
    assert.ok(bounds.y < centerY)
    assert.ok(bounds.y + bounds.height > centerY)
  })

  it('honors top, middle and bottom vertical alignment', () => {
    const top = computeTextRasterBounds(
      item({ y: 400, verticalAlign: 'top' }),
      1920,
      1080,
    )
    const middle = computeTextRasterBounds(
      item({ y: 400, verticalAlign: 'middle' }),
      1920,
      1080,
    )
    const bottom = computeTextRasterBounds(
      item({ y: 400, verticalAlign: 'bottom' }),
      1920,
      1080,
    )

    assert.ok(top.y > middle.y)
    assert.ok(middle.y > bottom.y)
  })

  it('expands for padding, stroke and shadow', () => {
    const plain = computeTextRasterBounds(item(), 1920, 1080)
    const padded = computeTextRasterBounds(
      item({
        background: { color: '#000000', opacity: 0.5, padding: 24 },
        stroke: { width: 4, color: '#000000' },
        shadow: { x: 6, y: 6, color: '#000000' },
      }),
      1920,
      1080,
    )

    assert.ok(padded.width > plain.width)
    assert.ok(padded.height > plain.height)
  })

  it('places two texts at different positions without sharing a box', () => {
    const first = computeTextRasterBounds(item({ x: 80, y: 80 }), 1920, 1080)
    const second = computeTextRasterBounds(
      item({ x: 1400, y: 800 }),
      1920,
      1080,
    )

    assert.ok(
      first.x + first.width < second.x || second.y > first.y + first.height,
    )
    assert.ok(second.x > 1000)
    assert.ok(second.y > 700)
  })
})

describe('rasterizeTextConfig', () => {
  it('emits a cropped canvas and remapped origin', () => {
    const source = item({ x: 800, y: 400 })
    const bounds = computeTextRasterBounds(source, 1920, 1080)
    const config = rasterizeTextConfig(source, 1920, 1080)

    assert.equal(config.canvasWidth, bounds.width)
    assert.equal(config.canvasHeight, bounds.height)
    assert.notEqual(config.canvasWidth, 1920)
    assert.notEqual(config.canvasHeight, 1080)
    assert.equal(Number(config.x), bounds.refX - bounds.x)
    assert.equal(Number(config.y), bounds.refY - bounds.y)
  })
})
