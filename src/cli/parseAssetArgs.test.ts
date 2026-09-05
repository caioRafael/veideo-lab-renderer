import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseAssetArgs } from './parseAssetArgs'

describe('parseAssetArgs', () => {
  it('parses import', () => {
    assert.deepEqual(parseAssetArgs(['import', '/tmp/foto.jpg']), {
      command: 'import',
      path: '/tmp/foto.jpg',
    })
  })

  it('parses list', () => {
    assert.deepEqual(parseAssetArgs(['list']), { command: 'list' })
  })

  it('parses get', () => {
    assert.deepEqual(parseAssetArgs(['get', 'asset_123']), {
      command: 'get',
      id: 'asset_123',
    })
  })

  it('rejects an unknown command', () => {
    assert.throws(() => parseAssetArgs(['render']), /Usage: pnpm asset/)
  })
})
