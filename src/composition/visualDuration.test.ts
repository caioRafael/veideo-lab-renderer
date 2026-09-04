import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Scene } from '../interfaces/scene'
import { scenePlacements, visualDuration } from './visualDuration'

describe('visualDuration', () => {
  it('sums scene durations when there is no transition', () => {
    const scenes: Scene[] = [
      { type: 'image', source: 'a.png', duration: 5 },
      { type: 'image', source: 'b.png', duration: 5 },
    ]

    assert.equal(visualDuration(scenes), 10)
    assert.deepEqual(scenePlacements(scenes), [
      { start: 0, duration: 5 },
      { start: 5, duration: 5 },
    ])
  })

  it('does not extend the timeline for fade', () => {
    const scenes: Scene[] = [
      { type: 'image', source: 'a.png', duration: 5 },
      {
        type: 'image',
        source: 'b.png',
        duration: 5,
        transition: { type: 'fade', duration: 1 },
      },
    ]

    assert.equal(visualDuration(scenes), 10)
    assert.deepEqual(scenePlacements(scenes), [
      { start: 0, duration: 5 },
      { start: 5, duration: 5 },
    ])
  })

  it('subtracts the overlap for crossfade', () => {
    const scenes: Scene[] = [
      { type: 'image', source: 'a.png', duration: 5 },
      {
        type: 'image',
        source: 'b.png',
        duration: 5,
        transition: { type: 'crossfade', duration: 1 },
      },
    ]

    assert.equal(visualDuration(scenes), 9)
    assert.deepEqual(scenePlacements(scenes), [
      { start: 0, duration: 5 },
      { start: 4, duration: 5 },
    ])
  })

  it('accumulates mixed fade and crossfade', () => {
    const scenes: Scene[] = [
      { type: 'image', source: 'a.png', duration: 5 },
      {
        type: 'image',
        source: 'b.png',
        duration: 5,
        transition: { type: 'fade', duration: 1 },
      },
      {
        type: 'image',
        source: 'c.png',
        duration: 5,
        transition: { type: 'crossfade', duration: 1 },
      },
    ]

    assert.equal(visualDuration(scenes), 14)
    assert.deepEqual(scenePlacements(scenes), [
      { start: 0, duration: 5 },
      { start: 5, duration: 5 },
      { start: 9, duration: 5 },
    ])
  })

  it('does not change placements when a scene has mediaStart', () => {
    const scenes: Scene[] = [
      { type: 'video', source: 'a.mp4', duration: 5 },
      {
        type: 'video',
        source: 'b.mp4',
        duration: 5,
        mediaStart: 30,
        transition: { type: 'crossfade', duration: 1 },
      },
    ]

    assert.equal(visualDuration(scenes), 9)
    assert.deepEqual(scenePlacements(scenes), [
      { start: 0, duration: 5 },
      { start: 4, duration: 5 },
    ])
  })
})
