import { AudioTimeline } from '../composition/AudioTimeline'
import { scenePlacements, visualDuration } from '../composition/visualDuration'
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
  const duration = visualDuration(composition.scenes)

  const videoTrack = createVideoTrack(composition, mediaResolver)
  const tracks = [
    videoTrack,
    ...createAudioTracks(
      audioTimeline.collect(composition, duration),
      mediaResolver,
      composition,
      videoTrack,
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
  const placements = scenePlacements(composition.scenes)

  for (const [index, scene] of composition.scenes.entries()) {
    const placement = placements[index]
    if (placement === undefined) {
      continue
    }

    const item: VideoItem = {
      id: `video-${index}`,
      source: mediaResolver.resolveSceneSource(scene),
      start: placement.start,
      duration: placement.duration,
      mediaType: scene.type,
    }

    if (scene.mediaStart !== undefined) {
      item.mediaStart = scene.mediaStart
    }

    if (scene.shortMedia !== undefined) {
      item.shortMedia = scene.shortMedia
    }

    if (scene.transition !== undefined) {
      item.incomingTransition = scene.transition
    }

    if (scene.transform !== undefined) {
      item.transform = scene.transform
    }

    items.push(item)
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
  composition: Composition,
  videoTrack: VideoTrack,
): AudioTrack[] {
  const items: AudioItem[] = [
    ...createVideoSceneAudio(composition, videoTrack),
    ...clips.map((clip, index) => ({
      id: `audio-${index}`,
      source: mediaResolver.resolveAudio(clip.source),
      start: clip.start,
      duration: clip.duration,
      volume: clip.volume,
    })),
  ]

  if (items.length === 0) {
    return []
  }

  return [
    {
      id: 'audio',
      type: 'audio',
      items,
    },
  ]
}

function createVideoSceneAudio(
  composition: Composition,
  videoTrack: VideoTrack,
): AudioItem[] {
  const items: AudioItem[] = []
  let index = 0

  for (const [sceneIndex, scene] of composition.scenes.entries()) {
    if (scene.type !== 'video' || scene.keepAudio !== true) {
      continue
    }

    const videoItem = videoTrack.items[sceneIndex]
    if (videoItem === undefined) {
      continue
    }

    items.push({
      id: `audio-video-${index}`,
      source: videoItem.source,
      start: videoItem.start,
      duration: videoItem.duration,
      volume: 1,
    })
    index += 1
  }

  return items
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
