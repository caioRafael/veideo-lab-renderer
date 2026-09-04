import type {
  PositionValue,
  TextAlign,
  TextClip,
  TextVerticalAlign,
} from '../interfaces/text'

export const DEFAULT_LINE_SPACING = 1

export function defaultTextAlign(x: PositionValue): TextAlign {
  return x === 'center' ? 'center' : 'left'
}

export function defaultTextVerticalAlign(y: PositionValue): TextVerticalAlign {
  return y === 'center' ? 'middle' : 'top'
}

export function resolveTextAlign(text: TextClip): TextAlign {
  return text.align ?? defaultTextAlign(text.x)
}

export function resolveTextVerticalAlign(text: TextClip): TextVerticalAlign {
  return text.verticalAlign ?? defaultTextVerticalAlign(text.y)
}

export function resolveLineSpacing(text: TextClip): number {
  return text.lineSpacing ?? DEFAULT_LINE_SPACING
}
