import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseFfmpegProgressLine } from './parseFfmpegProgress'

describe('parseFfmpegProgressLine', () => {
  it('reads time, fps and speed from an FFmpeg status line', () => {
    const update = parseFfmpegProgressLine(
      'frame=  100 fps= 72.4 q=28.0 size=     256KiB time=00:00:04.00 bitrate=1908.5kbits/s speed=2.90x',
    )

    assert.deepEqual(update, {
      timeSeconds: 4,
      fps: 72.4,
      speed: 2.9,
    })
  })

  it('ignores unrelated log lines', () => {
    assert.equal(parseFfmpegProgressLine('Input #0, mov,mp4'), undefined)
  })
})
