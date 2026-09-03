import type { MediaResolver } from '../ffmpeg/MediaResolver'
import type { AbsoluteAudio } from '../interfaces/absolute-audio'
import type { AudioRole } from '../interfaces/audio'
import type { Composition } from '../interfaces/composition'

const DEFAULT_VOLUME: Record<AudioRole, number> = {
  background: 0.3,
  focus: 1,
}

export class AudioTimeline {
  private readonly resolver: MediaResolver

  constructor(resolver: MediaResolver) {
    this.resolver = resolver
  }

  collect(composition: Composition, totalSeconds: number): AbsoluteAudio[] {
    const clips: AbsoluteAudio[] = []

    for (const clip of composition.audio ?? []) {
      const start = clip.start ?? 0
      const remaining = totalSeconds - start
      if (remaining <= 0) {
        continue
      }
      clips.push({
        path: this.resolver.resolveAudio(clip.source),
        start,
        duration: Math.min(clip.duration ?? remaining, remaining),
        volume: clip.volume ?? DEFAULT_VOLUME[clip.role],
      })
    }

    let sceneStart = 0
    for (const scene of composition.scenes) {
      for (const clip of scene.audio ?? []) {
        const relativeStart = clip.start ?? 0
        const absoluteStart = sceneStart + relativeStart
        const remainingInScene = scene.duration - relativeStart
        const remainingInVideo = totalSeconds - absoluteStart
        const available = Math.min(remainingInScene, remainingInVideo)
        if (available <= 0) {
          continue
        }
        clips.push({
          path: this.resolver.resolveAudio(clip.source),
          start: absoluteStart,
          duration: Math.min(clip.duration ?? available, available),
          volume: clip.volume ?? DEFAULT_VOLUME[clip.role],
        })
      }
      sceneStart += scene.duration
    }

    return clips
  }
}
