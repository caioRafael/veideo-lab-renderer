import type { Scene } from '../interfaces/scene'

export interface ScenePlacement {
  start: number
  duration: number
}

export function scenePlacements(scenes: Scene[]): ScenePlacement[] {
  const placements: ScenePlacement[] = []
  let cursor = 0

  for (const scene of scenes) {
    const start =
      scene.transition?.type === 'crossfade'
        ? cursor - scene.transition.duration
        : cursor

    placements.push({
      start,
      duration: scene.duration,
    })
    cursor = start + scene.duration
  }

  return placements
}

export function visualDuration(scenes: Scene[]): number {
  const last = scenePlacements(scenes).at(-1)
  if (last === undefined) {
    return 0
  }

  return last.start + last.duration
}
