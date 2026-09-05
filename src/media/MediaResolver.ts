import fs from 'node:fs'
import path from 'node:path'
import type { MediaPaths } from '../interfaces/media-paths'
import type { Scene } from '../interfaces/scene'
import type { MediaSource } from '../interfaces/source'
import { asSourcePath } from '../source/asSourcePath'

export class MediaResolver {
  private readonly mediaPaths: MediaPaths

  constructor(mediaPaths: MediaPaths) {
    this.mediaPaths = mediaPaths
  }

  resolveSceneSource(scene: Scene): string {
    const source = asSourcePath(scene.source, 'scene source')
    if (scene.type === 'image') {
      return this.resolveImage(source)
    }

    return this.resolveVideoInput(source)
  }

  resolveAudio(source: MediaSource): string {
    return this.resolveMediaFile(this.mediaPaths.audios, asSourcePath(source))
  }

  resolveOverlay(source: MediaSource): string {
    return this.resolveImage(asSourcePath(source, 'overlay source'))
  }

  resolveOutput(source: string): string {
    const resolved = path.join(this.mediaPaths.outputVideos, source)
    fs.mkdirSync(path.dirname(resolved), { recursive: true })
    return resolved
  }

  private resolveImage(source: string): string {
    return this.resolveMediaFile(this.mediaPaths.images, source)
  }

  private resolveVideoInput(source: string): string {
    return this.resolveMediaFile(this.mediaPaths.videos, source)
  }

  private resolveMediaFile(dir: string, source: string): string {
    const resolved = path.isAbsolute(source)
      ? path.resolve(source)
      : path.join(dir, source)

    this.assertReadableFile(resolved)
    return resolved
  }

  private assertReadableFile(resolved: string): void {
    if (!fs.existsSync(resolved)) {
      throw new Error(`Asset not found: ${resolved}`)
    }

    if (!fs.statSync(resolved).isFile()) {
      throw new Error(`Asset is not a file: ${resolved}`)
    }
  }
}
