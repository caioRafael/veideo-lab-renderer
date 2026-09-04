import path from 'node:path'
import { formatFfmpegCommand } from '../ffmpeg/formatFfmpegCommand'
import type { Composition } from '../interfaces/composition'
import type { RenderProgress } from '../interfaces/render-runtime'
import { FontResolver } from '../media/FontResolver'
import { MediaResolver } from '../media/MediaResolver'
import { Renderer } from '../renderer/Renderer'
import {
  formatMetricsReport,
  formatPlanningReport,
  formatProgressBar,
} from './formatReport'
import type { CliLogLevel } from './parseArgs'
import { mediaPaths, rootDir } from './projectPaths'

export interface RunRenderOptions {
  composition: Composition
  label: string
  planningLabel?: string
  level: CliLogLevel
}

export async function runRender(options: RunRenderOptions): Promise<void> {
  const { composition, label, level } = options
  const planningLabel = options.planningLabel ?? label
  const mediaResolver = new MediaResolver(mediaPaths)
  const fontResolver = new FontResolver(path.join(rootDir, 'input', 'fonts'))
  const renderer = new Renderer({ mediaResolver, fontResolver })
  const controller = new AbortController()

  const abort = (): void => {
    controller.abort()
  }

  process.once('SIGINT', abort)
  process.once('SIGTERM', abort)

  const onProgress = (progress: RenderProgress): void => {
    if (level === 'quiet' || level === 'normal') {
      return
    }

    if (progress.phase === 'rendering' && progress.fps !== undefined) {
      const speed =
        progress.speed === undefined
          ? ''
          : `  Speed: ${progress.speed.toFixed(2)}x`
      process.stdout.write(
        `\r  ${formatProgressBar(progress.progress)}  FPS: ${progress.fps.toFixed(1)}${speed}   `,
      )
    }
  }

  try {
    if (level !== 'quiet') {
      console.log('Loading composition...')
    }

    const prepared = await renderer.prepare(composition, {
      signal: controller.signal,
    })

    if (level === 'verbose' || level === 'debug') {
      console.log(formatPlanningReport(planningLabel, prepared.stats))
      console.log('')
    } else if (level === 'normal') {
      console.log('Composition:', label)
    }

    if (level === 'debug') {
      console.log('FFmpeg command:')
      console.log(formatFfmpegCommand(prepared.args))
      console.log('')
    }

    if (level === 'verbose' || level === 'debug') {
      console.log('Render')
    }

    const result = await renderer.runPrepared(prepared, {
      signal: controller.signal,
      onProgress,
    })

    if (level === 'verbose' || level === 'debug') {
      process.stdout.write('\n\n')
      console.log(formatMetricsReport(result.metrics))
      console.log('')
      console.log('Completed')
    }

    if (level !== 'quiet') {
      console.log(`Rendered: ${result.outputPath}`)
    }
  } finally {
    process.off('SIGINT', abort)
    process.off('SIGTERM', abort)
    renderer.cleanupTemporaryFiles()
  }
}
