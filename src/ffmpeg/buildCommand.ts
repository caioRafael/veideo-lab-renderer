import fs from 'node:fs'
import path from 'node:path'
import type { AbsoluteAudio } from '../interfaces/absolute-audio'
import type { AudioClip, AudioRole } from '../interfaces/audio'
import type {
  BuildCommandOptions,
  MediaPaths,
} from '../interfaces/build-command'
import type { Composition } from '../interfaces/composition'
import type { Scene, SceneType } from '../interfaces/scene'

const DEFAULT_VOLUME: Record<AudioRole, number> = {
  background: 0.3,
  focus: 1,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAudioRole(value: unknown): value is AudioRole {
  return value === 'background' || value === 'focus'
}

function isSceneType(value: unknown): value is SceneType {
  return value === 'image' || value === 'video'
}

function parseAudioClip(value: unknown, label: string): AudioClip {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`)
  }

  if (typeof value.source !== 'string' || value.source.length === 0) {
    throw new Error(`${label}.source is required`)
  }

  if (!isAudioRole(value.role)) {
    throw new Error(`${label}.role must be "background" or "focus"`)
  }

  if (value.start !== undefined && typeof value.start !== 'number') {
    throw new Error(`${label}.start must be a number`)
  }

  if (value.start !== undefined && value.start < 0) {
    throw new Error(`${label}.start must be >= 0`)
  }

  if (value.duration !== undefined && typeof value.duration !== 'number') {
    throw new Error(`${label}.duration must be a number`)
  }

  if (value.duration !== undefined && !(value.duration > 0)) {
    throw new Error(`${label}.duration must be > 0`)
  }

  if (value.volume !== undefined && typeof value.volume !== 'number') {
    throw new Error(`${label}.volume must be a number`)
  }

  const clip: AudioClip = {
    source: value.source,
    role: value.role,
  }

  if (typeof value.start === 'number') {
    clip.start = value.start
  }

  if (typeof value.duration === 'number') {
    clip.duration = value.duration
  }

  if (typeof value.volume === 'number') {
    clip.volume = value.volume
  }

  return clip
}

function parseScene(value: unknown, label: string): Scene {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`)
  }

  if (!isSceneType(value.type)) {
    throw new Error(`${label}.type must be "image" or "video"`)
  }

  if (typeof value.source !== 'string' || value.source.length === 0) {
    throw new Error(`${label}.source is required`)
  }

  if (typeof value.duration !== 'number' || !(value.duration > 0)) {
    throw new Error(`${label}.duration must be > 0`)
  }

  const scene: Scene = {
    type: value.type,
    source: value.source,
    duration: value.duration,
  }

  if (value.audio !== undefined) {
    if (!Array.isArray(value.audio)) {
      throw new Error(`${label}.audio must be an array`)
    }

    scene.audio = value.audio.map((clip, audioIndex) =>
      parseAudioClip(clip, `${label}.audio[${audioIndex}]`),
    )
  }

  return scene
}

function parseComposition(value: unknown): Composition {
  if (!isRecord(value)) {
    throw new Error('Composition must be a JSON object')
  }

  if (!Array.isArray(value.scenes) || value.scenes.length === 0) {
    throw new Error('Composition must include a non-empty scenes array')
  }

  const composition: Composition = {
    scenes: value.scenes.map((scene, index) =>
      parseScene(scene, `scenes[${index}]`),
    ),
  }

  if (typeof value.output === 'string') {
    composition.output = value.output
  }

  if (typeof value.width === 'number') {
    composition.width = value.width
  }

  if (typeof value.height === 'number') {
    composition.height = value.height
  }

  if (typeof value.fps === 'number') {
    composition.fps = value.fps
  }

  if (value.audio !== undefined) {
    if (!Array.isArray(value.audio)) {
      throw new Error('audio must be an array')
    }

    composition.audio = value.audio.map((clip, audioIndex) =>
      parseAudioClip(clip, `audio[${audioIndex}]`),
    )
  }

  return composition
}

function resolveMediaFile(dir: string, source: string, kind: string): string {
  const resolved = path.join(dir, source)
  if (!fs.existsSync(resolved)) {
    throw new Error(`${kind} not found: ${source} (${resolved})`)
  }
  return resolved
}

function resolveImage(mediaPaths: MediaPaths, source: string): string {
  return resolveMediaFile(mediaPaths.images, source, 'Image')
}

function resolveVideoInput(mediaPaths: MediaPaths, source: string): string {
  return resolveMediaFile(mediaPaths.videos, source, 'Video')
}

function resolveAudio(mediaPaths: MediaPaths, source: string): string {
  return resolveMediaFile(mediaPaths.audios, source, 'Audio')
}

