import { render as renderVideo } from './api/render'
import type { RenderInput, RenderOutputResult } from './api/types'

export async function render(input: RenderInput): Promise<RenderOutputResult> {
  return renderVideo(input)
}

export { parseComposition } from './api/render'
export type {
  RenderInput,
  RenderOutput,
  RenderOutputPath,
  RenderOutputResult,
} from './api/types'
export { CompositionParser } from './composition/CompositionParser'
export type { AudioClip, AudioRole } from './interfaces/audio'
export type { Composition } from './interfaces/composition'
export type { VideoEffects } from './interfaces/effects'
export type { OverlayClip } from './interfaces/overlay'
export type { RenderMetrics, RenderProgress } from './interfaces/render-runtime'
export type { Scene, SceneType } from './interfaces/scene'
export type { MediaSource, Source } from './interfaces/source'
export type { TextClip } from './interfaces/text'
export type { Transform } from './interfaces/transform'
export type { Transition } from './interfaces/transition'
