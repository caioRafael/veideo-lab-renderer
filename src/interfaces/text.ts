export type PositionValue = number | 'center'

export type TextAlign = 'left' | 'center' | 'right'

export type TextVerticalAlign = 'top' | 'middle' | 'bottom'

export interface TextStroke {
  width: number
  color: string
}

export interface TextShadow {
  x: number
  y: number
  color: string
}

export interface TextBackground {
  color: string
  opacity: number
  padding: number
}

export interface TextBox {
  width: number
  height?: number
}

export interface TextClip {
  content: string
  start: number
  duration: number
  x: PositionValue
  y: PositionValue
  fontSize: number
  color: string
  font?: string
  bold?: boolean
  italic?: boolean
  align?: TextAlign
  verticalAlign?: TextVerticalAlign
  lineSpacing?: number
  stroke?: TextStroke
  shadow?: TextShadow
  background?: TextBackground
  box?: TextBox
}

export const TEXT_ALIGNS: readonly TextAlign[] = ['left', 'center', 'right']

export const TEXT_VERTICAL_ALIGNS: readonly TextVerticalAlign[] = [
  'top',
  'middle',
  'bottom',
]

export function isTextAlign(value: unknown): value is TextAlign {
  return TEXT_ALIGNS.some((align) => align === value)
}

export function isTextVerticalAlign(
  value: unknown,
): value is TextVerticalAlign {
  return TEXT_VERTICAL_ALIGNS.some((align) => align === value)
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}
