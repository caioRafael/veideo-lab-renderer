import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Composition } from '../interfaces/composition'
import { createRenderJob } from './createRenderJob'
import { RenderQueue } from './RenderQueue'

const composition: Composition = {
  output: 'out.mp4',
  width: 64,
  height: 64,
  fps: 25,
  scenes: [{ type: 'image', source: 'frame.png', duration: 1 }],
}

function makeJob(id: string) {
  return createRenderJob({
    id,
    composition,
    outputPath: `/tmp/${id}.mp4`,
  })
}

describe('RenderQueue', () => {
  it('dequeues jobs in FIFO order', () => {
    const queue = new RenderQueue()
    queue.enqueue(makeJob('job-001'))
    queue.enqueue(makeJob('job-002'))
    queue.enqueue(makeJob('job-003'))

    assert.equal(queue.dequeue()?.id, 'job-001')
    assert.equal(queue.dequeue()?.id, 'job-002')
    assert.equal(queue.dequeue()?.id, 'job-003')
    assert.equal(queue.dequeue(), undefined)
  })

  it('tracks queued and total counts', () => {
    const queue = new RenderQueue()
    queue.enqueue(makeJob('job-001'))
    queue.enqueue(makeJob('job-002'))
    queue.dequeue()

    assert.equal(queue.queuedCount(), 1)
    assert.equal(queue.progress().total, 2)
    assert.equal(queue.progress().queued, 1)
  })

  it('requeues a job at the end of the FIFO', () => {
    const queue = new RenderQueue()
    const first = makeJob('job-001')
    queue.enqueue(first)
    queue.enqueue(makeJob('job-002'))
    queue.dequeue()
    queue.requeue(first)

    assert.equal(queue.dequeue()?.id, 'job-002')
    assert.equal(queue.dequeue()?.id, 'job-001')
  })
})
