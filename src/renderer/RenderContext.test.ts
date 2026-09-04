import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import {
  countTemporaryFiles,
  createRenderContext,
  disposeRenderContext,
} from './RenderContext'

describe('RenderContext', () => {
  it('creates isolated temporary directories', () => {
    const first = createRenderContext()
    const second = createRenderContext()

    try {
      assert.notEqual(first.id, second.id)
      assert.notEqual(first.tempDir, second.tempDir)
      assert.equal(fs.existsSync(first.textDir), true)
      assert.equal(fs.existsSync(second.intermediateDir), true)
    } finally {
      disposeRenderContext(first)
      disposeRenderContext(second)
    }

    assert.equal(fs.existsSync(first.tempDir), false)
    assert.equal(fs.existsSync(second.tempDir), false)
  })

  it('counts files created for a render', () => {
    const context = createRenderContext()

    try {
      fs.writeFileSync(path.join(context.textDir, 'text-0.png'), 'png')
      fs.writeFileSync(path.join(context.intermediateDir, 'note.txt'), 'ok')
      assert.equal(countTemporaryFiles(context.tempDir), 2)
    } finally {
      disposeRenderContext(context)
    }
  })
})
