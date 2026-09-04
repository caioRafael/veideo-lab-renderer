import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { TextItem } from '../interfaces/render-plan'
import { TextFilter } from './TextFilter'

const filter = new TextFilter()

const item: TextItem = {
  id: 'text-0',
  content: 'Hello: World',
  start: 2,
  duration: 5,
  x: 100,
  y: 'center',
  fontSize: 48,
  color: '#FFFFFF',
  fontPath: '/tmp/Arial.ttf',
}

describe('TextFilter', () => {
  it('builds a drawtext filter from a text item', () => {
    const result = filter.draw(item)

    assert.match(result, /drawtext=fontfile='\/tmp\/Arial.ttf'/)
    assert.match(result, /text='Hello\\: World'/)
    assert.match(result, /fontsize=48/)
    assert.match(result, /fontcolor=0xFFFFFF/)
    assert.match(result, /x=100/)
    assert.match(result, /y=\(h-text_h\)\/2/)
    assert.match(result, /enable='between\(t,2,7\)'/)
  })

  it('applies the filter to labeled pads', () => {
    assert.equal(
      filter.apply('vbase', 'vout', item).startsWith('[vbase]drawtext='),
      true,
    )
    assert.match(filter.apply('vbase', 'vout', item), /\[vout\]$/)
  })

  it('escapes multiline text and keeps scene-independent timing', () => {
    const result = filter.draw({
      ...item,
      content: 'Linha 1\nLinha 2',
    })

    assert.match(result, /text='Linha 1\\nLinha 2'/)
    assert.match(result, /enable='between\(t,2,7\)'/)
  })

  it('adds stroke, shadow, background and line spacing', () => {
    const result = filter.draw({
      ...item,
      lineSpacing: 1.2,
      stroke: { width: 3, color: '#000000' },
      shadow: { x: 4, y: 4, color: '#000000' },
      background: { color: '#000000', opacity: 0.5, padding: 16 },
    })

    assert.match(result, /line_spacing=9\.6/)
    assert.match(result, /borderw=3/)
    assert.match(result, /bordercolor=0x000000/)
    assert.match(result, /shadowx=4/)
    assert.match(result, /shadowy=4/)
    assert.match(result, /box=1/)
    assert.match(result, /boxcolor=0x000000@0\.5/)
    assert.match(result, /boxborderw=16/)
  })

  it('places the alignment point from align and verticalAlign', () => {
    const centered = filter.draw({
      ...item,
      x: 960,
      y: 900,
      align: 'center',
      verticalAlign: 'bottom',
    })

    assert.match(centered, /x=960-text_w\/2/)
    assert.match(centered, /y=\(900-\(text_h\)\)/)
  })
})
