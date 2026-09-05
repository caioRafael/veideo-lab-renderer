import type { MediaSource } from './source'

export interface OverlayClip {
  source: MediaSource
  start: number
  duration: number
  x: number
  y: number
  width: number
  height: number
}
