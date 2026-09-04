import { spawn } from 'node:child_process'

export interface FfmpegExecutor {
  execute(args: string[]): Promise<void>
}

export class SpawnFfmpegExecutor implements FfmpegExecutor {
  private readonly binary: string

  constructor(binary = 'ffmpeg') {
    this.binary = binary
  }

  execute(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.binary, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let settled = false

      const forwardSignal = (signal: NodeJS.Signals): void => {
        child.kill(signal)
      }

      const cleanup = (): void => {
        process.off('SIGINT', forwardSignal)
        process.off('SIGTERM', forwardSignal)
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

      child.stdout.on('data', (data: Buffer) => {
        console.log(data.toString())
      })

      child.stderr.on('data', (data: Buffer) => {
        console.error(data.toString())
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
        if (code === 0) {
          settle()
          return
        }

        if (signal) {
          settle(new Error(`FFmpeg process was terminated by signal ${signal}`))
          return
        }

        if (code === null) {
          return
        }

        settle(new Error(`FFmpeg process exited with code ${code}`))
      })
    })
  }
}
