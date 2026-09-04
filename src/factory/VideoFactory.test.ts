import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import type { Template } from '../interfaces/template'
import { VideoFactory } from './VideoFactory'
import { parseBatchInput } from './loadBatchInput'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-factory-'))
const mediaPaths = {
  images: path.join(tmpRoot, 'images'),
  audios: path.join(tmpRoot, 'audios'),
  videos: path.join(tmpRoot, 'videos'),
  outputVideos: path.join(tmpRoot, 'output'),
}

const template: Template = {
  name: 'factory-demo',
  version: 1,
  variables: {
    title: { type: 'string', required: true },
    background: { type: 'asset', required: true },
  },
  composition: {
    output: 'from-template.mp4',
    width: 64,
    height: 64,
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

describe('parseBatchInput', () => {
  it('reads an items array', () => {
    const inputs = parseBatchInput({
      items: [{ title: 'One' }, { title: 'Two' }],
    })

    assert.deepEqual(inputs, [
      { variables: { title: 'One' } },
      { variables: { title: 'Two' } },
    ])
  })

  it('reads a raw array of inputs', () => {
    assert.equal(parseBatchInput([{ title: 'A' }]).length, 1)
  })
})

describe('VideoFactory', () => {
  it('resolves independent compositions and writes a manifest', async () => {
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
        { variables: { title: 'One', background: 'frame.png' } },
        { variables: { title: 'Two', background: 'frame.png' } },
        { variables: { title: 'Three', background: 'frame.png' } },
      ],
    })

    assert.equal(manifest.total, 3)
    assert.equal(manifest.completed, 3)
    assert.deepEqual(
      manifest.jobs.map((job) => job.jobId),
      ['job-001', 'job-002', 'job-003'],
    )
    assert.deepEqual(
      manifest.jobs.map((job) => job.outputPath),
      ['job-001/video.mp4', 'job-002/video.mp4', 'job-003/video.mp4'],
    )
    assert.equal(
      fs.existsSync(path.join(mediaPaths.outputVideos, 'manifest.json')),
      true,
    )
  })

  it('isolates a resolve error from the rest of the batch', async () => {
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
        { variables: { title: 'One', background: 'frame.png' } },
        { variables: { background: 'frame.png' } },
        { variables: { title: 'Three', background: 'frame.png' } },
      ],
    })

    assert.equal(manifest.completed, 2)
    assert.equal(manifest.failed, 1)
    assert.equal(manifest.jobs[1]?.status, 'failed')
    assert.match(manifest.jobs[1]?.error ?? '', /title/)
  })

  it('cancels the remaining batch when the factory signal aborts', async () => {
    const controller = new AbortController()
    const factory = new VideoFactory({
      maxConcurrentRenders: 1,
      mediaPaths,
      rendererOptions: {
        executor: {
          async execute() {
            controller.abort()
            await new Promise((resolve) => setTimeout(resolve, 20))
          },
        },
      },
    })

    const manifest = await factory.renderTemplate({
      template,
      inputs: [
        { variables: { title: 'One', background: 'frame.png' } },
        { variables: { title: 'Two', background: 'frame.png' } },
        { variables: { title: 'Three', background: 'frame.png' } },
      ],
      signal: controller.signal,
    })

    assert.equal(manifest.total, 3)
    assert.ok(manifest.cancelled >= 1)
    assert.equal(manifest.completed + manifest.failed + manifest.cancelled, 3)
  })
})
