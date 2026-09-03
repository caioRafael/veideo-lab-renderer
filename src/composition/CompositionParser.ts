import type { AudioClip, AudioRole } from '../interfaces/audio'
import type { Composition } from '../interfaces/composition'
import type { Scene, SceneType } from '../interfaces/scene'

export class CompositionParser {
  parse(value: unknown): Composition {
    if (!this.isRecord(value)) {
      throw new Error('Composition must be a JSON object')
    }

    if (!Array.isArray(value.scenes) || value.scenes.length === 0) {
      throw new Error('Composition must include a non-empty scenes array')
    }

    const composition: Composition = {
      scenes: value.scenes.map((scene, index) =>
        this.parseScene(scene, `scenes[${index}]`),
      ),
    }

    if (typeof value.output === 'string') {
      composition.output = value.output
    }

    if (typeof value.width === 'number') {
      composition.width = value.width
    }

    if (typeof value.height === 'number') {
      composition.height = value.height
    }

    if (typeof value.fps === 'number') {
      composition.fps = value.fps
    }

    if (value.audio !== undefined) {
      if (!Array.isArray(value.audio)) {
        throw new Error('audio must be an array')
      }

      composition.audio = value.audio.map((clip, audioIndex) =>
        this.parseAudioClip(clip, `audio[${audioIndex}]`),
      )
    }

    return composition
  }

  private parseScene(value: unknown, label: string): Scene {
    if (!this.isRecord(value)) {
      throw new Error(`${label} must be an object`)
    }

    if (!this.isSceneType(value.type)) {
      throw new Error(`${label}.type must be "image" or "video"`)
    }

    if (typeof value.source !== 'string' || value.source.length === 0) {
      throw new Error(`${label}.source is required`)
    }

    if (typeof value.duration !== 'number' || !(value.duration > 0)) {
      throw new Error(`${label}.duration must be > 0`)
    }

    const scene: Scene = {
      type: value.type,
      source: value.source,
      duration: value.duration,
    }

    if (value.audio !== undefined) {
      if (!Array.isArray(value.audio)) {
        throw new Error(`${label}.audio must be an array`)
      }

      scene.audio = value.audio.map((clip, audioIndex) =>
        this.parseAudioClip(clip, `${label}.audio[${audioIndex}]`),
      )
    }

    return scene
  }

  private parseAudioClip(value: unknown, label: string): AudioClip {
    if (!this.isRecord(value)) {
      throw new Error(`${label} must be an object`)
    }

    if (typeof value.source !== 'string' || value.source.length === 0) {
      throw new Error(`${label}.source is required`)
    }

    if (!this.isAudioRole(value.role)) {
      throw new Error(`${label}.role must be "background" or "focus"`)
    }

    if (value.start !== undefined && typeof value.start !== 'number') {
      throw new Error(`${label}.start must be a number`)
    }

    if (value.start !== undefined && value.start < 0) {
      throw new Error(`${label}.start must be >= 0`)
    }

    if (value.duration !== undefined && typeof value.duration !== 'number') {
      throw new Error(`${label}.duration must be a number`)
    }

    if (value.duration !== undefined && !(value.duration > 0)) {
      throw new Error(`${label}.duration must be > 0`)
    }

    if (value.volume !== undefined && typeof value.volume !== 'number') {
      throw new Error(`${label}.volume must be a number`)
    }

    const clip: AudioClip = {
      source: value.source,
      role: value.role,
    }

    if (typeof value.start === 'number') {
      clip.start = value.start
    }

    if (typeof value.duration === 'number') {
      clip.duration = value.duration
    }

    if (typeof value.volume === 'number') {
      clip.volume = value.volume
    }

    return clip
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  private isAudioRole(value: unknown): value is AudioRole {
    return value === 'background' || value === 'focus'
  }

  private isSceneType(value: unknown): value is SceneType {
    return value === 'image' || value === 'video'
  }
}
