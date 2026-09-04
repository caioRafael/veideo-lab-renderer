import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import type { Composition } from '../interfaces/composition'
import {
  getAudioItems,
  getOverlayItems,
  getTextItems,
  getVideoTrack,
} from '../interfaces/render-plan'
import { FontResolver } from '../media/FontResolver'
import { MediaResolver } from '../media/MediaResolver'
import { buildRenderPlan } from './buildRenderPlan'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-plan-'))
const mediaPaths = {
  images: path.join(tmpRoot, 'images'),
  audios: path.join(tmpRoot, 'audios'),
  videos: path.join(tmpRoot, 'videos'),
  outputVideos: path.join(tmpRoot, 'output'),
}

const resolver = new MediaResolver(mediaPaths)

before(() => {
  fs.mkdirSync(mediaPaths.images, { recursive: true })
  fs.mkdirSync(mediaPaths.audios, { recursive: true })
  fs.mkdirSync(mediaPaths.videos, { recursive: true })
  fs.writeFileSync(path.join(mediaPaths.images, 'a.png'), 'image')
  fs.writeFileSync(path.join(mediaPaths.images, 'b.png'), 'image')
  fs.writeFileSync(path.join(mediaPaths.images, 'c.png'), 'image')
  fs.writeFileSync(path.join(mediaPaths.videos, 'clip.mp4'), 'video')
  fs.writeFileSync(path.join(mediaPaths.audios, 'bg.mp3'), 'audio')
  fs.writeFileSync(path.join(mediaPaths.audios, 'voice.mp3'), 'audio')
})

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

function compositionWith(overrides: Partial<Composition> = {}): Composition {
  return {
    output: 'result.mp4',
    width: 1920,
    height: 1080,
    fps: 25,
    scenes: [
      { type: 'image', source: 'a.png', duration: 5 },
      { type: 'video', source: 'clip.mp4', duration: 10 },
      { type: 'image', source: 'c.png', duration: 3 },
    ],
    ...overrides,
  }
}

