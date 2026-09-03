export type PositionValue = number | 'center'

export interface TextClip {
  content: string
  start: number
  duration: number
  x: PositionValue
  y: PositionValue
  fontSize: number
  color: string
}
