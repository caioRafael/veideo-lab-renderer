import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { RenderPlan } from '../interfaces/render-plan'
import { collectPlanStats } from './collectPlanStats'

describe('collectPlanStats', () => {
  it('counts scenes, effects, transitions and inputs', () => {
    const plan: RenderPlan = {
      width: 1920,
      height: 1080,
      fps: 25,
      duration: 9,
      outputPath: '/tmp/out.mp4',
      tracks: [
        {
          id: 'video',
          type: 'video',
          items: [
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 5,
              mediaType: 'image',
              effects: { brightness: 0.1 },
            },
            {
              id: 'video-1',
              source: '/tmp/b.png',
              start: 4,
              duration: 5,
              mediaType: 'image',
              incomingTransition: { type: 'crossfade', duration: 1 },
            },
          ],
        },
        {
          id: 'audio',
          type: 'audio',
          items: [
            {
              id: 'audio-0',
              source: '/tmp/a.mp3',
              start: 0,
              duration: 9,
              volume: 1,
            },
          ],
        },
        {
          id: 'text',
          type: 'text',
          items: [
            {
              id: 'text-0',
              content: 'Hello',
              start: 0,
              duration: 2,
              x: 'center',
              y: 80,
              fontSize: 48,
              color: '#FFFFFF',
              fontPath: '/tmp/font.ttf',
            },
          ],
        },
      ],
    }

    assert.deepEqual(collectPlanStats(plan), {
      sceneCount: 2,
      videoItemCount: 2,
      audioItemCount: 1,
      textItemCount: 1,
      overlayItemCount: 0,
      transitionCount: 1,
      effectCount: 1,
      inputCount: 3,
      width: 1920,
      height: 1080,
      fps: 25,
      videoDuration: 9,
    })
  })
})
