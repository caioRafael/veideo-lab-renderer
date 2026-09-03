import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { RenderPlan } from '../interfaces/render-plan'
import { FfmpegCommandBuilder } from './FfmpegCommandBuilder'

const builder = new FfmpegCommandBuilder()

function planWith(overrides: Partial<RenderPlan> = {}): RenderPlan {
  return {
    width: 1920,
    height: 1080,
    fps: 25,
    totalSeconds: 10,
    outputPath: '/tmp/output.mp4',
    scenes: [
      { type: 'image', path: '/tmp/a.png', duration: 4 },
      { type: 'video', path: '/tmp/b.mp4', duration: 6 },
    ],
    audioTracks: [],
    ...overrides,
  }
}

function sliceAfter(args: string[], flag: string): string[] {
  const index = args.indexOf(flag)
  assert.notEqual(index, -1, `missing flag ${flag}`)
  return args.slice(index)
}

describe('FfmpegCommandBuilder', () => {
  it('builds the expected command structure', () => {
    const args = builder.build(planWith())

    assert.equal(args[0], '-y')
    assert.deepEqual(args.slice(1, 7), [
      '-loop',
      '1',
      '-t',
      '4',
      '-i',
      '/tmp/a.png',
    ])
    assert.deepEqual(args.slice(7, 11), ['-t', '6', '-i', '/tmp/b.mp4'])
    assert.deepEqual(args.slice(11, 17), [
      '-f',
      'lavfi',
      '-t',
      '10',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
    ])

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(filterComplex, /concat=n=2:v=1:a=0\[vout\]/)
    assert.match(filterComplex, /aformat=sample_fmts=fltp/)

    assert.deepEqual(sliceAfter(args, '-map').slice(0, 4), [
      '-map',
      '[vout]',
      '-map',
      '[aout]',
    ])
    assert.deepEqual(sliceAfter(args, '-c:v').slice(0, 4), [
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
    ])
    assert.equal(args.at(-1), '/tmp/output.mp4')
  })

  it('prepares a single audio track without amix', () => {
    const args = builder.build(
      planWith({
        audioTracks: [
          { path: '/tmp/voice.mp3', start: 2, duration: 3, volume: 1 },
        ],
      }),
    )

    assert.ok(args.includes('/tmp/voice.mp3'))
    assert.equal(
      args.includes('anullsrc=channel_layout=stereo:sample_rate=44100'),
      false,
    )

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(filterComplex, /atrim=0:3/)
    assert.match(filterComplex, /adelay=2000\|2000/)
    assert.equal(filterComplex.includes('amix='), false)
  })

  it('mixes multiple audio tracks', () => {
    const args = builder.build(
      planWith({
        audioTracks: [
          { path: '/tmp/bg.mp3', start: 0, duration: 8, volume: 0.3 },
          { path: '/tmp/voice.mp3', start: 8, duration: 2, volume: 1 },
        ],
      }),
    )

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(
      filterComplex,
      /amix=inputs=2:duration=first:dropout_transition=0:normalize=0\[aout\]/,
    )
  })
})
