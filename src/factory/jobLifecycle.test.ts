import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRenderJob } from './createRenderJob'
import { canTransition, transitionJob } from './jobLifecycle'

function job() {
  return createRenderJob({
    id: 'job-001',
    composition: {
      output: 'out.mp4',
      width: 64,
      height: 64,
      fps: 25,
      scenes: [{ type: 'image', source: 'frame.png', duration: 1 }],
    },
    outputPath: '/tmp/out.mp4',
  })
}

describe('jobLifecycle', () => {
  it('allows the happy path', () => {
    const current = job()
    transitionJob(current, 'preparing')
    transitionJob(current, 'rendering')
    transitionJob(current, 'completed')
    assert.equal(current.status, 'completed')
  })

  it('allows queued to cancelled', () => {
    const current = job()
    transitionJob(current, 'cancelled')
    assert.equal(current.status, 'cancelled')
  })

  it('allows preparing and rendering to fail or cancel', () => {
    assert.equal(canTransition('preparing', 'failed'), true)
    assert.equal(canTransition('preparing', 'cancelled'), true)
    assert.equal(canTransition('rendering', 'failed'), true)
    assert.equal(canTransition('rendering', 'cancelled'), true)
  })

  it('allows failed to queued for retry', () => {
    const current = job()
    transitionJob(current, 'preparing')
    transitionJob(current, 'failed')
    transitionJob(current, 'queued')
    assert.equal(current.status, 'queued')
  })

  it('rejects invalid transitions', () => {
    const current = job()
    assert.throws(
      () => transitionJob(current, 'completed'),
      /Invalid job transition: queued → completed/,
    )
    assert.equal(canTransition('completed', 'cancelled'), false)
    assert.equal(canTransition('cancelled', 'queued'), false)
  })
})
