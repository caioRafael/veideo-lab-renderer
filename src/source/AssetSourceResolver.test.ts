import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'
import { LocalAssetManager } from '../asset/LocalAssetManager'
import { LocalFileStorage } from '../storage/LocalFileStorage'
import { AssetSourceResolver } from './AssetSourceResolver'

const tmpRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'video-lab-asset-source-'),
)

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('AssetSourceResolver', () => {
  it('resolves a stored asset to its local file', async () => {
    const sourcePath = path.join(tmpRoot, 'navio.jpg')
    fs.writeFileSync(sourcePath, 'image')
    const manager = new LocalAssetManager(
      new LocalFileStorage(path.join(tmpRoot, 'storage')),
    )
    const asset = await manager.import({ path: sourcePath })
    const resolver = new AssetSourceResolver(manager)

    const resolved = await resolver.resolve({ type: 'asset', id: asset.id })

    assert.equal(resolved.path, asset.path)
    assert.equal(fs.existsSync(resolved.path), true)
  })

  it('rejects an unknown asset id', async () => {
    const resolver = new AssetSourceResolver(
      new LocalAssetManager(new LocalFileStorage(path.join(tmpRoot, 'empty'))),
    )

    await assert.rejects(
      () => resolver.resolve({ type: 'asset', id: 'asset_missing' }),
      /Asset "asset_missing" was not found/,
    )
  })
})
