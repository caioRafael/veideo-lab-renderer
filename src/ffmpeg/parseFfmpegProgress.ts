import type { FfmpegProgressUpdate } from '../interfaces/render-runtime'

const TIME_PATTERN = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/
const FPS_PATTERN = /fps=\s*(\d+(?:\.\d+)?)/
const SPEED_PATTERN = /speed=\s*(\d+(?:\.\d+)?)x/

export function parseFfmpegProgressLine(
  line: string,
): FfmpegProgressUpdate | undefined {
  const timeMatch = TIME_PATTERN.exec(line)
  const fpsMatch = FPS_PATTERN.exec(line)
  const speedMatch = SPEED_PATTERN.exec(line)

  if (timeMatch === null && fpsMatch === null && speedMatch === null) {
    return undefined
  }

  const update: FfmpegProgressUpdate = {}

  if (
    timeMatch?.[1] !== undefined &&
    timeMatch[2] !== undefined &&
    timeMatch[3] !== undefined
  ) {
    const hours = Number(timeMatch[1])
    const minutes = Number(timeMatch[2])
    const seconds = Number(timeMatch[3])
    if (
      Number.isFinite(hours) &&
      Number.isFinite(minutes) &&
      Number.isFinite(seconds)
    ) {
      update.timeSeconds = hours * 3600 + minutes * 60 + seconds
    }
  }

  if (fpsMatch?.[1] !== undefined) {
    const fps = Number(fpsMatch[1])
    if (Number.isFinite(fps)) {
      update.fps = fps
    }
  }

  if (speedMatch?.[1] !== undefined) {
    const speed = Number(speedMatch[1])
    if (Number.isFinite(speed)) {
      update.speed = speed
    }
  }

  return update
}
