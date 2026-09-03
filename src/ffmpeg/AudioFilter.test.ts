import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AudioFilter } from './AudioFilter'

const filter = new AudioFilter(14)

describe('AudioFilter', () => {
  it('prepares a clip with trim, delay, volume and pad', () => {
    const result = filter.prepare('3:a', 'a0', {
      start: 8,
      duration: 6,
      volume: 1,
    })

    assert.equal(
      result,
      '[3:a]atrim=0:6,asetpts=PTS-STARTPTS,volume=1,adelay=8000|8000,apad=whole_dur=14,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a0]',
    )
  })

  it('formats a silent input', () => {
    assert.equal(
      filter.silence('2:a', 'aout'),
      '[2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]',
    )
  })

  it('mixes multiple prepared labels', () => {
    assert.equal(
      filter.mix(['[a0]', '[a1]'], 'aout'),
      '[a0][a1]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]',
    )
  })
})
