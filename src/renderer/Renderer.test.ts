import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import type { FfmpegExecutor } from '../ffmpeg/FfmpegExecutor'
import type { Composition } from '../interfaces/composition'
import { MediaResolver } from '../media/MediaResolver'
import { Renderer } from './Renderer'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-renderer-'))
const mediaPaths = {
  images: path.join(tmpRoot, 'images'),
  audios: path.join(tmpRoot, 'audios'),
  videos: path.join(tmpRoot, 'videos'),
  outputVideos: path.join(tmpRoot, 'output'),
}

before(() => {
  fs.mkdirSync(mediaPaths.images, { recursive: true })
  fs.mkdirSync(mediaPaths.audios, { recursive: true })
  fs.mkdirSync(mediaPaths.videos, { recursive: true })
  fs.writeFileSync(path.join(mediaPaths.images, 'frame.png'), 'image')
  fs.writeFileSync(path.join(mediaPaths.audios, 'track.mp3'), 'audio')
})

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('Renderer', () => {
  it('orchestrates a render plan and delegates execution', async () => {
    const executed: string[][] = []
    const executor: FfmpegExecutor = {
      async execute(args) {
        executed.push(args)
      },
    }

    const composition: Composition = {
      output: 'result.mp4',
      width: 1920,
      height: 1080,
      fps: 25,
      scenes: [{ type: 'image', source: 'frame.png', duration: 4 }],
      audio: [{ source: 'track.mp3', role: 'focus', start: 0, duration: 4 }],
    }

    const renderer = new Renderer({
      mediaResolver: new MediaResolver(mediaPaths),
      executor,
    })

    const result = await renderer.render(composition)

    assert.equal(executed.length, 1)
    assert.ok(result.metrics.renderFactor >= 0)
    assert.equal(result.metrics.sceneCount, 1)
    assert.equal(result.metrics.audioCount, 1)
    assert.equal(
      result.outputPath,
      path.join(mediaPaths.outputVideos, 'result.mp4'),
    )
    assert.equal(result.args[0], '-y')
    assert.ok(result.args.includes(path.join(mediaPaths.images, 'frame.png')))
    assert.ok(result.args.includes(path.join(mediaPaths.audios, 'track.mp3')))
    assert.equal(result.args.at(-1), result.outputPath)
  })

  it('prepares the command without executing FFmpeg', async () => {
    const executed: string[][] = []
    const executor: FfmpegExecutor = {
      async execute(args) {
        executed.push(args)
      },
    }

    const renderer = new Renderer({
      mediaResolver: new MediaResolver(mediaPaths),
      executor,
    })

    const prepared = await renderer.prepare({
      output: 'result.mp4',
      width: 1920,
      height: 1080,
      fps: 25,
      scenes: [{ type: 'image', source: 'frame.png', duration: 4 }],
    })

    assert.equal(executed.length, 0)
    assert.equal(prepared.args[0], '-y')
    assert.equal(
      prepared.outputPath,
      path.join(mediaPaths.outputVideos, 'result.mp4'),
    )
  })

  it('cleans temporary files after execution fails', async () => {
    const renderer = new Renderer({
      mediaResolver: new MediaResolver(mediaPaths),
      executor: {
        async execute() {
          throw new Error('ffmpeg failed')
        },
      },
    })

    await assert.rejects(() => renderer.execute(['-y']), /ffmpeg failed/)
    assert.doesNotThrow(() => renderer.cleanupTemporaryFiles())
  })

  it('rejects a short video when shortMedia is error', async () => {
    fs.writeFileSync(path.join(mediaPaths.videos, 'clip.mp4'), 'video')

    const renderer = new Renderer({
      mediaResolver: new MediaResolver(mediaPaths),
      mediaDurationProbe: () => 4,
    })

    await assert.rejects(
      () =>
        renderer.prepare({
          output: 'result.mp4',
          width: 1920,
          height: 1080,
          fps: 25,
          scenes: [{ type: 'video', source: 'clip.mp4', duration: 10 }],
        }),
      /Video media is shorter than scene duration/,
    )
  })

  it('allows a short video when shortMedia is loop', async () => {
    fs.writeFileSync(path.join(mediaPaths.videos, 'clip.mp4'), 'video')

    const renderer = new Renderer({
      mediaResolver: new MediaResolver(mediaPaths),
      mediaDurationProbe: () => 3,
    })

    const prepared = await renderer.prepare({
      output: 'result.mp4',
      width: 1920,
      height: 1080,
      fps: 25,
      scenes: [
        {
          type: 'video',
          source: 'clip.mp4',
          duration: 10,
          shortMedia: 'loop',
        },
      ],
    })

    assert.equal(prepared.args.includes('-stream_loop'), false)
    assert.deepEqual(prepared.args.slice(1, 5), [
      '-t',
      '3',
      '-i',
      path.join(mediaPaths.videos, 'clip.mp4'),
    ])
    const filterComplex =
      prepared.args[prepared.args.indexOf('-filter_complex') + 1]
    assert.ok(filterComplex)
    assert.match(filterComplex, /split=4/)
    assert.match(filterComplex, /concat=n=4:v=1:a=0/)
  })

  it('emits progress phases from planning to completed', async () => {
    const phases: string[] = []
    const renderer = new Renderer({
      mediaResolver: new MediaResolver(mediaPaths),
      executor: {
        async execute() {},
      },
    })

    await renderer.render(
      {
        output: 'result.mp4',
        width: 1920,
        height: 1080,
        fps: 25,
        scenes: [{ type: 'image', source: 'frame.png', duration: 4 }],
      },
      {
        onProgress: (progress) => {
          phases.push(progress.phase)
          assert.ok(progress.progress >= 0 && progress.progress <= 1)
        },
      },
    )

    assert.ok(phases.includes('planning'))
    assert.ok(phases.includes('preparing'))
    assert.ok(phases.includes('rendering'))
    assert.ok(phases.includes('completed'))
    assert.equal(phases.at(-1), 'completed')
  })

  it('aborts before FFmpeg when the signal is already aborted', async () => {
    const executed: string[][] = []
    const renderer = new Renderer({
      mediaResolver: new MediaResolver(mediaPaths),
      executor: {
        async execute(args) {
          executed.push(args)
        },
      },
    })
    const controller = new AbortController()
    controller.abort()

    await assert.rejects(
      () =>
        renderer.render(
          {
            output: 'result.mp4',
            width: 1920,
            height: 1080,
            fps: 25,
            scenes: [{ type: 'image', source: 'frame.png', duration: 4 }],
          },
          { signal: controller.signal },
        ),
      /cancelled/i,
    )
    assert.equal(executed.length, 0)
  })

  it('cleans the render context after a failed execute', async () => {
    const renderer = new Renderer({
      mediaResolver: new MediaResolver(mediaPaths),
      executor: {
        async execute() {
          throw new Error('ffmpeg failed')
        },
      },
    })

    const prepared = await renderer.prepare({
      output: 'result.mp4',
      width: 1920,
      height: 1080,
      fps: 25,
      scenes: [{ type: 'image', source: 'frame.png', duration: 4 }],
    })

    assert.equal(fs.existsSync(prepared.context.tempDir), true)
    await assert.rejects(() => renderer.runPrepared(prepared), /ffmpeg failed/)
    assert.equal(fs.existsSync(prepared.context.tempDir), false)
  })
})
