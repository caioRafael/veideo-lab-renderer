import { spawn } from 'node:child_process'
import type { FfmpegProgressUpdate } from '../interfaces/render-runtime'
import { RenderCancelledError } from '../renderer/RenderCancelledError'
import { FfmpegProcessError } from './FfmpegProcessError'
import { parseFfmpegProgressLine } from './parseFfmpegProgress'

const STDERR_LIMIT = 16 * 1024
const KILL_TIMEOUT_MS = 2000

export interface FfmpegExecuteOptions {
  signal?: AbortSignal
  onProgress?: (update: FfmpegProgressUpdate) => void
}

export interface FfmpegExecutor {
  execute(args: string[], options?: FfmpegExecuteOptions): Promise<void>
}

export class SpawnFfmpegExecutor implements FfmpegExecutor {
  private readonly binary: string

  constructor(binary = 'ffmpeg') {
    this.binary = binary
  }

  execute(args: string[], options: FfmpegExecuteOptions = {}): Promise<void> {
    if (options.signal?.aborted === true) {
      return Promise.reject(new RenderCancelledError())
    }

    return new Promise((resolve, reject) => {
      const child = spawn(this.binary, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
      })

      let settled = false
      let stderr = ''
      let lineBuffer = ''
      let killTimer: ReturnType<typeof setTimeout> | undefined

      const forwardSignal = (signal: NodeJS.Signals): void => {
        if (!child.killed) {
          child.kill(signal)
        }
      }

      const abort = (): void => {
        if (!child.killed) {
          child.kill('SIGTERM')
        }

        killTimer ??= setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL')
          }
        }, KILL_TIMEOUT_MS)
      }

      const cleanup = (): void => {
        process.off('SIGINT', forwardSignal)
        process.off('SIGTERM', forwardSignal)
        options.signal?.removeEventListener('abort', abort)
        if (killTimer !== undefined) {
          clearTimeout(killTimer)
        }
      }

      const settle = (error?: Error): void => {
        if (settled) {
          return
        }

        settled = true
        cleanup()

        if (error) {
          reject(error)
          return
        }

        resolve()
      }

      process.on('SIGINT', forwardSignal)
      process.on('SIGTERM', forwardSignal)
      options.signal?.addEventListener('abort', abort, { once: true })

      if (options.signal?.aborted === true) {
        abort()
      }

      child.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString()
        stderr = appendLimited(stderr, chunk, STDERR_LIMIT)
        lineBuffer += chunk
        const lines = lineBuffer.split(/\r?\n/)
        lineBuffer = lines.pop() ?? ''

        for (const line of lines) {
          const update = parseFfmpegProgressLine(line)
          if (update !== undefined) {
            options.onProgress?.(update)
          }
        }
      })

      child.on('error', (error: Error) => {
        const code =
          'code' in error && typeof error.code === 'string'
            ? error.code
            : undefined

        if (code === 'ENOENT') {
          settle(
            new Error(
              this.binary === 'ffmpeg'
                ? 'FFmpeg was not found in PATH'
                : `Executable not found: ${this.binary}`,
            ),
          )
          return
        }

        settle(error)
      })

      child.on('close', (code, signal) => {
        if (options.signal?.aborted === true) {
          settle(new RenderCancelledError())
          return
        }

        if (code === 0) {
          settle()
          return
        }

        settle(
          new FfmpegProcessError({
            binary: this.binary,
            exitCode: code,
            signal,
            stderr,
          }),
        )
      })
    })
  }
}

function appendLimited(current: string, chunk: string, limit: number): string {
  const next = current + chunk
  if (next.length <= limit) {
    return next
  }

  return next.slice(next.length - limit)
}
