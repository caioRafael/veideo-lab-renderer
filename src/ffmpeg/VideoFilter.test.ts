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

  it('builds an xfade between two labeled streams', () => {
    const result = filter.xfade('v0', 'v1', 'vout', 1, 4)

    assert.match(result, /\[v0\]settb=AVTB\[vouta\]/)
    assert.match(result, /\[v1\]settb=AVTB\[voutb\]/)
    assert.match(result, /xfade=transition=fade:duration=1:offset=4\[vout\]/)
  })

  it('builds fade out and fade in filters', () => {
    assert.equal(
      filter.fadeOut('v0', 'fo1', 4, 1),
      '[v0]fade=t=out:st=4:d=1:c=black[fo1]',
    )
    assert.equal(
      filter.fadeIn('v1', 'fi1', 1),
      '[v1]fade=t=in:st=0:d=1:c=black[fi1]',
    )
  })
})
