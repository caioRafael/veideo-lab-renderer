import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MediaPaths } from '../interfaces/media-paths'

export const rootDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

export const mediaPaths: MediaPaths = {
  images: path.join(rootDir, 'input', 'images'),
  audios: path.join(rootDir, 'input', 'audios'),
  videos: path.join(rootDir, 'input', 'videos'),
  outputVideos: path.join(rootDir, 'output', 'videos'),
}

export const assetStorageDir = path.join(rootDir, 'storage', 'assets')
