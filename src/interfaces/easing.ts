export type EasingName = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

export const DEFAULT_EASING: EasingName = 'linear'

const EASING_NAMES: readonly EasingName[] = [
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
]

export function isEasingName(value: unknown): value is EasingName {
  return EASING_NAMES.some((name) => name === value)
}

/**
 * Maps a normalized time `t` through an easing curve.
 * Clamps `t` to [0, 1] once; callers should not clamp again.
 */
export function applyEasing(easing: EasingName, t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1)

  switch (easing) {
    case 'linear':
      return clamped
    case 'ease-in':
      return clamped * clamped
    case 'ease-out': {
      const inverse = 1 - clamped
      return 1 - inverse * inverse
    }
    case 'ease-in-out':
      if (clamped < 0.5) {
        return 2 * clamped * clamped
      }
      return 1 - (-2 * clamped + 2) ** 2 / 2
  }
}
