import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  availableMediaDuration,
  isShortMediaPolicy,
  loopCopyCount,
} from './media-timing'

describe('media-timing', () => {
  it('accepts only the known shortMedia policies', () => {
    assert.equal(isShortMediaPolicy('error'), true)
    assert.equal(isShortMediaPolicy('loop'), true)
    assert.equal(isShortMediaPolicy('freeze'), true)
    assert.equal(isShortMediaPolicy('repeat'), false)
  })

  it('computes available media after mediaStart', () => {
    assert.equal(availableMediaDuration({ duration: 10 }), undefined)
    assert.equal(
      availableMediaDuration({
        duration: 10,
        sourceDuration: 8,
        mediaStart: 3,
      }),
      5,
    )
  })

  it('counts loop copies from available media', () => {
    assert.equal(loopCopyCount({ duration: 10, sourceDuration: 3 }), 4)
    assert.equal(
      loopCopyCount({ duration: 5, sourceDuration: 8, mediaStart: 3 }),
      1,
    )
    assert.equal(loopCopyCount({ duration: 10 }), undefined)
  })
})
