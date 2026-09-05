import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { findPackageRoot } from './packageRoot'

describe('findPackageRoot', () => {
  it('finds the package.json of this repository', () => {
    const root = findPackageRoot()
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    ) as { name?: string }

    assert.equal(pkg.name, '@caiorafael/patchwork')
  })
})
