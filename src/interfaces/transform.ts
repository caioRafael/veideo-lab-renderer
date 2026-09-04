import { applyEasing, DEFAULT_EASING, type EasingName } from './easing'

/**
 * Numeric transform parameter: a constant or a from→to animation
 * over the scene duration. Optional easing changes only the progression.
 */
export interface AnimatedValue {
  from: number
  to: number
  easing?: EasingName
}

export type TransformValue = number | AnimatedValue

export interface CropRegion {
  width: number
  height: number
  x: number
  y: number
}

export interface Point {
  x: number
  y: number
}

export interface PanOffset {
  x?: TransformValue
  y?: TransformValue
}

export interface AnimatedPoint {
  from: Point
  to: Point
  easing?: EasingName
}

export type PanValue = PanOffset | AnimatedPoint

/**
 * Visual transform intent for a scene's media.
 *
 * Semantics:
 * - `crop` is a static source-pixel region applied before canvas fit.
 * - `scale` and `zoom` are size multipliers (1 = original fitted size).
 * - `x` / `y` and `pan` are displacements in canvas pixels from the centered
 *   placement: +x right, -x left, +y down, -y up.
 *
 * Effective values (see `resolveTransform` / `evaluateTransform`):
 * - scale'(t) = scale(t) * zoom(t)
 * - x'(t) = x(t) + pan.x(t)
 * - y'(t) = y(t) + pan.y(t)
 *
 * Each animated component interpolates with its own easing.
 * Absent easing is linear.
 */
export interface Transform {
  scale?: TransformValue
  zoom?: TransformValue
  x?: TransformValue
  y?: TransformValue
  pan?: PanValue
  crop?: CropRegion
}

export interface ResolvedScalar {
  from: number
  to: number
  easing: EasingName
}

export interface ResolvedTransform {
  crop?: CropRegion
  scale: ResolvedScalar
  zoom: ResolvedScalar
  x: ResolvedScalar
  y: ResolvedScalar
  panX: ResolvedScalar
  panY: ResolvedScalar
}

export function isAnimatedValue(value: TransformValue): value is AnimatedValue {
  return typeof value === 'object'
}

export function isAnimatedPoint(value: PanValue): value is AnimatedPoint {
  return 'from' in value || 'to' in value
}

export function isAnimatedScalar(value: ResolvedScalar): boolean {
  return value.from !== value.to
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * applyEasing(DEFAULT_EASING, t)
}

export function lerpAt(
  from: number,
  to: number,
  time: number,
  duration: number,
  easing: EasingName = DEFAULT_EASING,
): number {
  if (duration <= 0) {
    return to
  }

  return from + (to - from) * applyEasing(easing, time / duration)
}

export function resolveTransform(
  transform: Transform | undefined,
): ResolvedTransform {
  if (transform === undefined) {
    return {
      scale: constantScalar(1),
      zoom: constantScalar(1),
      x: constantScalar(0),
      y: constantScalar(0),
      panX: constantScalar(0),
      panY: constantScalar(0),
    }
  }

  const pan = resolvePan(transform.pan)
  const resolved: ResolvedTransform = {
    scale: toScalar(transform.scale, 1),
    zoom: toScalar(transform.zoom, 1),
    x: toScalar(transform.x, 0),
    y: toScalar(transform.y, 0),
    panX: pan.x,
    panY: pan.y,
  }

  if (transform.crop !== undefined) {
    resolved.crop = transform.crop
  }

  return resolved
}

export function evaluateTransform(
  resolved: ResolvedTransform,
  time: number,
  duration: number,
): { scale: number; x: number; y: number } {
  return {
    scale:
      interpolateScalar(resolved.scale, time, duration) *
      interpolateScalar(resolved.zoom, time, duration),
    x:
      interpolateScalar(resolved.x, time, duration) +
      interpolateScalar(resolved.panX, time, duration),
    y:
      interpolateScalar(resolved.y, time, duration) +
      interpolateScalar(resolved.panY, time, duration),
  }
}

export function hasPlacementTransform(resolved: ResolvedTransform): boolean {
  if (
    isAnimatedScalar(resolved.scale) ||
    isAnimatedScalar(resolved.zoom) ||
    isAnimatedScalar(resolved.x) ||
    isAnimatedScalar(resolved.y) ||
    isAnimatedScalar(resolved.panX) ||
    isAnimatedScalar(resolved.panY)
  ) {
    return true
  }

  return (
    resolved.scale.from * resolved.zoom.from !== 1 ||
    resolved.x.from + resolved.panX.from !== 0 ||
    resolved.y.from + resolved.panY.from !== 0
  )
}

function interpolateScalar(
  value: ResolvedScalar,
  time: number,
  duration: number,
): number {
  return lerpAt(value.from, value.to, time, duration, value.easing)
}

function constantScalar(value: number): ResolvedScalar {
  return { from: value, to: value, easing: DEFAULT_EASING }
}

function toScalar(
  value: TransformValue | undefined,
  identity: number,
): ResolvedScalar {
  if (value === undefined) {
    return constantScalar(identity)
  }

  if (typeof value === 'number') {
    return constantScalar(value)
  }

  return {
    from: value.from,
    to: value.to,
    easing: value.easing ?? DEFAULT_EASING,
  }
}

function resolvePan(pan: PanValue | undefined): {
  x: ResolvedScalar
  y: ResolvedScalar
} {
  if (pan === undefined) {
    return {
      x: constantScalar(0),
      y: constantScalar(0),
    }
  }

  if (isAnimatedPoint(pan)) {
    const easing = pan.easing ?? DEFAULT_EASING
    return {
      x: {
        from: pan.from.x,
        to: pan.to.x,
        easing,
      },
      y: {
        from: pan.from.y,
        to: pan.to.y,
        easing,
      },
    }
  }

  return {
    x: toScalar(pan.x, 0),
    y: toScalar(pan.y, 0),
  }
}
