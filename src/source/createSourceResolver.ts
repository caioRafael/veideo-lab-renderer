import { LocalAssetManager } from '../asset/LocalAssetManager'
import type { AssetManager } from '../interfaces/asset'
import type { SourceResolver } from '../interfaces/source'
import { LocalFileStorage } from '../storage/LocalFileStorage'
import { AssetSourceResolver } from './AssetSourceResolver'
import { CompositeSourceResolver } from './CompositeSourceResolver'
import { defaultAssetStorageDir } from './defaultStorageDir'
import type { UrlDownloader } from './downloadUrl'
import { LocalFileSourceResolver } from './LocalFileSourceResolver'
import { UrlSourceResolver } from './UrlSourceResolver'

export interface CreateSourceResolverOptions {
  assetManager?: AssetManager
  storageDir?: string
  download?: UrlDownloader
}

export function createSourceResolver(
  options: CreateSourceResolverOptions = {},
): SourceResolver {
  const assetManager =
    options.assetManager ??
    new LocalAssetManager(
      new LocalFileStorage(options.storageDir ?? defaultAssetStorageDir()),
    )

  return new CompositeSourceResolver({
    asset: new AssetSourceResolver(assetManager),
    file: new LocalFileSourceResolver(),
    url:
      options.download === undefined
        ? new UrlSourceResolver()
        : new UrlSourceResolver(options.download),
  })
}
