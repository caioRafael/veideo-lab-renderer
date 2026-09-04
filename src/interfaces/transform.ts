/**
 * Numeric transform parameter: a constant or a linear from→to animation
 * over the scene duration. No keyframes or easing in this phase.
 */
export interface AnimatedValue {
  from: number
  to: number
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
}

export interface ResolvedTransform {
  crop?: CropRegion
  scale: ResolvedScalar
  zoom: ResolvedScalar
  x: ResolvedScalar
  y: ResolvedScalar
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
  const clamped = Math.min(Math.max(t, 0), 1)
  return from + (to - from) * clamped
}

export function lerpAt(
  from: number,
  to: number,
  time: number,
  duration: number,
): number {
  if (duration <= 0) {
    return to
  }

  return lerp(from, to, time / duration)
}

export function resolveTransform(
  transform: Transform | undefined,
): ResolvedTransform {
  if (transform === undefined) {
    return {
      scale: { from: 1, to: 1 },
      zoom: { from: 1, to: 1 },
      x: { from: 0, to: 0 },
      y: { from: 0, to: 0 },
    }
  }

  const pan = resolvePan(transform.pan)
  const resolved: ResolvedTransform = {
    scale: toScalar(transform.scale, 1),
    zoom: toScalar(transform.zoom, 1),
    x: addScalars(toScalar(transform.x, 0), pan.x),
    y: addScalars(toScalar(transform.y, 0), pan.y),
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
      lerpAt(resolved.scale.from, resolved.scale.to, time, duration) *
      lerpAt(resolved.zoom.from, resolved.zoom.to, time, duration),
    x: lerpAt(resolved.x.from, resolved.x.to, time, duration),
    y: lerpAt(resolved.y.from, resolved.y.to, time, duration),
  }
}

export function hasPlacementTransform(resolved: ResolvedTransform): boolean {
  if (
    isAnimatedScalar(resolved.scale) ||
    isAnimatedScalar(resolved.zoom) ||
    isAnimatedScalar(resolved.x) ||
    isAnimatedScalar(resolved.y)
  ) {
    return true
  }

  return (
    resolved.scale.from * resolved.zoom.from !== 1 ||
    resolved.x.from !== 0 ||
    resolved.y.from !== 0
  )
}

function toScalar(
  value: TransformValue | undefined,
  identity: number,
): ResolvedScalar {
  if (value === undefined) {
    return { from: identity, to: identity }
  }

  if (typeof value === 'number') {
    return { from: value, to: value }
  }

  return { from: value.from, to: value.to }
}

function addScalars(
  left: ResolvedScalar,
  right: ResolvedScalar,
): ResolvedScalar {
  return {
    from: left.from + right.from,
    to: left.to + right.to,
  }
}

function resolvePan(pan: PanValue | undefined): {
  x: ResolvedScalar
  y: ResolvedScalar
} {
  if (pan === undefined) {
    return {
      x: { from: 0, to: 0 },
      y: { from: 0, to: 0 },
    }
  }

  if (isAnimatedPoint(pan)) {
    return {
      x: {
        from: pan.from.x,
        to: pan.to.x,
      },
      y: {
        from: pan.from.y,
        to: pan.to.y,
      },
    }
  }

  return {
    x: toScalar(pan.x, 0),
    y: toScalar(pan.y, 0),
  }
}
