export type AudioRole = 'background' | 'focus'

export interface AudioClip {
  source: string
  role: AudioRole
  start?: number
  duration?: number
  volume?: number
}
