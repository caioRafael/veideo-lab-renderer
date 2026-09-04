import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Composition } from '../interfaces/composition'
import { AudioTimeline } from './AudioTimeline'

const timeline = new AudioTimeline()

function compositionWith(overrides: Partial<Composition> = {}): Composition {
  return {
    output: 'output.mp4',
    width: 1920,
    height: 1080,
    fps: 25,
    scenes: [
      { type: 'image', source: 'a.png', duration: 4 },
      { type: 'image', source: 'b.png', duration: 4 },
      { type: 'image', source: 'c.png', duration: 6 },
    ],
    ...overrides,
  }
}

describe('AudioTimeline', () => {
  it('places global audio on an absolute start', () => {
    const clips = timeline.collect(
      compositionWith({
        audio: [
          {
            source: 'bg.mp3',
            role: 'background',
            start: 8,
            duration: 6,
          },
        ],
      }),
      14,
    )

    assert.deepEqual(clips, [
      { source: 'bg.mp3', start: 8, duration: 6, volume: 0.3 },
    ])
  })

  it('defaults global start to 0', () => {
    const clips = timeline.collect(
      compositionWith({
        audio: [{ source: 'bg.mp3', role: 'background' }],
      }),
      14,
    )

    assert.equal(clips[0]?.start, 0)
    assert.equal(clips[0]?.duration, 14)
  })

  it('places scene audio relative to the scene start', () => {
    const clips = timeline.collect(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 4 },
          {
            type: 'image',
            source: 'b.png',
            duration: 4,
            audio: [{ source: 'sfx.mp3', role: 'focus', start: 1 }],
          },
          { type: 'image', source: 'c.png', duration: 6 },
        ],
      }),
      14,
    )

    assert.deepEqual(clips, [
      { source: 'sfx.mp3', start: 5, duration: 3, volume: 1 },
    ])
  })

  it('places scene audio on the visual start when the destination has a crossfade', () => {
    const clips = timeline.collect(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 5 },
          {
            type: 'image',
            source: 'b.png',
            duration: 5,
            transition: { type: 'crossfade', duration: 1 },
            audio: [{ source: 'sfx.mp3', role: 'focus', start: 0 }],
          },
        ],
      }),
      9,
    )

    assert.deepEqual(clips, [
      { source: 'sfx.mp3', start: 4, duration: 5, volume: 1 },
    ])
  })

  it('collects audio across multiple scenes', () => {
    const clips = timeline.collect(
      compositionWith({
        scenes: [
          {
            type: 'image',
            source: 'a.png',
            duration: 4,
            audio: [{ source: 'one.mp3', role: 'focus' }],
          },
          {
            type: 'image',
            source: 'b.png',
            duration: 4,
            audio: [{ source: 'two.mp3', role: 'focus' }],
          },
        ],
      }),
      8,
    )

    assert.deepEqual(clips, [
      { source: 'one.mp3', start: 0, duration: 4, volume: 1 },
      { source: 'two.mp3', start: 4, duration: 4, volume: 1 },
    ])
  })

  it('respects an explicit duration and clamps it to the remaining time', () => {
    const clips = timeline.collect(
      compositionWith({
        audio: [
          {
            source: 'bg.mp3',
            role: 'background',
            start: 10,
            duration: 20,
          },
        ],
      }),
      14,
    )

    assert.equal(clips[0]?.duration, 4)
  })

  it('uses role volumes and allows an override', () => {
    const clips = timeline.collect(
      compositionWith({
        audio: [
          { source: 'bg.mp3', role: 'background' },
          { source: 'voice.mp3', role: 'focus', volume: 0.8 },
        ],
      }),
      4,
    )

    assert.equal(clips[0]?.volume, 0.3)
    assert.equal(clips[1]?.volume, 0.8)
  })

  it('skips clips that start after the timeline ends', () => {
    const clips = timeline.collect(
      compositionWith({
        audio: [{ source: 'late.mp3', role: 'focus', start: 20 }],
      }),
      14,
    )

    assert.deepEqual(clips, [])
  })
})
