import { FfmpegProcessError } from '../ffmpeg/FfmpegProcessError'
import { RenderCancelledError } from '../renderer/RenderCancelledError'
import { TemplateError } from '../template/TemplateError'

export function isRetryableError(error: unknown): boolean {
  if (error instanceof RenderCancelledError) {
    return false
  }

  if (error instanceof TemplateError) {
    return false
  }

  return error instanceof FfmpegProcessError
}
