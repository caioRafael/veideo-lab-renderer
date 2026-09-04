import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getVideoTrack,
  type RenderPlan,
  type VideoItem,
} from '../interfaces/render-plan'
import { assertVideoMedia, parseFfprobeDuration } from './assertVideoMedia'

function videoItem(overrides: Partial<VideoItem> = {}): VideoItem {
  return {
    id: 'video-0',
    source: '/tmp/clip.mp4',
    start: 0,
    duration: 5,
    mediaType: 'video',
    ...overrides,
  }
}

function planWith(items: VideoItem[]): RenderPlan {
  return {
    width: 1920,
    height: 1080,
    fps: 25,
    duration: items.reduce((total, item) => total + item.duration, 0),
    outputPath: '/tmp/out.mp4',
    tracks: [{ id: 'video', type: 'video', items }],
  }
}

describe('assertVideoMedia', () => {
  it('parses a finite positive ffprobe duration', () => {
    assert.equal(parseFfprobeDuration('5.5\n'), 5.5)
    assert.equal(parseFfprobeDuration('N/A'), undefined)
    assert.equal(parseFfprobeDuration('0'), undefined)
  })

  it('accepts media longer than, equal to, or covering the scene', () => {
    assert.doesNotThrow(() =>
      assertVideoMedia(planWith([videoItem({ duration: 5 })]), () => 60),
    )
    assert.doesNotThrow(() =>
      assertVideoMedia(planWith([videoItem({ duration: 5 })]), () => 5),
    )
    assert.doesNotThrow(() =>
      assertVideoMedia(
        planWith([videoItem({ duration: 5, mediaStart: 20 })]),
        () => 60,
      ),
    )
  })

  it('rejects media shorter than the scene when shortMedia is error', () => {
    assert.throws(
      () =>
        assertVideoMedia(
          planWith([videoItem({ duration: 10, mediaStart: 0 })]),
          () => 4,
        ),
      /Video media is shorter than scene duration: source=\/tmp\/clip\.mp4 mediaStart=0s requested=10s available=4s/,
    )
  })

  it('rejects mediaStart beyond the source duration', () => {
    assert.throws(
      () =>
        assertVideoMedia(planWith([videoItem({ mediaStart: 20 })]), () => 10),
      /mediaStart \(20s\) is beyond the end of \/tmp\/clip\.mp4 \(10s\)/,
    )
  })

  it('attaches the probed source duration on video items', () => {
    const plan = planWith([videoItem({ duration: 5 })])
    assertVideoMedia(plan, () => 12)
    assert.equal(getVideoTrack(plan)?.items[0]?.sourceDuration, 12)
  })

  it('skips the short-media length check for loop and freeze', () => {
    assert.doesNotThrow(() =>
      assertVideoMedia(
        planWith([videoItem({ duration: 10, shortMedia: 'loop' })]),
        () => 3,
      ),
    )
    assert.doesNotThrow(() =>
      assertVideoMedia(
        planWith([videoItem({ duration: 10, shortMedia: 'freeze' })]),
        () => 3,
      ),
    )
  })

  it('ignores image scenes', () => {
    assert.doesNotThrow(() =>
      assertVideoMedia(
        planWith([
          {
            id: 'video-0',
            source: '/tmp/a.png',
            start: 0,
            duration: 5,
            mediaType: 'image',
          },
        ]),
        () => {
          throw new Error('should not probe images')
        },
      ),
    )
  })
})
