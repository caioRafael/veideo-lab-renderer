import type { AudioClip } from './audio'
import type { Transform } from './transform'
import type { Transition } from './transition'

export type SceneType = 'image' | 'video'

export interface Scene {
  type: SceneType
  source: string
  duration: number
  audio?: AudioClip[]
  keepAudio?: boolean
  transition?: Transition
  transform?: Transform
}
