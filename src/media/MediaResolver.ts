import fs from 'node:fs'
import path from 'node:path'
import type { MediaPaths } from '../interfaces/media-paths'
import type { Scene } from '../interfaces/scene'

export class MediaResolver {
  private readonly mediaPaths: MediaPaths

  constructor(mediaPaths: MediaPaths) {
    this.mediaPaths = mediaPaths
  }

  resolveSceneSource(scene: Scene): string {
    if (scene.type === 'image') {
      return this.resolveImage(scene.source)
    }

    return this.resolveVideoInput(scene.source)
  }

  resolveAudio(source: string): string {
    return this.resolveMediaFile(this.mediaPaths.audios, source)
  }

  resolveOverlay(source: string): string {
    return this.resolveImage(source)
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
    const resolved = path.join(dir, source)
    if (!fs.existsSync(resolved)) {
      throw new Error(`Asset not found: ${resolved}`)
    }
    return resolved
  }
}
