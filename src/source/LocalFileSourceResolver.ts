import fs from 'node:fs'
import path from 'node:path'
import type { FileSource, ResolvedSource } from '../interfaces/source'

export class LocalFileSourceResolver {
  async resolve(source: FileSource): Promise<ResolvedSource> {
    if (source.path.trim() === '') {
      throw new Error('File source path must not be empty')
    }

    const resolved = path.resolve(source.path)
    if (!fs.existsSync(resolved)) {
      throw new Error(`File source not found: ${resolved}`)
    }

    if (!fs.statSync(resolved).isFile()) {
      throw new Error(`File source is not a file: ${resolved}`)
    }

    return { path: resolved }
  }
}
