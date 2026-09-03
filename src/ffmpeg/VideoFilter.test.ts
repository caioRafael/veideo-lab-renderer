import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { VideoFilter } from './VideoFilter'

const filter = new VideoFilter(1920, 1080, 25)

describe('VideoFilter', () => {
  it('builds a scale, pad and fps chain', () => {
    const result = filter.scale('0:v', 'v0')

    assert.match(result, /^\[0:v\]/)
    assert.match(result, /scale=1920:1080:force_original_aspect_ratio=decrease/)
    assert.match(result, /pad=1920:1080:\(ow-iw\)\/2:\(oh-ih\)\/2/)
    assert.match(result, /fps=25/)
    assert.match(result, /format=yuv420p\[v0\]$/)
  })

  it('builds a concat filter from scene labels', () => {
    assert.equal(
      filter.concat(['[v0]', '[v1]', '[v2]']),
      '[v0][v1][v2]concat=n=3:v=1:a=0[vout]',
    )
  })
})
