import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { OverlayItem } from '../interfaces/render-plan'
import { OverlayFilter } from './OverlayFilter'

const filter = new OverlayFilter()

const item: OverlayItem = {
  id: 'overlay-0',
  source: '/tmp/logo.png',
  start: 3,
  duration: 5,
  x: 80,
  y: 80,
  width: 280,
  height: 280,
}

describe('OverlayFilter', () => {
  it('scales the overlay before composing', () => {
    assert.equal(filter.scale('2:v', 'ov0', item), '[2:v]scale=280:280[ov0]')
  })

  it('places the overlay in the requested window', () => {
    assert.equal(
      filter.overlay('vbase', 'ov0', 'vout', item),
      "[vbase][ov0]overlay=80:80:enable='between(t,3,8)'[vout]",
    )
  })
})
