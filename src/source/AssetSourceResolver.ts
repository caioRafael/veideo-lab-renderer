import type { AssetManager } from '../interfaces/asset'
import type { AssetSource, ResolvedSource } from '../interfaces/source'

export class AssetSourceResolver {
  private readonly assetManager: AssetManager

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager
  }

  async resolve(source: AssetSource): Promise<ResolvedSource> {
    const asset = await this.assetManager.get(source.id)
    return { path: asset.path }
  }
}
