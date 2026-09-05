import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'
import { LocalFileSourceResolver } from './LocalFileSourceResolver'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-file-source-'))
const resolver = new LocalFileSourceResolver()

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('LocalFileSourceResolver', () => {
  it('resolves an existing file outside the project', async () => {
    const filePath = path.join(tmpRoot, 'navio.jpg')
    fs.writeFileSync(filePath, 'image')

    const resolved = await resolver.resolve({ type: 'file', path: filePath })

    assert.equal(resolved.path, path.resolve(filePath))
  })

  it('rejects a missing file', async () => {
    await assert.rejects(
      () =>
        resolver.resolve({
          type: 'file',
          path: path.join(tmpRoot, 'missing.jpg'),
        }),
      /File source not found/,
    )
  })

  it('rejects a directory', async () => {
    await assert.rejects(
      () => resolver.resolve({ type: 'file', path: tmpRoot }),
      /File source is not a file/,
    )
  })
})
