/**
 * Static visual effects for a scene's media.
 *
 * Values are API units, not FFmpeg filter parameters.
 * Translation to filters happens in EffectFilter.
 *
 * Defaults (applied when a field is omitted):
 * - opacity = 1 (opaque)
 * - brightness = 0 (original)
 * - contrast = 1 (original)
 * - saturation = 1 (original)
 * - grayscale = 0 (original)
 * - sepia = 0 (original)
 * - blur = 0 (no blur)
 *
 * Limits:
 * - opacity, grayscale, sepia: [0, 1]
 * - brightness: [-1, 1]
 * - contrast: [0, 4]
 * - saturation: [0, 3]
 * - blur: [0, 64] (pixel radius)
 *
 * Canonical apply order (JSON key order is ignored):
 * opacity → brightness → contrast → saturation → grayscale → sepia → blur
 */

export const VIDEO_EFFECT_KEYS = [
  'opacity',
  'brightness',
  'contrast',
  'saturation',
  'grayscale',
  'sepia',
  'blur',
] as const

export type VideoEffectName = (typeof VIDEO_EFFECT_KEYS)[number]

export interface VideoEffects {
  opacity?: number
  brightness?: number
  contrast?: number
  saturation?: number
  grayscale?: number
  sepia?: number
  blur?: number
}

export interface NormalizedEffects {
  opacity: number
  brightness: number
  contrast: number
  saturation: number
  grayscale: number
  sepia: number
  blur: number
}

export const DEFAULT_EFFECTS: NormalizedEffects = {
  opacity: 1,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  grayscale: 0,
  sepia: 0,
  blur: 0,
}

export interface EffectRange {
  min: number
  max: number
}

export const EFFECT_LIMITS: Record<VideoEffectName, EffectRange> = {
  opacity: { min: 0, max: 1 },
  brightness: { min: -1, max: 1 },
  contrast: { min: 0, max: 4 },
  saturation: { min: 0, max: 3 },
  grayscale: { min: 0, max: 1 },
  sepia: { min: 0, max: 1 },
  blur: { min: 0, max: 64 },
}

export function isVideoEffectName(value: string): value is VideoEffectName {
  return VIDEO_EFFECT_KEYS.some((key) => key === value)
}

export function normalizeEffects(
  effects: VideoEffects | undefined,
): NormalizedEffects {
  return {
    opacity: effects?.opacity ?? DEFAULT_EFFECTS.opacity,
    brightness: effects?.brightness ?? DEFAULT_EFFECTS.brightness,
    contrast: effects?.contrast ?? DEFAULT_EFFECTS.contrast,
    saturation: effects?.saturation ?? DEFAULT_EFFECTS.saturation,
    grayscale: effects?.grayscale ?? DEFAULT_EFFECTS.grayscale,
    sepia: effects?.sepia ?? DEFAULT_EFFECTS.sepia,
    blur: effects?.blur ?? DEFAULT_EFFECTS.blur,
  }
}

export function hasActiveEffects(effects: VideoEffects | undefined): boolean {
  const normalized = normalizeEffects(effects)

  return VIDEO_EFFECT_KEYS.some(
    (key) => normalized[key] !== DEFAULT_EFFECTS[key],
  )
}
