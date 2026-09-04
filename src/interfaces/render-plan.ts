import type { VideoEffects } from './effects'
import type { ShortMediaPolicy } from './media-timing'
import type { SceneType } from './scene'
import type {
  PositionValue,
  TextAlign,
  TextBackground,
  TextBox,
  TextShadow,
  TextStroke,
  TextVerticalAlign,
} from './text'
import type { Transform } from './transform'
import type { Transition } from './transition'

export type RenderTrackType = 'video' | 'audio' | 'overlay' | 'text'

export interface RenderItem {
  id: string
  source: string
  start: number
  duration: number
}

export interface VideoItem extends RenderItem {
  mediaType: SceneType
  mediaStart?: number
  shortMedia?: ShortMediaPolicy
  sourceDuration?: number
  incomingTransition?: Transition
  transform?: Transform
  effects?: VideoEffects
}

export interface AudioItem extends RenderItem {
  volume: number
}

export interface OverlayItem extends RenderItem {
  x: number
  y: number
  width: number
  height: number
}

export interface TextItem {
  id: string
  content: string
  start: number
  duration: number
  x: PositionValue
  y: PositionValue
  fontSize: number
  color: string
  fontPath: string
  align?: TextAlign
  verticalAlign?: TextVerticalAlign
  lineSpacing?: number
  stroke?: TextStroke
  shadow?: TextShadow
  background?: TextBackground
  box?: TextBox
}

export interface VideoTrack {
  id: string
  type: 'video'
  items: VideoItem[]
}

export interface AudioTrack {
  id: string
  type: 'audio'
  items: AudioItem[]
}

export interface OverlayTrack {
  id: string
  type: 'overlay'
  items: OverlayItem[]
}

export interface TextTrack {
  id: string
  type: 'text'
  items: TextItem[]
}

export type RenderTrack = VideoTrack | AudioTrack | OverlayTrack | TextTrack

export interface RenderPlan {
  width: number
  height: number
  fps: number
  duration: number
  outputPath: string
  tracks: RenderTrack[]
}

export function isVideoTrack(track: RenderTrack): track is VideoTrack {
  return track.type === 'video'
}

export function isAudioTrack(track: RenderTrack): track is AudioTrack {
  return track.type === 'audio'
}

export function isOverlayTrack(track: RenderTrack): track is OverlayTrack {
  return track.type === 'overlay'
}

export function isTextTrack(track: RenderTrack): track is TextTrack {
  return track.type === 'text'
}

export function getVideoTrack(plan: RenderPlan): VideoTrack | undefined {
  return plan.tracks.find(isVideoTrack)
}

export function getAudioItems(plan: RenderPlan): AudioItem[] {
  return plan.tracks.filter(isAudioTrack).flatMap((track) => track.items)
}

export function getOverlayItems(plan: RenderPlan): OverlayItem[] {
  return plan.tracks.filter(isOverlayTrack).flatMap((track) => track.items)
}

export function getTextItems(plan: RenderPlan): TextItem[] {
  return plan.tracks.filter(isTextTrack).flatMap((track) => track.items)
}
