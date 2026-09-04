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
    assert.equal(
      result.outputPath,
      path.join(mediaPaths.outputVideos, 'result.mp4'),
    )
    assert.equal(result.args[0], '-y')
    assert.ok(result.args.includes(path.join(mediaPaths.images, 'frame.png')))
    assert.ok(result.args.includes(path.join(mediaPaths.audios, 'track.mp3')))
    assert.equal(result.args.at(-1), result.outputPath)
  })

  it('prepares the command without executing FFmpeg', () => {
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

    const prepared = renderer.prepare({
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
})
