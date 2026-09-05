import type { MediaSource } from '../interfaces/source'

export function asSourcePath(source: MediaSource, label = 'source'): string {
  if (typeof source === 'string') {
    return source
  }

  throw new Error(`Unresolved ${label}: expected a local path`)
}
