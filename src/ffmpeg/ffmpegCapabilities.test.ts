import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { detectDrawtextSupport } from './ffmpegCapabilities'

describe('detectDrawtextSupport', () => {
  it('returns false when FFmpeg reports an unknown filter', () => {
    assert.equal(detectDrawtextSupport("Unknown filter 'drawtext'."), false)
  })

  it('returns true when the drawtext help is available', () => {
    assert.equal(
      detectDrawtextSupport(
        'Filter drawtext\nDraw text on top of video frames',
      ),
      true,
    )
  })

  it('throws when FFmpeg is not installed', () => {
    const error = new Error('spawn ffmpeg ENOENT')
    Object.assign(error, { code: 'ENOENT' })

    assert.throws(
      () => detectDrawtextSupport('', error),
      /FFmpeg was not found in PATH/,
    )
  })
})
