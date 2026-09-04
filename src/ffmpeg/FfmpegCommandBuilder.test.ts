import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  AudioTrack,
  OverlayTrack,
  RenderPlan,
  TextTrack,
  VideoTrack,
} from '../interfaces/render-plan'
import { FfmpegCommandBuilder } from './FfmpegCommandBuilder'

const builder = new FfmpegCommandBuilder()

function videoTrack(items: VideoTrack['items']): VideoTrack {
  return { id: 'video', type: 'video', items }
}

function audioTrack(items: AudioTrack['items']): AudioTrack {
  return { id: 'audio', type: 'audio', items }
}

function planWith(overrides: Partial<RenderPlan> = {}): RenderPlan {
  return {
    width: 1920,
    height: 1080,
    fps: 25,
    duration: 10,
    outputPath: '/tmp/output.mp4',
    tracks: [
      videoTrack([
        {
          id: 'video-0',
          source: '/tmp/a.png',
          start: 0,
          duration: 4,
          mediaType: 'image',
        },
        {
          id: 'video-1',
          source: '/tmp/b.mp4',
          start: 4,
          duration: 6,
          mediaType: 'video',
        },
      ]),
    ],
    ...overrides,
  }
}

function sliceAfter(args: string[], flag: string): string[] {
  const index = args.indexOf(flag)
  assert.notEqual(index, -1, `missing flag ${flag}`)
  return args.slice(index)
}

