import { hasActiveEffects } from '../interfaces/effects'
import {
  getAudioItems,
  getOverlayItems,
  getTextItems,
  getVideoTrack,
  type RenderPlan,
} from '../interfaces/render-plan'
import type { RenderPlanStats } from '../interfaces/render-runtime'

export function collectPlanStats(plan: RenderPlan): RenderPlanStats {
  const videoItems = getVideoTrack(plan)?.items ?? []
  const overlayItems = getOverlayItems(plan)
  const textItems = getTextItems(plan)
  const audioItems = getAudioItems(plan)

  return {
    sceneCount: videoItems.length,
    videoItemCount: videoItems.length,
    audioItemCount: audioItems.length,
    textItemCount: textItems.length,
    overlayItemCount: overlayItems.length,
    transitionCount: videoItems.filter(
      (item) => item.incomingTransition !== undefined,
    ).length,
    effectCount: videoItems.filter((item) => hasActiveEffects(item.effects))
      .length,
    inputCount:
      videoItems.length +
      overlayItems.length +
      (audioItems.length === 0 ? 1 : audioItems.length),
    width: plan.width,
    height: plan.height,
    fps: plan.fps,
    videoDuration: plan.duration,
  }
}
