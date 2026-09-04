import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Composition } from '../interfaces/composition'
import { createRenderJob, formatJobId } from './createRenderJob'

const composition: Composition = {
  output: 'out.mp4',
  width: 1920,
  height: 1080,
  fps: 25,
  scenes: [{ type: 'image', source: 'frame.png', duration: 2 }],
}

describe('createRenderJob', () => {
  it('creates a queued job with a cloned composition', () => {
    const job = createRenderJob({
      id: 'job-001',
      composition,
      outputPath: '/tmp/job-001/video.mp4',
    })

    assert.equal(job.id, 'job-001')
    assert.equal(job.status, 'queued')
    assert.equal(job.attempt, 0)
    assert.equal(job.outputPath, '/tmp/job-001/video.mp4')
    assert.notEqual(job.composition, composition)
    assert.deepEqual(job.composition, composition)

    job.composition.output = 'mutated.mp4'
    assert.equal(composition.output, 'out.mp4')
  })
})

describe('formatJobId', () => {
  it('formats deterministic zero-padded ids', () => {
    assert.equal(formatJobId(0), 'job-001')
    assert.equal(formatJobId(11), 'job-012')
  })
})