describe('FfmpegCommandBuilder', () => {
  it('builds the expected command structure from tracks', () => {
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

  it('prepares a single audio item without amix', () => {
    const args = builder.build(
      planWith({
        tracks: [
          videoTrack([
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 4,
              mediaType: 'image',
            },
            {
              id: 'video-1',
              source: '/tmp/b.mp4',
              start: 4,
              duration: 6,
              mediaType: 'video',
            },
          ]),
          audioTrack([
            {
              id: 'audio-0',
              source: '/tmp/voice.mp3',
              start: 2,
              duration: 3,
              volume: 1,
            },
          ]),
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

  it('mixes multiple audio items from tracks', () => {
    const args = builder.build(
      planWith({
        tracks: [
          videoTrack([
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 4,
              mediaType: 'image',
            },
            {
              id: 'video-1',
              source: '/tmp/b.mp4',
              start: 4,
              duration: 6,
              mediaType: 'video',
            },
          ]),
          audioTrack([
            {
              id: 'audio-0',
              source: '/tmp/bg.mp3',
              start: 0,
              duration: 8,
              volume: 0.3,
            },
            {
              id: 'audio-1',
              source: '/tmp/voice.mp3',
              start: 8,
              duration: 2,
              volume: 1,
            },
          ]),
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

  it('scales and overlays image tracks after the video base', () => {
    const args = builder.build(
      planWith({
        tracks: [
          videoTrack([
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 10,
              mediaType: 'image',
            },
          ]),
          {
            id: 'overlay',
            type: 'overlay',
            items: [
              {
                id: 'overlay-0',
                source: '/tmp/logo.png',
                start: 1,
                duration: 5,
                x: 80,
                y: 80,
                width: 280,
                height: 280,
              },
            ],
          } satisfies OverlayTrack,
        ],
      }),
    )

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(filterComplex, /concat=n=1:v=1:a=0\[vbase\]/)
    assert.match(filterComplex, /scale=280:280\[ov0\]/)
    assert.match(
      filterComplex,
      /overlay=80:80:enable='between\(t,1,6\)'\[vout\]/,
    )
    assert.ok(args.includes('/tmp/logo.png'))
  })

  it('overlays multiple images in input order', () => {
    const args = builder.build(
      planWith({
        duration: 8,
        tracks: [
          videoTrack([
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 8,
              mediaType: 'image',
            },
          ]),
          {
            id: 'overlay',
            type: 'overlay',
            items: [
              {
                id: 'overlay-0',
                source: '/tmp/one.png',
                start: 1,
                duration: 3,
                x: 10,
                y: 10,
                width: 100,
                height: 100,
              },
              {
                id: 'overlay-1',
                source: '/tmp/two.png',
                start: 2,
                duration: 4,
                x: 40,
                y: 40,
                width: 80,
                height: 80,
              },
            ],
          } satisfies OverlayTrack,
        ],
      }),
    )

    assert.ok(args.includes('/tmp/one.png'))
    assert.ok(args.includes('/tmp/two.png'))
    assert.ok(args.indexOf('/tmp/one.png') < args.indexOf('/tmp/two.png'))

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(
      filterComplex,
      /overlay=10:10:enable='between\(t,1,4\)'\[ovl0\]/,
    )
    assert.match(
      filterComplex,
      /overlay=40:40:enable='between\(t,2,6\)'\[vout\]/,
    )
  })

  it('applies drawtext after overlays', () => {
    const args = builder.build(
      planWith({
        tracks: [
          videoTrack([
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 10,
              mediaType: 'image',
            },
          ]),
          {
            id: 'text',
            type: 'text',
            items: [
              {
                id: 'text-0',
                content: 'Hello World',
                start: 2,
                duration: 5,
                x: 'center',
                y: 140,
                fontSize: 72,
                color: '#FFFFFF',
                fontPath: '/tmp/Arial.ttf',
              },
            ],
          } satisfies TextTrack,
        ],
      }),
    )

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(filterComplex, /drawtext=fontfile='\/tmp\/Arial.ttf'/)
    assert.match(filterComplex, /text='Hello World'/)
    assert.match(filterComplex, /enable='between\(t,2,7\)'/)
  })

  it('applies xfade with the overlap offset', () => {
    const args = builder.build(
      planWith({
        duration: 9,
        tracks: [
          videoTrack([
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 5,
              mediaType: 'image',
            },
            {
              id: 'video-1',
              source: '/tmp/b.png',
              start: 4,
              duration: 5,
              mediaType: 'image',
              incomingTransition: { type: 'crossfade', duration: 1 },
            },
          ]),
        ],
      }),
    )

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(filterComplex, /settb=AVTB/)
    assert.match(
      filterComplex,
      /xfade=transition=fade:duration=1:offset=4\[vout\]/,
    )
    assert.equal(filterComplex.includes('concat='), false)
    assert.equal(args[args.lastIndexOf('-t') + 1], '9')
  })

  it('applies fade to black then concat', () => {
    const args = builder.build(
      planWith({
        duration: 10,
        tracks: [
          videoTrack([
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 5,
              mediaType: 'image',
            },
            {
              id: 'video-1',
              source: '/tmp/b.png',
              start: 5,
              duration: 5,
              mediaType: 'image',
              incomingTransition: { type: 'fade', duration: 1 },
            },
          ]),
        ],
      }),
    )

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(filterComplex, /fade=t=out:st=4:d=1:c=black\[fo1\]/)
    assert.match(filterComplex, /fade=t=in:st=0:d=1:c=black\[fi1\]/)
    assert.match(filterComplex, /\[fo1\]\[fi1\]concat=n=2:v=1:a=0\[vout\]/)
    assert.equal(filterComplex.includes('xfade='), false)
    assert.equal(args[args.lastIndexOf('-t') + 1], '10')
  })

  it('prepares transformed scenes before xfade with matching canvas output', () => {
    const args = builder.build(
      planWith({
        duration: 9,
        tracks: [
          videoTrack([
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 5,
              mediaType: 'image',
              transform: { scale: 1.2 },
            },
            {
              id: 'video-1',
              source: '/tmp/b.png',
              start: 4,
              duration: 5,
              mediaType: 'image',
              incomingTransition: { type: 'crossfade', duration: 1 },
              transform: { x: 100 },
            },
          ]),
        ],
      }),
    )

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)

    const scaleIndex = filterComplex.indexOf('[v0fit]scale=iw*1.2:ih*1.2[v0z]')
    const overlayIndex = filterComplex.indexOf(
      '[v0bg][v0z]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:shortest=1',
    )
    const positionIndex = filterComplex.indexOf(
      '[v1bg][v1fit]overlay=(main_w-overlay_w)/2+100:(main_h-overlay_h)/2:shortest=1',
    )
    const xfadeIndex = filterComplex.indexOf(
      'xfade=transition=fade:duration=1:offset=4[vout]',
    )

    assert.equal(scaleIndex !== -1, true)
    assert.equal(overlayIndex !== -1, true)
    assert.equal(positionIndex !== -1, true)
    assert.equal(xfadeIndex !== -1, true)
    assert.equal(scaleIndex < overlayIndex, true)
    assert.equal(overlayIndex < xfadeIndex, true)
    assert.equal(positionIndex < xfadeIndex, true)
    assert.match(filterComplex, /settb=AVTB/)
    assert.match(filterComplex, /format=yuv420p\[v0\]/)
    assert.match(filterComplex, /format=yuv420p\[v1\]/)
    assert.match(filterComplex, /fps=25,format=yuv420p\[v0\]/)
    assert.match(filterComplex, /fps=25,format=yuv420p\[v1\]/)
    assert.equal(filterComplex.includes('concat='), false)
  })

  it('applies animated transforms before xfade without changing the overlap offset', () => {
    const args = builder.build(
      planWith({
        duration: 7,
        tracks: [
          videoTrack([
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 4,
              mediaType: 'image',
              transform: { scale: { from: 1, to: 1.2 } },
            },
            {
              id: 'video-1',
              source: '/tmp/b.png',
              start: 3,
              duration: 4,
              mediaType: 'image',
              incomingTransition: { type: 'crossfade', duration: 1 },
              transform: {
                pan: {
                  from: { x: 0, y: 0 },
                  to: { x: 150, y: 0 },
                },
              },
            },
          ]),
        ],
      }),
    )

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(filterComplex, /scale=w='trunc\(iw\*/)
    assert.match(filterComplex, /eval=frame/)
    assert.match(filterComplex, /if\(isnan\(t\),0,t\)\/4/)
    assert.match(
      filterComplex,
      /xfade=transition=fade:duration=1:offset=3\[vout\]/,
    )
    assert.match(filterComplex, /format=yuv420p\[v0\]/)
    assert.match(filterComplex, /format=yuv420p\[v1\]/)
    assert.equal(args[args.lastIndexOf('-t') + 1], '7')
  })

  it('does not apply scene transforms to audio, overlay or text filters', () => {
    const args = builder.build(
      planWith({
        duration: 10,
        tracks: [
          videoTrack([
            {
              id: 'video-0',
              source: '/tmp/a.png',
              start: 0,
              duration: 10,
              mediaType: 'image',
              transform: { scale: 1.4, x: 80, y: 40 },
            },
          ]),
          audioTrack([
            {
              id: 'audio-0',
              source: '/tmp/voice.mp3',
              start: 2,
              duration: 3,
              volume: 1,
            },
          ]),
          {
            id: 'overlay',
            type: 'overlay',
            items: [
              {
                id: 'overlay-0',
                source: '/tmp/logo.png',
                start: 1,
                duration: 5,
                x: 80,
                y: 80,
                width: 280,
                height: 280,
              },
            ],
          } satisfies OverlayTrack,
          {
            id: 'text',
            type: 'text',
            items: [
              {
                id: 'text-0',
                content: 'Hello World',
                start: 2,
                duration: 5,
                x: 'center',
                y: 140,
                fontSize: 72,
                color: '#FFFFFF',
                fontPath: '/tmp/Arial.ttf',
              },
            ],
          } satisfies TextTrack,
        ],
      }),
    )

    const filterComplex = args[args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(filterComplex, /\[v0fit\]scale=iw\*1\.4:ih\*1\.4\[v0z\]/)
    assert.match(filterComplex, /atrim=0:3/)
    assert.match(filterComplex, /adelay=2000\|2000/)
    assert.match(filterComplex, /volume=1/)
    assert.match(filterComplex, /scale=280:280\[ov0\]/)
    assert.match(filterComplex, /overlay=80:80:enable='between\(t,1,6\)'/)
    assert.match(filterComplex, /drawtext=fontfile='\/tmp\/Arial.ttf'/)
    assert.match(filterComplex, /text='Hello World'/)
    assert.equal(filterComplex.includes('volume=1.4'), false)
  })
})
