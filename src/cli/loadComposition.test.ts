import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { loadComposition } from './loadComposition'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-cli-'))

before(() => {
  fs.writeFileSync(path.join(tmpRoot, 'broken.json'), '{ not json')
  fs.writeFileSync(
    path.join(tmpRoot, 'invalid.json'),
    JSON.stringify({ scenes: [] }),
  )
})

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('loadComposition', () => {
  it('throws when the composition file does not exist', () => {
    const missingPath = path.join(tmpRoot, 'missing.json')

    assert.throws(
      () => loadComposition(missingPath),
      /Composition file not found/,
    )
  })

  it('throws when the file is not valid JSON', () => {
    assert.throws(
      () => loadComposition(path.join(tmpRoot, 'broken.json')),
      /Invalid composition JSON/,
    )
  })

  it('throws when the composition fails validation', () => {
    assert.throws(
      () => loadComposition(path.join(tmpRoot, 'invalid.json')),
      /expected a non-empty scenes array/,
    )
  })
})
