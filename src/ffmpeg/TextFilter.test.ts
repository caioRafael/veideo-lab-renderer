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
})
