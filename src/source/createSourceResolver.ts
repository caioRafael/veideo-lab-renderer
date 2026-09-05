import type { SourceResolver } from '../interfaces/source'
import { AssetSourceResolver } from './AssetSourceResolver'
import { CompositeSourceResolver } from './CompositeSourceResolver'
import type { UrlDownloader } from './downloadUrl'
import { LocalFileSourceResolver } from './LocalFileSourceResolver'
import { UrlSourceResolver } from './UrlSourceResolver'

export interface CreateSourceResolverOptions {
  assets?: Record<string, string>
  download?: UrlDownloader
}

export function createSourceResolver(
  options: CreateSourceResolverOptions = {},
): SourceResolver {
  return new CompositeSourceResolver({
    asset: new AssetSourceResolver(options.assets ?? {}),
    file: new LocalFileSourceResolver(),
    url:
      options.download === undefined
        ? new UrlSourceResolver()
        : new UrlSourceResolver(options.download),
  })
}
