import type { Scene } from '../interfaces/scene'

export function visualDuration(scenes: Scene[]): number {
  let duration = 0

  for (const scene of scenes) {
    duration += scene.duration
    if (scene.transition?.type === 'crossfade') {
      duration -= scene.transition.duration
    }
  }

  return duration
}
