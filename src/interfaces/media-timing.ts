export type ShortMediaPolicy = 'error' | 'loop' | 'freeze'

const SHORT_MEDIA_POLICIES: readonly ShortMediaPolicy[] = [
  'error',
  'loop',
  'freeze',
]

export const DEFAULT_MEDIA_START = 0
export const DEFAULT_SHORT_MEDIA: ShortMediaPolicy = 'error'

export function isShortMediaPolicy(value: unknown): value is ShortMediaPolicy {
  return SHORT_MEDIA_POLICIES.some((policy) => policy === value)
}

export interface MediaClock {
  duration: number
  mediaStart?: number
  sourceDuration?: number
}

export function availableMediaDuration(item: MediaClock): number | undefined {
  if (item.sourceDuration === undefined) {
    return undefined
  }

  return item.sourceDuration - (item.mediaStart ?? DEFAULT_MEDIA_START)
}

export function loopCopyCount(item: MediaClock): number | undefined {
  const available = availableMediaDuration(item)
  if (available === undefined || !(available > 0)) {
    return undefined
  }

  return Math.max(1, Math.ceil(item.duration / available - 1e-12))
}
