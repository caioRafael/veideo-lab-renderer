import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatFfmpegCommand } from '../ffmpeg/formatFfmpegCommand'
import type { MediaPaths } from '../interfaces/media-paths'
import { FontResolver } from '../media/FontResolver'
import { MediaResolver } from '../media/MediaResolver'
import { Renderer } from '../renderer/Renderer'
import { loadComposition } from './loadComposition'

const rootDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const mediaPaths: MediaPaths = {
  images: path.join(rootDir, 'input', 'images'),
  audios: path.join(rootDir, 'input', 'audios'),
  videos: path.join(rootDir, 'input', 'videos'),
  outputVideos: path.join(rootDir, 'output', 'videos'),
}

const defaultCompositionPath = path.join(
  rootDir,
  'compositions',
  'example.json',
)

async function main(): Promise<void> {
  const compositionArg = process.argv.slice(2).find((arg) => arg !== '--')
  const compositionPath = path.resolve(compositionArg ?? defaultCompositionPath)
  const composition = loadComposition(compositionPath)
  const mediaResolver = new MediaResolver(mediaPaths)
  const fontResolver = new FontResolver(path.join(rootDir, 'input', 'fonts'))
  const renderer = new Renderer({ mediaResolver, fontResolver })
  const prepared = renderer.prepare(composition)

  console.log('Composition:', compositionPath)
  console.log('FFmpeg command:')
  console.log(formatFfmpegCommand(prepared.args))
  console.log('')

  await renderer.execute(prepared.args)

  console.log(`Rendered: ${prepared.outputPath}`)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
