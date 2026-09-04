import { AudioTimeline } from '../composition/AudioTimeline'
import type { AbsoluteAudio } from '../interfaces/absolute-audio'
import type { Composition } from '../interfaces/composition'
import type {
  AudioItem,
  AudioTrack,
  OverlayItem,
  OverlayTrack,
  RenderPlan,
  TextItem,
  TextTrack,
  VideoItem,
  VideoTrack,
} from '../interfaces/render-plan'
import { FontResolver } from '../media/FontResolver'
import type { MediaResolver } from '../media/MediaResolver'

export function buildRenderPlan(
  composition: Composition,
  mediaResolver: MediaResolver,
  audioTimeline: AudioTimeline = new AudioTimeline(),
  fontResolver: FontResolver = new FontResolver(),
): RenderPlan {
  const duration = composition.scenes.reduce(
    (sum, scene) => sum + scene.duration,
    0,
  )

  const tracks = [
    createVideoTrack(composition, mediaResolver),
    ...createAudioTracks(
      audioTimeline.collect(composition, duration),
      mediaResolver,
    ),
    ...createOverlayTracks(composition, mediaResolver),
    ...createTextTracks(composition, fontResolver),
  ]

  return {
    width: composition.width,
    height: composition.height,
    fps: composition.fps,
    duration,
    outputPath: mediaResolver.resolveOutput(composition.output),
    tracks,
  }
}

function createVideoTrack(
  composition: Composition,
  mediaResolver: MediaResolver,
): VideoTrack {
  const items: VideoItem[] = []
  let start = 0

  for (const [index, scene] of composition.scenes.entries()) {
    items.push({
      id: `video-${index}`,
      source: mediaResolver.resolveSceneSource(scene),
      start,
      duration: scene.duration,
      mediaType: scene.type,
    })
    start += scene.duration
  }

  return {
    id: 'video',
    type: 'video',
    items,
  }
}

function createAudioTracks(
  clips: AbsoluteAudio[],
  mediaResolver: MediaResolver,
): AudioTrack[] {
  if (clips.length === 0) {
    return []
  }

  const items: AudioItem[] = clips.map((clip, index) => ({
    id: `audio-${index}`,
    source: mediaResolver.resolveAudio(clip.source),
    start: clip.start,
    duration: clip.duration,
    volume: clip.volume,
  }))

  return [
    {
      id: 'audio',
      type: 'audio',
      items,
    },
  ]
}

function createOverlayTracks(
  composition: Composition,
  mediaResolver: MediaResolver,
): OverlayTrack[] {
  const overlays = composition.overlays ?? []
  if (overlays.length === 0) {
    return []
  }

  const items: OverlayItem[] = overlays.map((overlay, index) => ({
    id: `overlay-${index}`,
    source: mediaResolver.resolveOverlay(overlay.source),
    start: overlay.start,
    duration: overlay.duration,
    x: overlay.x,
    y: overlay.y,
    width: overlay.width,
    height: overlay.height,
  }))

  return [
    {
      id: 'overlay',
      type: 'overlay',
      items,
    },
  ]
}

function createTextTracks(
  composition: Composition,
  fontResolver: FontResolver,
): TextTrack[] {
  const texts = composition.texts ?? []
  if (texts.length === 0) {
    return []
  }

  const items: TextItem[] = texts.map((text, index) => ({
    id: `text-${index}`,
    content: text.content,
    start: text.start,
    duration: text.duration,
    x: text.x,
    y: text.y,
    fontSize: text.fontSize,
    color: text.color,
    fontPath: fontResolver.resolve({
      ...(text.font === undefined ? {} : { family: text.font }),
      ...(text.bold === undefined ? {} : { bold: text.bold }),
      ...(text.italic === undefined ? {} : { italic: text.italic }),
    }),
  }))

  return [
    {
      id: 'text',
      type: 'text',
      items,
    },
  ]
}
