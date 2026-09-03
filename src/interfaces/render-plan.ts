import type { SceneType } from './scene'

export interface RenderScene {
  type: SceneType
  path: string
  duration: number
}

export interface RenderAudioTrack {
  path: string
  start: number
  duration: number
  volume: number
}

export interface RenderPlan {
  width: number
  height: number
  fps: number
  totalSeconds: number
  outputPath: string
  scenes: RenderScene[]
  audioTracks: RenderAudioTrack[]
}
