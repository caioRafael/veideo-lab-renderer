import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'
import { AssetSourceResolver } from './AssetSourceResolver'

const tmpRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'video-lab-asset-source-'),
)

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('AssetSourceResolver', () => {
  it('resolves a provided asset id to its local file', async () => {
    const sourcePath = path.join(tmpRoot, 'navio.jpg')
    fs.writeFileSync(sourcePath, 'image')
    const resolver = new AssetSourceResolver({
      navio: sourcePath,
    })

    const resolved = await resolver.resolve({ type: 'asset', id: 'navio' })

    assert.equal(resolved.path, path.resolve(sourcePath))
    assert.equal(fs.existsSync(resolved.path), true)
  })

  it('rejects an unknown asset id', async () => {
    const resolver = new AssetSourceResolver({})

    await assert.rejects(
      () => resolver.resolve({ type: 'asset', id: 'missing' }),
      /Asset "missing" was not found/,
    )
  })
})