function resolveSceneSource(mediaPaths: MediaPaths, scene: Scene): string {
  if (scene.type === 'image') {
    return resolveImage(mediaPaths, scene.source)
  }
  return resolveVideoInput(mediaPaths, scene.source)
}

function resolveOutput(mediaPaths: MediaPaths, source: string): string {
  const resolved = path.join(mediaPaths.outputVideos, source)
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  return resolved
}

function prepareVideoFilter(
  inputLabel: string,
  outputLabel: string,
  width: number,
  height: number,
  fps: number,
): string {
  return `[${inputLabel}]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=yuv420p[${outputLabel}]`
}

function prepareAudioFilter(
  inputLabel: string,
  outputLabel: string,
  clip: AbsoluteAudio,
  totalSeconds: number,
): string {
  const delayMs = Math.round(clip.start * 1000)
  return (
    `[${inputLabel}]` +
    [
      `atrim=0:${clip.duration}`,
      'asetpts=PTS-STARTPTS',
      `volume=${clip.volume}`,
      `adelay=${delayMs}|${delayMs}`,
      `apad=whole_dur=${totalSeconds}`,
      'aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo',
    ].join(',') +
    `[${outputLabel}]`
  )
}

function collectAbsoluteAudio(
  composition: Composition,
  mediaPaths: MediaPaths,
  totalSeconds: number,
): AbsoluteAudio[] {
  const clips: AbsoluteAudio[] = []

  for (const clip of composition.audio ?? []) {
    const start = clip.start ?? 0
    const remaining = totalSeconds - start
    if (remaining <= 0) {
      continue
    }
    clips.push({
      path: resolveAudio(mediaPaths, clip.source),
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
        path: resolveAudio(mediaPaths, clip.source),
        start: absoluteStart,
        duration: Math.min(clip.duration ?? available, available),
        volume: clip.volume ?? DEFAULT_VOLUME[clip.role],
      })
    }
    sceneStart += scene.duration
  }

  return clips
}

export function buildCommand(options: BuildCommandOptions): string[] {
  const composition = parseComposition(options.composition)
  const { mediaPaths } = options

  const width = composition.width ?? 1920
  const height = composition.height ?? 1080
  const fps = composition.fps ?? 25
  const totalSeconds = composition.scenes.reduce(
    (sum, scene) => sum + scene.duration,
    0,
  )
  const outputPath = resolveOutput(
    mediaPaths,
    composition.output ?? 'output.mp4',
  )

  const args: string[] = ['-y']
  const filterParts: string[] = []
  const videoLabels: string[] = []

  for (const [index, scene] of composition.scenes.entries()) {
    const sourcePath = resolveSceneSource(mediaPaths, scene)

    if (scene.type === 'image') {
      args.push('-loop', '1', '-t', String(scene.duration), '-i', sourcePath)
    } else {
      args.push('-t', String(scene.duration), '-i', sourcePath)
    }

    const outputLabel = `v${index}`
    filterParts.push(
      prepareVideoFilter(`${index}:v`, outputLabel, width, height, fps),
    )
    videoLabels.push(`[${outputLabel}]`)
  }

  const audioClips = collectAbsoluteAudio(composition, mediaPaths, totalSeconds)
  const audioInputOffset = composition.scenes.length

  if (audioClips.length === 0) {
    args.push(
      '-f',
      'lavfi',
      '-t',
      String(totalSeconds),
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
    )
  } else {
    for (const clip of audioClips) {
      args.push('-i', clip.path)
    }
  }

  filterParts.push(
    `${videoLabels.join('')}concat=n=${composition.scenes.length}:v=1:a=0[vout]`,
  )

  if (audioClips.length === 0) {
    filterParts.push(
      `[${audioInputOffset}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]`,
    )
  } else if (audioClips.length === 1) {
    const clip = audioClips[0]!
    filterParts.push(
      prepareAudioFilter(`${audioInputOffset}:a`, 'aout', clip, totalSeconds),
    )
  } else {
    const audioLabels: string[] = []
    for (const [index, clip] of audioClips.entries()) {
      const inputIndex = audioInputOffset + index
      const outputLabel = `a${index}`
      filterParts.push(
        prepareAudioFilter(`${inputIndex}:a`, outputLabel, clip, totalSeconds),
      )
      audioLabels.push(`[${outputLabel}]`)
    }
    filterParts.push(
      `${audioLabels.join('')}amix=inputs=${audioClips.length}:duration=first:dropout_transition=0:normalize=0[aout]`,
    )
  }

  args.push(
    '-filter_complex',
    filterParts.join(';'),
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-t',
    String(totalSeconds),
    '-pix_fmt',
    'yuv420p',
    outputPath,
  )

  return args
}

export function formatFfmpegCommand(args: string[]): string {
  return ['ffmpeg', ...args]
    .map((part) => (/\s/.test(part) ? `"${part}"` : part))
    .join(' ')
}
