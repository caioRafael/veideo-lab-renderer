import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'
import { LocalFileStorage } from '../storage/LocalFileStorage'
import { isAssetId } from './createAssetId'
import { LocalAssetManager } from './LocalAssetManager'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-assets-'))

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('LocalAssetManager', () => {
  it('copies an external file into storage and returns an asset', async () => {
    const sourcePath = path.join(tmpRoot, 'navio.jpg')
    fs.writeFileSync(sourcePath, 'ship-bytes')
    const manager = new LocalAssetManager(
      new LocalFileStorage(path.join(tmpRoot, 'storage')),
    )

    const asset = await manager.import({ path: sourcePath })

    assert.equal(isAssetId(asset.id), true)
    assert.notEqual(asset.id, 'asset_navio.jpg')
    assert.equal(asset.name, 'navio.jpg')
    assert.equal(asset.type, 'image')
    assert.equal(asset.mimeType, 'image/jpeg')
    assert.equal(asset.size, 'ship-bytes'.length)
    assert.equal(fs.readFileSync(asset.path, 'utf8'), 'ship-bytes')
    assert.equal(fs.readFileSync(sourcePath, 'utf8'), 'ship-bytes')
    assert.equal(asset.path.includes(asset.id), true)
    assert.equal(path.basename(asset.path), 'original.jpg')
    assert.deepEqual(await manager.get(asset.id), asset)
    assert.equal(await manager.exists(asset.id), true)
  })

  it('lists imported assets and deletes them', async () => {
    const sourcePath = path.join(tmpRoot, 'clip.mp4')
    fs.writeFileSync(sourcePath, 'video')
    const manager = new LocalAssetManager(
      new LocalFileStorage(path.join(tmpRoot, 'list-storage')),
    )

    const asset = await manager.import({ path: sourcePath })
    const listed = await manager.list()

    assert.equal(listed.length, 1)
    assert.equal(listed[0]?.id, asset.id)
    assert.equal(listed[0]?.type, 'video')

    await manager.delete(asset.id)
    assert.equal(await manager.exists(asset.id), false)
    assert.equal((await manager.list()).length, 0)
  })

  it('rejects a missing import path', async () => {
    const manager = new LocalAssetManager(
      new LocalFileStorage(path.join(tmpRoot, 'missing-storage')),
    )

    await assert.rejects(
      () => manager.import({ path: path.join(tmpRoot, 'nope.jpg') }),
      /Import path not found/,
    )
  })
})