describe('buildRenderPlan', () => {
  it('places sequential scenes on a video track with absolute starts', () => {
    const plan = buildRenderPlan(compositionWith(), resolver)
    const videoTrack = getVideoTrack(plan)

    assert.equal(plan.duration, 18)
    assert.equal(videoTrack?.id, 'video')
    assert.deepEqual(
      videoTrack?.items.map((item) => ({
        id: item.id,
        start: item.start,
        duration: item.duration,
        mediaType: item.mediaType,
      })),
      [
        { id: 'video-0', start: 0, duration: 5, mediaType: 'image' },
        { id: 'video-1', start: 5, duration: 10, mediaType: 'video' },
        { id: 'video-2', start: 15, duration: 3, mediaType: 'image' },
      ],
    )
  })

  it('places global audio on an audio track using the absolute start', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [{ type: 'image', source: 'a.png', duration: 10 }],
        audio: [
          { source: 'bg.mp3', role: 'background', start: 5, duration: 4 },
        ],
      }),
      resolver,
    )

    assert.deepEqual(getAudioItems(plan), [
      {
        id: 'audio-0',
        source: path.join(mediaPaths.audios, 'bg.mp3'),
        start: 5,
        duration: 4,
        volume: 0.3,
      },
    ])
  })

  it('places scene audio using a start relative to the scene', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 5 },
          {
            type: 'image',
            source: 'b.png',
            duration: 10,
            audio: [{ source: 'voice.mp3', role: 'focus', start: 2 }],
          },
        ],
      }),
      resolver,
    )

    const [clip] = getAudioItems(plan)
    assert.equal(clip?.id, 'audio-0')
    assert.equal(clip?.start, 7)
    assert.equal(clip?.duration, 8)
    assert.equal(clip?.volume, 1)
  })

  it('places scene audio on the overlapped visual start of a crossfade', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 5 },
          {
            type: 'image',
            source: 'b.png',
            duration: 5,
            transition: { type: 'crossfade', duration: 1 },
            audio: [{ source: 'voice.mp3', role: 'focus', start: 0 }],
          },
        ],
      }),
      resolver,
    )

    const [clip] = getAudioItems(plan)
    assert.equal(plan.duration, 9)
    assert.equal(clip?.start, 4)
    assert.equal(clip?.duration, 5)
  })

  it('keeps original audio from a video scene', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 4 },
          {
            type: 'video',
            source: 'clip.mp4',
            duration: 8,
            keepAudio: true,
          },
        ],
      }),
      resolver,
    )

    assert.deepEqual(getAudioItems(plan), [
      {
        id: 'audio-video-0',
        source: path.join(mediaPaths.videos, 'clip.mp4'),
        start: 4,
        duration: 8,
        volume: 1,
      },
    ])
  })

  it('keeps original video audio on the overlapped visual start of a crossfade', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 5 },
          {
            type: 'video',
            source: 'clip.mp4',
            duration: 5,
            keepAudio: true,
            transition: { type: 'crossfade', duration: 1 },
          },
        ],
      }),
      resolver,
    )

    assert.equal(plan.duration, 9)
    assert.deepEqual(getAudioItems(plan), [
      {
        id: 'audio-video-0',
        source: path.join(mediaPaths.videos, 'clip.mp4'),
        start: 4,
        duration: 5,
        volume: 1,
      },
    ])
  })

  it('allows video and audio items to occupy the same time range', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [{ type: 'image', source: 'a.png', duration: 10 }],
        audio: [{ source: 'voice.mp3', role: 'focus', start: 3, duration: 4 }],
      }),
      resolver,
    )

    const videoItem = getVideoTrack(plan)?.items[0]
    const audioItem = getAudioItems(plan)[0]

    assert.equal(plan.duration, 10)
    assert.equal(videoItem?.start, 0)
    assert.equal(videoItem?.duration, 10)
    assert.equal(audioItem?.start, 3)
    assert.equal(audioItem?.duration, 4)

    const videoEnd = (videoItem?.start ?? 0) + (videoItem?.duration ?? 0)
    const audioEnd = (audioItem?.start ?? 0) + (audioItem?.duration ?? 0)
    assert.equal(audioItem !== undefined && videoItem !== undefined, true)
    assert.equal((audioItem?.start ?? 0) < videoEnd, true)
    assert.equal(audioEnd > (videoItem?.start ?? 0), true)
    assert.notEqual(
      getVideoTrack(plan)?.id,
      plan.tracks.find((track) => track.type === 'audio')?.id,
    )
  })

  it('resolves media sources before storing them on items', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [{ type: 'image', source: 'a.png', duration: 4 }],
      }),
      resolver,
    )

    assert.equal(
      getVideoTrack(plan)?.items[0]?.source,
      path.join(mediaPaths.images, 'a.png'),
    )
    assert.equal(
      plan.outputPath,
      path.join(mediaPaths.outputVideos, 'result.mp4'),
    )
  })

  it('builds the same plan for the same composition', () => {
    const composition = compositionWith({
      audio: [{ source: 'bg.mp3', role: 'background', start: 1 }],
    })

    assert.deepEqual(
      buildRenderPlan(composition, resolver),
      buildRenderPlan(composition, resolver),
    )
  })

  it('places texts on a text track', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [{ type: 'image', source: 'a.png', duration: 10 }],
        texts: [
          {
            content: 'Hello World',
            start: 2,
            duration: 5,
            x: 'center',
            y: 140,
            fontSize: 72,
            color: '#FFFFFF',
          },
        ],
      }),
      resolver,
    )

    const [item] = getTextItems(plan)
    assert.equal(item?.id, 'text-0')
    assert.equal(item?.content, 'Hello World')
    assert.equal(item?.start, 2)
    assert.equal(item?.duration, 5)
    assert.equal(item?.x, 'center')
    assert.equal(item?.y, 140)
    assert.equal(item?.fontSize, 72)
    assert.equal(item?.color, '#FFFFFF')
    assert.equal(item?.align, 'center')
    assert.equal(item?.verticalAlign, 'top')
    assert.equal(item?.lineSpacing, 1)
    assert.ok(item?.fontPath)
  })

  it('wraps text to the box width and keeps global timing', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 5 },
          { type: 'image', source: 'c.png', duration: 5 },
        ],
        texts: [
          {
            content:
              'Este e um texto muito grande que deve ser quebrado automaticamente',
            start: 2,
            duration: 6,
            x: 'center',
            y: 200,
            fontSize: 48,
            color: '#FFFFFF',
            box: { width: 400 },
            align: 'center',
          },
        ],
      }),
      resolver,
    )

    const [item] = getTextItems(plan)
    assert.ok(item)
    assert.ok(item.content.includes('\n'))
    assert.equal(item.start, 2)
    assert.equal(item.duration, 6)
    assert.equal(item.align, 'center')
    assert.equal(plan.duration, 10)
  })

  it('places multiple texts independently on the same track', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [{ type: 'image', source: 'a.png', duration: 10 }],
        texts: [
          {
            content: 'Title',
            start: 0,
            duration: 4,
            x: 'center',
            y: 80,
            fontSize: 64,
            color: '#FFFFFF',
          },
          {
            content: 'Caption',
            start: 3,
            duration: 5,
            x: 80,
            y: 900,
            fontSize: 32,
            color: '#FFFFFF',
          },
        ],
      }),
      resolver,
    )

    const items = getTextItems(plan)
    assert.equal(items.length, 2)
    assert.equal(items[0]?.start, 0)
    assert.equal(items[1]?.start, 3)
    assert.equal(items[0]?.align, 'center')
    assert.equal(items[1]?.align, 'left')
  })

  it('resolves a distinct font file per text style', () => {
    const fontsDir = path.join(tmpRoot, 'fonts')
    fs.mkdirSync(fontsDir, { recursive: true })
    fs.writeFileSync(path.join(fontsDir, 'Display.ttf'), 'font')
    fs.writeFileSync(path.join(fontsDir, 'Display Bold.ttf'), 'font')

    const plan = buildRenderPlan(
      compositionWith({
        scenes: [{ type: 'image', source: 'a.png', duration: 10 }],
        texts: [
          {
            content: 'Regular',
            start: 0,
            duration: 4,
            x: 'center',
            y: 100,
            fontSize: 48,
            color: '#FFFFFF',
            font: 'Display.ttf',
          },
          {
            content: 'Bold',
            start: 4,
            duration: 4,
            x: 'center',
            y: 100,
            fontSize: 48,
            color: '#FFFFFF',
            font: 'Display',
            bold: true,
          },
        ],
      }),
      resolver,
      undefined,
      new FontResolver(fontsDir),
    )

    const items = getTextItems(plan)
    assert.equal(items[0]?.fontPath, path.join(fontsDir, 'Display.ttf'))
    assert.equal(items[1]?.fontPath, path.join(fontsDir, 'Display Bold.ttf'))
    assert.notEqual(items[0]?.fontPath, items[1]?.fontPath)
  })

  it('places overlays on an overlay track with a resolved source', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [{ type: 'image', source: 'a.png', duration: 10 }],
        overlays: [
          {
            source: 'b.png',
            start: 3,
            duration: 4,
            x: 80,
            y: 80,
            width: 280,
            height: 280,
          },
        ],
      }),
      resolver,
    )

    assert.deepEqual(getOverlayItems(plan), [
      {
        id: 'overlay-0',
        source: path.join(mediaPaths.images, 'b.png'),
        start: 3,
        duration: 4,
        x: 80,
        y: 80,
        width: 280,
        height: 280,
      },
    ])
  })

  it('places multiple overlays on the same track', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [{ type: 'image', source: 'a.png', duration: 10 }],
        overlays: [
          {
            source: 'b.png',
            start: 1,
            duration: 4,
            x: 80,
            y: 80,
            width: 120,
            height: 120,
          },
          {
            source: 'c.png',
            start: 2,
            duration: 5,
            x: 400,
            y: 80,
            width: 160,
            height: 160,
          },
        ],
      }),
      resolver,
    )

    const items = getOverlayItems(plan)
    assert.equal(items.length, 2)
    assert.equal(items[0]?.id, 'overlay-0')
    assert.equal(items[1]?.id, 'overlay-1')
    assert.equal(items[0]?.start, 1)
    assert.equal(items[1]?.start, 2)
    assert.ok(
      (items[0]?.start ?? 0) + (items[0]?.duration ?? 0) >
        (items[1]?.start ?? 0),
    )
  })

  it('keeps sequential starts when there is no transition', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 5 },
          { type: 'image', source: 'b.png', duration: 5 },
        ],
      }),
      resolver,
    )

    const items = getVideoTrack(plan)?.items ?? []
    assert.equal(plan.duration, 10)
    assert.equal(items[0]?.start, 0)
    assert.equal(items[1]?.start, 5)
    assert.equal(items[1]?.incomingTransition, undefined)
  })

  it('places a fade without overlapping scenes', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 5 },
          {
            type: 'image',
            source: 'b.png',
            duration: 5,
            transition: { type: 'fade', duration: 1 },
          },
        ],
      }),
      resolver,
    )

    const items = getVideoTrack(plan)?.items ?? []
    assert.equal(plan.duration, 10)
    assert.equal(items[0]?.start, 0)
    assert.equal(items[0]?.duration, 5)
    assert.equal(items[1]?.start, 5)
    assert.equal(items[1]?.duration, 5)
    assert.deepEqual(items[1]?.incomingTransition, {
      type: 'fade',
      duration: 1,
    })
  })

  it('overlaps scenes when the destination has a crossfade', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 5 },
          {
            type: 'image',
            source: 'b.png',
            duration: 5,
            transition: { type: 'crossfade', duration: 1 },
          },
        ],
      }),
      resolver,
    )

    const items = getVideoTrack(plan)?.items ?? []
    assert.equal(plan.duration, 9)
    assert.equal(items[0]?.start, 0)
    assert.equal(items[0]?.duration, 5)
    assert.equal(items[1]?.start, 4)
    assert.equal(items[1]?.duration, 5)
    assert.deepEqual(items[1]?.incomingTransition, {
      type: 'crossfade',
      duration: 1,
    })
  })

  it('preserves transform intent on the video item', () => {
    const transform = {
      scale: 1.2,
      zoom: 1.1,
      x: 40,
      y: -10,
      pan: { x: 10, y: 20 },
      crop: { width: 1600, height: 900, x: 8, y: 4 },
    }

    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          {
            type: 'image',
            source: 'a.png',
            duration: 5,
            transform,
          },
        ],
      }),
      resolver,
    )

    assert.deepEqual(getVideoTrack(plan)?.items[0]?.transform, transform)
  })

  it('preserves animated transform intent on the video item', () => {
    const transform = {
      scale: { from: 1, to: 1.18 },
      pan: {
        from: { x: -80, y: 20 },
        to: { x: 100, y: -30 },
      },
    }

    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          {
            type: 'image',
            source: 'a.png',
            duration: 8,
            transform,
          },
        ],
      }),
      resolver,
    )

    assert.deepEqual(getVideoTrack(plan)?.items[0]?.transform, transform)
    assert.equal(plan.duration, 8)
  })

  it('omits transform from the video item when the scene has none', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [{ type: 'image', source: 'a.png', duration: 5 }],
      }),
      resolver,
    )

    assert.equal(getVideoTrack(plan)?.items[0]?.transform, undefined)
  })

  it('preserves effects intent on the video item', () => {
    const effects = {
      opacity: 0.85,
      brightness: 0.1,
      contrast: 1.2,
      saturation: 0.8,
      grayscale: 0.1,
      sepia: 0.15,
      blur: 1,
    }

    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          {
            type: 'image',
            source: 'a.png',
            duration: 5,
            effects,
          },
        ],
      }),
      resolver,
    )

    assert.deepEqual(getVideoTrack(plan)?.items[0]?.effects, effects)
    assert.equal(plan.duration, 5)
  })

  it('omits effects from the video item when the scene has none', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [{ type: 'image', source: 'a.png', duration: 5 }],
      }),
      resolver,
    )

    assert.equal(getVideoTrack(plan)?.items[0]?.effects, undefined)
  })

  it('copies effects without changing scene placements', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          {
            type: 'video',
            source: 'clip.mp4',
            duration: 5,
            effects: { brightness: -0.2 },
          },
          {
            type: 'video',
            source: 'clip.mp4',
            duration: 5,
            effects: { brightness: 0.2 },
            transition: { type: 'crossfade', duration: 1 },
          },
        ],
      }),
      resolver,
    )

    const items = getVideoTrack(plan)?.items ?? []
    assert.equal(plan.duration, 9)
    assert.equal(items[0]?.start, 0)
    assert.equal(items[0]?.duration, 5)
    assert.deepEqual(items[0]?.effects, { brightness: -0.2 })
    assert.equal(items[1]?.start, 4)
    assert.equal(items[1]?.duration, 5)
    assert.deepEqual(items[1]?.effects, { brightness: 0.2 })
  })

  it('copies mediaStart and shortMedia without changing scene placement', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          { type: 'image', source: 'a.png', duration: 5 },
          {
            type: 'video',
            source: 'clip.mp4',
            duration: 5,
            mediaStart: 30,
            shortMedia: 'freeze',
            transition: { type: 'crossfade', duration: 1 },
          },
        ],
      }),
      resolver,
    )

    const items = getVideoTrack(plan)?.items ?? []
    assert.equal(plan.duration, 9)
    assert.equal(items[0]?.start, 0)
    assert.equal(items[0]?.duration, 5)
    assert.equal(items[1]?.start, 4)
    assert.equal(items[1]?.duration, 5)
    assert.equal(items[1]?.mediaStart, 30)
    assert.equal(items[1]?.shortMedia, 'freeze')
  })

  it('does not apply mediaStart to keepAudio', () => {
    const plan = buildRenderPlan(
      compositionWith({
        scenes: [
          {
            type: 'video',
            source: 'clip.mp4',
            duration: 8,
            mediaStart: 20,
            keepAudio: true,
          },
        ],
      }),
      resolver,
    )

    const videoItem = getVideoTrack(plan)?.items[0]
    assert.equal(videoItem?.start, 0)
    assert.equal(videoItem?.mediaStart, 20)
    assert.deepEqual(getAudioItems(plan), [
      {
        id: 'audio-video-0',
        source: path.join(mediaPaths.videos, 'clip.mp4'),
        start: 0,
        duration: 8,
        volume: 1,
      },
    ])
  })
})
