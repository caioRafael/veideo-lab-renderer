import type { AudioClip } from './audio'

export type SceneType = 'image' | 'video'

export interface Scene {
  type: SceneType
  source: string
  duration: number
  audio?: AudioClip[]
}
