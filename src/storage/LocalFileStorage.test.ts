import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'
import { LocalFileStorage } from './LocalFileStorage'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-storage-'))

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('LocalFileStorage', () => {
  it('rejects keys that escape the storage root', async () => {
    const storage = new LocalFileStorage(path.join(tmpRoot, 'root'))

    await assert.rejects(
      () => storage.get('../../etc/passwd'),
      /Invalid storage key/,
    )
  })

  it('copies a file under the given key', async () => {
    const source = path.join(tmpRoot, 'in.jpg')
    fs.writeFileSync(source, 'bytes')
    const storage = new LocalFileStorage(path.join(tmpRoot, 'root'))

    const dest = await storage.put('asset_1/original.jpg', source)

    assert.equal(fs.readFileSync(dest, 'utf8'), 'bytes')
    assert.equal(await storage.exists('asset_1/original.jpg'), true)
  })
})
