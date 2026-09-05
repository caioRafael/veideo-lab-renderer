import type { MediaSource } from './source'

export type AudioRole = 'background' | 'focus'

export interface AudioClip {
  source: MediaSource
  role: AudioRole
  start?: number
  duration?: number
  volume?: number
}
