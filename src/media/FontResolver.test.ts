import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { FontResolver } from './FontResolver'

const fontsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-fonts-'))
const resolver = new FontResolver(fontsDir)

before(() => {
  fs.writeFileSync(path.join(fontsDir, 'Custom.ttf'), 'font')
  fs.writeFileSync(path.join(fontsDir, 'Custom Bold.ttf'), 'font')
  fs.writeFileSync(path.join(fontsDir, 'Custom Italic.ttf'), 'font')
})

after(() => {
  fs.rmSync(fontsDir, { recursive: true, force: true })
})

describe('FontResolver', () => {
  it('resolves a font file from the project fonts directory', () => {
    assert.equal(
      resolver.resolve({ family: 'Custom.ttf' }),
      path.join(fontsDir, 'Custom.ttf'),
    )
  })

  it('resolves bold and italic family variants', () => {
    assert.equal(
      resolver.resolve({ family: 'Custom', bold: true }),
      path.join(fontsDir, 'Custom Bold.ttf'),
    )
    assert.equal(
      resolver.resolve({ family: 'Custom', italic: true }),
      path.join(fontsDir, 'Custom Italic.ttf'),
    )
  })

  it('throws when the requested font does not exist', () => {
    assert.throws(
      () => resolver.resolve({ family: 'Missing.ttf' }),
      /Font file not found/,
    )
    assert.throws(
      () => resolver.resolve({ family: 'Missing', bold: true }),
      /Font not found: Missing bold/,
    )
  })
})
