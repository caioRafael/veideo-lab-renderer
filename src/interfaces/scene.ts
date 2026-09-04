import type { AudioClip } from './audio'
import type { Transition } from './transition'

export type SceneType = 'image' | 'video'

export interface Scene {
  type: SceneType
  source: string
  duration: number
  audio?: AudioClip[]
  keepAudio?: boolean
  transition?: Transition
}
