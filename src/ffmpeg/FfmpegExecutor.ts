import { spawn } from 'node:child_process'

export interface FfmpegExecutor {
  execute(args: string[]): Promise<void>
}

export class SpawnFfmpegExecutor implements FfmpegExecutor {
  execute(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args)

      ffmpeg.stdout.on('data', (data) => {
        console.log(data.toString())
      })

      ffmpeg.stderr.on('data', (data) => {
        console.error(data.toString())
      })

      ffmpeg.on('error', (error) => {
        reject(error)
      })

      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`)
        if (code === 0) {
          resolve()
          return
        }

        reject(new Error(`FFmpeg process exited with code ${code ?? 1}`))
      })
    })
  }
}
