import type {
  ResolvedSource,
  Source,
  SourceResolver,
  SourceResolverContext,
} from '../interfaces/source'
import type { AssetSourceResolver } from './AssetSourceResolver'
import type { LocalFileSourceResolver } from './LocalFileSourceResolver'
import type { UrlSourceResolver } from './UrlSourceResolver'

export interface SourceResolverDelegates {
  asset: AssetSourceResolver
  file: LocalFileSourceResolver
  url: UrlSourceResolver
}

export class CompositeSourceResolver implements SourceResolver {
  private readonly delegates: SourceResolverDelegates

  constructor(delegates: SourceResolverDelegates) {
    this.delegates = delegates
  }

  async resolve(
    source: Source,
    context: SourceResolverContext,
  ): Promise<ResolvedSource> {
    if (source.type === 'asset') {
      return this.delegates.asset.resolve(source)
    }

    if (source.type === 'file') {
      return this.delegates.file.resolve(source)
    }

    return this.delegates.url.resolve(source, context)
  }
}
