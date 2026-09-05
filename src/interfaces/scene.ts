import type { AudioClip } from './audio'
import type { VideoEffects } from './effects'
import type { ShortMediaPolicy } from './media-timing'
import type { MediaSource } from './source'
import type { Transform } from './transform'
import type { Transition } from './transition'

export type SceneType = 'image' | 'video'

export interface Scene {
  type: SceneType
  source: MediaSource
  duration: number
  mediaStart?: number
  shortMedia?: ShortMediaPolicy
  audio?: AudioClip[]
  keepAudio?: boolean
  transition?: Transition
  transform?: Transform
  effects?: VideoEffects
}
