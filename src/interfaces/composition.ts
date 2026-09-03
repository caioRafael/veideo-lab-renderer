import type { AudioClip } from './audio'
import type { OverlayClip } from './overlay'
import type { Scene } from './scene'
import type { TextClip } from './text'

export interface Composition {
  output: string
  width: number
  height: number
  fps: number
  scenes: Scene[]
  audio?: AudioClip[]
  texts?: TextClip[]
  overlays?: OverlayClip[]
}
