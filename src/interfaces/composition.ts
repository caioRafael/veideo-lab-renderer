import type { AudioClip } from './audio'
import type { Scene } from './scene'

export interface Composition {
  output?: string
  width?: number
  height?: number
  fps?: number
  scenes: Scene[]
  audio?: AudioClip[]
}
