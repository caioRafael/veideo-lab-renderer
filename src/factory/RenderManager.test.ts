import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { FfmpegProcessError } from '../ffmpeg/FfmpegProcessError'
import type { FfmpegExecutor } from '../ffmpeg/FfmpegExecutor'
import type { Composition } from '../interfaces/composition'
import type { FactoryProgress } from '../interfaces/factory'
import { MediaResolver } from '../media/MediaResolver'
import { Renderer } from '../renderer/Renderer'
import { createRenderJob } from './createRenderJob'
import { RenderManager } from './RenderManager'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-manager-'))
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
})

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

function composition(output: string): Composition {
  return {
    output,
    width: 64,
    height: 64,
    fps: 25,
    scenes: [{ type: 'image', source: 'frame.png', duration: 1 }],
  }
}

function job(id: string, output = `${id}/video.mp4`) {
  return createRenderJob({
    id,
    composition: composition(output),
    outputPath: path.join(mediaPaths.outputVideos, output),
  })
}

function manager(
  executor: FfmpegExecutor,
  options: { maxConcurrentRenders: number; maxRetries?: number } = {
    maxConcurrentRenders: 1,
  },
) {
  return new RenderManager(options, {
    createRenderer: () =>
      new Renderer({
        mediaResolver: new MediaResolver(mediaPaths),
        executor,
      }),
  })
}

function ffmpegError(): FfmpegProcessError {
  return new FfmpegProcessError({
    binary: 'ffmpeg',
    exitCode: 1,
    signal: null,
    stderr: 'boom',
  })
}

describe('RenderManager', () => {
  it('rejects invalid concurrency', () => {
    assert.throws(
      () =>
        new RenderManager(
          { maxConcurrentRenders: 0 },
          {
            createRenderer: () =>
              new Renderer({ mediaResolver: new MediaResolver(mediaPaths) }),
          },
        ),
      /Invalid concurrency/,
    )
  })

  it('renders a single job to completion', async () => {
    const current = manager({ async execute() {} })
    current.enqueue(job('job-001'))
    const manifest = await current.run()

    assert.equal(manifest.total, 1)
    assert.equal(manifest.completed, 1)
    assert.equal(manifest.jobs[0]?.status, 'completed')
    assert.equal(
      manifest.jobs[0]?.outputPath?.endsWith('job-001/video.mp4'),
      true,
    )
  })

  it('renders multiple jobs with unique outputs', async () => {
    const current = manager({ async execute() {} }, { maxConcurrentRenders: 2 })
    current.enqueue(job('job-001'))
    current.enqueue(job('job-002'))
    current.enqueue(job('job-003'))
    const manifest = await current.run()

    assert.equal(manifest.completed, 3)
    assert.deepEqual(
      new Set(manifest.jobs.map((item) => item.outputPath)),
      new Set([
        path.join(mediaPaths.outputVideos, 'job-001/video.mp4'),
        path.join(mediaPaths.outputVideos, 'job-002/video.mp4'),
        path.join(mediaPaths.outputVideos, 'job-003/video.mp4'),
      ]),
    )
  })

  it('limits concurrent FFmpeg executions', async () => {
    let active = 0
    let maxActive = 0
    const current = manager(
      {
        async execute() {
          active += 1
          maxActive = Math.max(maxActive, active)
          await new Promise((resolve) => setTimeout(resolve, 30))
          active -= 1
        },
      },
      { maxConcurrentRenders: 2 },
    )

    current.enqueue(job('job-001'))
    current.enqueue(job('job-002'))
    current.enqueue(job('job-003'))
    await current.run()

    assert.equal(maxActive, 2)
    assert.ok(maxActive <= 2)
  })

  it('isolates a failed job from the rest of the batch', async () => {
    const current = manager({
      async execute(args) {
        const output = args.at(-1) ?? ''
        if (output.includes('job-002')) {
          throw new Error('Asset not found: missing.png')
        }
      },
    })

    current.enqueue(job('job-001'))
    current.enqueue(job('job-002'))
    current.enqueue(job('job-003'))
    const manifest = await current.run()

    assert.equal(manifest.completed, 2)
    assert.equal(manifest.failed, 1)
    assert.equal(manifest.jobs[1]?.status, 'failed')
    assert.match(manifest.jobs[1]?.error ?? '', /Asset not found/)
  })

  it('retries retryable FFmpeg errors up to maxRetries extra attempts', async () => {
    let attempts = 0
    const current = manager(
      {
        async execute() {
          attempts += 1
          if (attempts < 3) {
            throw ffmpegError()
          }
        },
      },
      { maxConcurrentRenders: 1, maxRetries: 2 },
    )

    current.enqueue(job('job-001'))
    const manifest = await current.run()

    assert.equal(attempts, 3)
    assert.equal(manifest.completed, 1)
    assert.equal(manifest.jobs[0]?.attempt, 3)
  })

  it('does not retry deterministic errors', async () => {
    let attempts = 0
    const current = manager(
      {
        async execute() {
          attempts += 1
          throw new Error('Asset not found: /tmp/missing.png')
        },
      },
      { maxConcurrentRenders: 1, maxRetries: 2 },
    )

    current.enqueue(job('job-001'))
    const manifest = await current.run()

    assert.equal(attempts, 1)
    assert.equal(manifest.failed, 1)
  })

  it('cancels queued jobs without starting them', async () => {
    const started: string[] = []
    const current = manager({
      async execute(args) {
        started.push(args.at(-1) ?? '')
        await new Promise((resolve) => setTimeout(resolve, 40))
      },
    })

    current.enqueue(job('job-001'))
    current.enqueue(job('job-002'))
    current.enqueue(job('job-003'))

    const running = current.run()
    await new Promise((resolve) => setTimeout(resolve, 10))
    current.cancel()
    const manifest = await running

    assert.ok(started.length <= 1)
    assert.equal(manifest.cancelled + manifest.completed, 3)
    assert.ok(manifest.cancelled >= 2)
  })

  it('aggregates factory progress', async () => {
    const snapshots: FactoryProgress[] = []
    const current = new RenderManager(
      { maxConcurrentRenders: 1 },
      {
        createRenderer: () =>
          new Renderer({
            mediaResolver: new MediaResolver(mediaPaths),
            executor: { async execute() {} },
          }),
        onProgress: (event) => {
          snapshots.push(event.factory)
        },
      },
    )

    current.enqueue(job('job-001'))
    current.enqueue(job('job-002'))
    await current.run()

    assert.ok(snapshots.some((item) => item.queued === 1 || item.active === 1))
    assert.equal(snapshots.at(-1)?.completed, 2)
    assert.equal(snapshots.at(-1)?.total, 2)
  })
})
