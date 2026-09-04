export type TransitionType = 'fade' | 'crossfade'

export interface Transition {
  type: TransitionType
  duration: number
}
