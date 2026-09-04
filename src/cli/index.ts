import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CompositionParser } from '../composition/CompositionParser'
import type { MediaPaths } from '../interfaces/media-paths'
import { FontResolver } from '../media/FontResolver'
import { MediaResolver } from '../media/MediaResolver'
import { Renderer } from '../renderer/Renderer'

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

const compositionArg = process.argv.slice(2).find((arg) => arg !== '--')
const compositionPath = path.resolve(compositionArg ?? defaultCompositionPath)

const rawComposition: unknown = JSON.parse(
  fs.readFileSync(compositionPath, 'utf8'),
)

const composition = new CompositionParser().parse(rawComposition)
const mediaResolver = new MediaResolver(mediaPaths)
const fontResolver = new FontResolver(path.join(rootDir, 'input', 'fonts'))
const renderer = new Renderer({ mediaResolver, fontResolver })

console.log('Composition:', compositionPath)

try {
  await renderer.render(composition)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
