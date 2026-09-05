import type { AudioClip } from '../interfaces/audio'
import type { Composition } from '../interfaces/composition'
import type { OverlayClip } from '../interfaces/overlay'
import type { Scene } from '../interfaces/scene'
import type {
  MediaSource,
  SourceResolver,
  SourceResolverContext,
} from '../interfaces/source'

export async function materializeCompositionSources(
  composition: Composition,
  sourceResolver: SourceResolver,
  context: SourceResolverContext,
): Promise<Composition> {
  const scenes = await Promise.all(
    composition.scenes.map(async (scene) => {
      const next: Scene = {
        ...scene,
        source: await resolveMediaSource(scene.source, sourceResolver, context),
      }

      if (scene.audio !== undefined) {
        next.audio = await Promise.all(
          scene.audio.map((clip) =>
            resolveAudioClip(clip, sourceResolver, context),
          ),
        )
      }

      return next
    }),
  )

  const materialized: Composition = {
    ...composition,
    scenes,
  }

  if (composition.audio !== undefined) {
    materialized.audio = await Promise.all(
      composition.audio.map((clip) =>
        resolveAudioClip(clip, sourceResolver, context),
      ),
    )
  }

  if (composition.overlays !== undefined) {
    materialized.overlays = await Promise.all(
      composition.overlays.map((overlay) =>
        resolveOverlayClip(overlay, sourceResolver, context),
      ),
    )
  }

  return materialized
}

async function resolveAudioClip(
  clip: AudioClip,
  sourceResolver: SourceResolver,
  context: SourceResolverContext,
): Promise<AudioClip> {
  return {
    ...clip,
    source: await resolveMediaSource(clip.source, sourceResolver, context),
  }
}

async function resolveOverlayClip(
  overlay: OverlayClip,
  sourceResolver: SourceResolver,
  context: SourceResolverContext,
): Promise<OverlayClip> {
  return {
    ...overlay,
    source: await resolveMediaSource(overlay.source, sourceResolver, context),
  }
}

async function resolveMediaSource(
  source: MediaSource,
  sourceResolver: SourceResolver,
  context: SourceResolverContext,
): Promise<string> {
  if (typeof source === 'string') {
    return source
  }

  const resolved = await sourceResolver.resolve(source, context)
  return resolved.path
}
