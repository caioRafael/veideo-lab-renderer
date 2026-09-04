import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { removeTemporaryDirectory } from './rasterizeTextTrack'

describe('removeTemporaryDirectory', () => {
  it('deletes the directory and its files', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-text-'))
    fs.writeFileSync(path.join(directory, 'text-0-0.png'), 'png')

    removeTemporaryDirectory(directory)

    assert.equal(fs.existsSync(directory), false)
  })

  it('does not throw when the directory is already gone', () => {
    const directory = path.join(os.tmpdir(), 'video-lab-text-missing')

    assert.doesNotThrow(() => removeTemporaryDirectory(directory))
  })
})
