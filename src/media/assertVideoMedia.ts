import { spawnSync } from 'node:child_process'
import {
  DEFAULT_MEDIA_START,
  DEFAULT_SHORT_MEDIA,
} from '../interfaces/media-timing'
import {
  getVideoTrack,
  type RenderPlan,
  type VideoItem,
} from '../interfaces/render-plan'

export type MediaDurationProbe = (source: string) => number

const DURATION_EPSILON = 1e-3

export function parseFfprobeDuration(stdout: string): number | undefined {
  const duration = Number.parseFloat(stdout.trim())
  if (!Number.isFinite(duration) || duration <= 0) {
    return undefined
  }

  return duration
}

export function probeMediaDuration(source: string): number {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      source,
    ],
    { encoding: 'utf8' },
  )

  if (result.error) {
    throw new Error(
      `Could not read duration of ${source}: ${result.error.message}`,
    )
  }

  const duration = parseFfprobeDuration(result.stdout ?? '')
  if (duration === undefined) {
    throw new Error(`Could not read duration of ${source}`)
  }

  return duration
}

export function assertVideoMedia(
  plan: RenderPlan,
  probe?: MediaDurationProbe,
): void {
  const readDuration = probe ?? probeMediaDuration

  for (const item of getVideoTrack(plan)?.items ?? []) {
    assertVideoItemMedia(item, readDuration)
  }
}

function assertVideoItemMedia(
  item: VideoItem,
  probe: MediaDurationProbe,
): void {
  if (item.mediaType !== 'video') {
    return
  }

  const mediaStart = item.mediaStart ?? DEFAULT_MEDIA_START
  const policy = item.shortMedia ?? DEFAULT_SHORT_MEDIA
  const sourceDuration = probe(item.source)
  item.sourceDuration = sourceDuration

  if (mediaStart >= sourceDuration) {
    throw new Error(
      `mediaStart (${mediaStart}s) is beyond the end of ${item.source} (${sourceDuration}s)`,
    )
  }

  if (policy !== 'error') {
    return
  }

  const available = sourceDuration - mediaStart
  if (available + DURATION_EPSILON < item.duration) {
    throw new Error(
      `Video media is shorter than scene duration: source=${item.source} mediaStart=${mediaStart}s requested=${item.duration}s available=${available}s`,
    )
  }
}
