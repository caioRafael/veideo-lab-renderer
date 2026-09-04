import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { TextItem } from '../interfaces/render-plan'
import { TextRenderer } from './TextRenderer'

const renderer = new TextRenderer()

function item(overrides: Partial<TextItem> = {}): TextItem {
  return {
    id: 'text-0',
    content: 'Hello',
    start: 0,
    duration: 5,
    x: 'center',
    y: 100,
    fontSize: 48,
    color: '#FFFFFF',
    fontPath: '/tmp/Arial.ttf',
    align: 'center',
    verticalAlign: 'top',
    lineSpacing: 1,
    ...overrides,
  }
}

describe('TextRenderer', () => {
  it('layouts a single line', () => {
    const layout = renderer.layout(item())

    assert.deepEqual(layout.lines, ['Hello'])
    assert.equal(layout.align, 'center')
    assert.ok(layout.contentWidth > 0)
  })

  it('layouts multiline content', () => {
    const layout = renderer.layout(item({ content: 'Linha 1\nLinha 2' }))

    assert.deepEqual(layout.lines, ['Linha 1', 'Linha 2'])
    assert.ok(layout.contentHeight > 48)
  })

  it('uses the lineSpacing multiplier for line height', () => {
    const layout = renderer.layout(item({ lineSpacing: 1.2 }))

    assert.equal(layout.lineHeight, 48 * 1.2)
    assert.equal(layout.lineSpacing, 1.2)
  })
})
