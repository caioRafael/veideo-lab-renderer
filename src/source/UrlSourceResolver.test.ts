import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'
import { UrlSourceResolver } from './UrlSourceResolver'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-url-source-'))
const downloadDir = path.join(tmpRoot, 'downloads')

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('UrlSourceResolver', () => {
  it('downloads a valid URL into the render download directory', async () => {
    const resolver = new UrlSourceResolver(async (_url, destPath) => {
      await fs.promises.mkdir(path.dirname(destPath), { recursive: true })
      await fs.promises.writeFile(destPath, 'downloaded')
    })

    const resolved = await resolver.resolve(
      { type: 'url', url: 'https://example.com/foto.jpg' },
      { downloadDir },
    )

    assert.equal(path.dirname(resolved.path), downloadDir)
    assert.match(path.basename(resolved.path), /^url-.*\.jpg$/)
    assert.equal(fs.readFileSync(resolved.path, 'utf8'), 'downloaded')
  })

  it('rejects a non-HTTP URL', async () => {
    const resolver = new UrlSourceResolver()

    await assert.rejects(
      () =>
        resolver.resolve(
          { type: 'url', url: 'file:///tmp/foto.jpg' },
          { downloadDir },
        ),
      /only HTTP and HTTPS/,
    )
  })

  it('rejects an invalid URL', async () => {
    const resolver = new UrlSourceResolver()

    await assert.rejects(
      () =>
        resolver.resolve({ type: 'url', url: 'not-a-url' }, { downloadDir }),
      /Invalid URL source/,
    )
  })
})
