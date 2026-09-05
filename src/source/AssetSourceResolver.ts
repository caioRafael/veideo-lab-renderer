import fs from 'node:fs'
import path from 'node:path'
import type { AssetSource, ResolvedSource } from '../interfaces/source'

export class AssetSourceResolver {
  private readonly assets: Record<string, string>

  constructor(assets: Record<string, string> = {}) {
    this.assets = assets
  }

  async resolve(source: AssetSource): Promise<ResolvedSource> {
    const value = this.assets[source.id]
    if (value === undefined || value.trim() === '') {
      throw new Error(`Asset "${source.id}" was not found`)
    }

    const resolved = path.resolve(value)
    if (!fs.existsSync(resolved)) {
      throw new Error(`Asset "${source.id}" was not found`)
    }

    if (!fs.statSync(resolved).isFile()) {
      throw new Error(`Asset "${source.id}" is not a file`)
    }

    return { path: resolved }
  }
}
