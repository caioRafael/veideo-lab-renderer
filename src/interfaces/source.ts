export interface AssetSource {
  type: 'asset'
  id: string
}

export interface FileSource {
  type: 'file'
  path: string
}

export interface UrlSource {
  type: 'url'
  url: string
}

export type Source = AssetSource | FileSource | UrlSource

export type MediaSource = string | Source

export interface ResolvedSource {
  path: string
}

export interface SourceResolverContext {
  downloadDir: string
  signal?: AbortSignal
  assets?: Record<string, string>
}

export interface SourceResolver {
  resolve(
    source: Source,
    context: SourceResolverContext,
  ): Promise<ResolvedSource>
}

export function isSource(value: unknown): value is Source {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    record.type === 'asset' || record.type === 'file' || record.type === 'url'
  )
}
