import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function findPackageRoot(from = import.meta.url): string {
  let dir = path.dirname(from.startsWith('file:') ? fileURLToPath(from) : from)

  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir
    }

    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error('Unable to locate the @caiorafael/patchwork package root')
    }

    dir = parent
  }
}
