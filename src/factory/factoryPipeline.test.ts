import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import type { Template } from '../interfaces/template'
import { VideoFactory } from './VideoFactory'

const tmpRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'video-lab-factory-pipe-'),
)
const mediaPaths = {
  images: path.join(tmpRoot, 'images'),
  audios: path.join(tmpRoot, 'audios'),
  videos: path.join(tmpRoot, 'videos'),
  outputVideos: path.join(tmpRoot, 'output'),
}

const template: Template = {
  name: 'pipeline',
  version: 1,
  variables: {
    title: { type: 'string', required: true },
    background: { type: 'asset', required: true },
  },
  composition: {
    output: 'pipeline.mp4',
    width: 128,
    height: 128,
    fps: 25,
    scenes: [{ type: 'image', source: '{{background}}', duration: 1 }],
  },
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

describe('factory pipeline', () => {
  it('runs a 3-job batch with concurrency 2 through the renderer', async () => {
    let active = 0
    let maxActive = 0
    const executed: string[] = []

    const factory = new VideoFactory({
      maxConcurrentRenders: 2,
      mediaPaths,
      rendererOptions: {
        executor: {
          async execute(args) {
            active += 1
            maxActive = Math.max(maxActive, active)
            executed.push(args.at(-1) ?? '')
            await new Promise((resolve) => setTimeout(resolve, 80))
            active -= 1
          },
        },
      },
    })

    const manifest = await factory.renderTemplate({
      template,
      inputs: [
        { variables: { title: 'A', background: 'frame.png' } },
        { variables: { title: 'B', background: 'frame.png' } },
        { variables: { title: 'C', background: 'frame.png' } },
      ],
    })

    assert.equal(manifest.total, 3)
    assert.equal(manifest.completed, 3)
    assert.equal(manifest.failed, 0)
    assert.ok(maxActive <= 2)
    assert.equal(maxActive, 2)
    assert.equal(executed.length, 3)
    assert.equal(new Set(executed).size, 3)
  })

  it('keeps two successful jobs when one input fails', async () => {
    const factory = new VideoFactory({
      maxConcurrentRenders: 2,
      mediaPaths,
      rendererOptions: {
        executor: { async execute() {} },
      },
    })

    const manifest = await factory.renderTemplate({
      template,
      inputs: [
        { variables: { title: 'A', background: 'frame.png' } },
        { variables: { title: 'B' } },
        { variables: { title: 'C', background: 'frame.png' } },
      ],
    })

    assert.equal(manifest.completed, 2)
    assert.equal(manifest.failed, 1)
    assert.equal(manifest.jobs[1]?.status, 'failed')
  })

  it('runs a 100-job stress batch without dropping or colliding outputs', async () => {
    const seen = new Set<string>()
    const factory = new VideoFactory({
      maxConcurrentRenders: 4,
      mediaPaths: {
        ...mediaPaths,
        outputVideos: path.join(tmpRoot, 'stress'),
      },
      rendererOptions: {
        executor: {
          async execute(args) {
            const output = args.at(-1) ?? ''
            if (seen.has(output)) {
              throw new Error(`Output executed twice: ${output}`)
            }
            seen.add(output)
          },
        },
      },
    })

    const inputs = Array.from({ length: 100 }, (_, index) => ({
      variables: {
        title: `Video ${index + 1}`,
        background: 'frame.png',
      },
    }))

    const manifest = await factory.renderTemplate({
      template,
      inputs,
    })

    assert.equal(manifest.total, 100)
    assert.equal(manifest.completed, 100)
    assert.equal(manifest.failed, 0)
    assert.equal(manifest.cancelled, 0)
    assert.equal(seen.size, 100)
    assert.equal(new Set(manifest.jobs.map((job) => job.outputPath)).size, 100)
    assert.equal(manifest.jobs[99]?.jobId, 'job-100')
  })
})
