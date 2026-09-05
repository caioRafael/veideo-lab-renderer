import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'
import { LocalAssetManager } from '../asset/LocalAssetManager'
import type { Composition } from '../interfaces/composition'
import { LocalFileStorage } from '../storage/LocalFileStorage'
import { createSourceResolver } from './createSourceResolver'
import { materializeCompositionSources } from './materializeCompositionSources'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-materialize-'))

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('materializeCompositionSources', () => {
  it('keeps a string source unchanged', async () => {
    const composition: Composition = {
      output: 'out.mp4',
      width: 64,
      height: 64,
      fps: 25,
      scenes: [{ type: 'image', source: 'foto.jpg', duration: 4 }],
    }

    const materialized = await materializeCompositionSources(
      composition,
      createSourceResolver({ storageDir: path.join(tmpRoot, 'unused') }),
      { downloadDir: path.join(tmpRoot, 'downloads') },
    )

    assert.equal(materialized.scenes[0]?.source, 'foto.jpg')
  })

  it('resolves file, asset and url sources to local paths', async () => {
    const filePath = path.join(tmpRoot, 'outside.jpg')
    fs.writeFileSync(filePath, 'file')
    const importPath = path.join(tmpRoot, 'imported.png')
    fs.writeFileSync(importPath, 'asset')
    const manager = new LocalAssetManager(
      new LocalFileStorage(path.join(tmpRoot, 'storage')),
    )
    const asset = await manager.import({ path: importPath })
    const downloadDir = path.join(tmpRoot, 'downloads')
    const resolver = createSourceResolver({
      assetManager: manager,
      download: async (_url, destPath) => {
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true })
        await fs.promises.writeFile(destPath, 'url')
      },
    })

    const materialized = await materializeCompositionSources(
      {
        output: 'out.mp4',
        width: 64,
        height: 64,
        fps: 25,
        scenes: [
          {
            type: 'image',
            source: { type: 'file', path: filePath },
            duration: 2,
          },
          {
            type: 'image',
            source: { type: 'asset', id: asset.id },
            duration: 2,
          },
          {
            type: 'image',
            source: { type: 'url', url: 'https://example.com/foto.jpg' },
            duration: 2,
          },
        ],
      },
      resolver,
      { downloadDir },
    )

    assert.equal(materialized.scenes[0]?.source, path.resolve(filePath))
    assert.equal(materialized.scenes[1]?.source, asset.path)
    assert.equal(
      typeof materialized.scenes[2]?.source === 'string' &&
        materialized.scenes[2].source.startsWith(downloadDir),
      true,
    )
  })
})
