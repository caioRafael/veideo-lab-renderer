import type { AudioClip, AudioRole } from '../interfaces/audio'
import type { Composition } from '../interfaces/composition'
import type { OverlayClip } from '../interfaces/overlay'
import type { Scene, SceneType } from '../interfaces/scene'
import type { PositionValue, TextClip } from '../interfaces/text'

const DEFAULT_OUTPUT = 'output.mp4'
const DEFAULT_WIDTH = 1920
const DEFAULT_HEIGHT = 1080
const DEFAULT_FPS = 25
const DEFAULT_TEXT_FONT_SIZE = 48
const DEFAULT_TEXT_COLOR = '#FFFFFF'

export class CompositionParser {
  parse(value: unknown): Composition {
    if (!this.isRecord(value)) {
      throw new Error('Composition must be a JSON object')
    }

    if (!Array.isArray(value.scenes) || value.scenes.length === 0) {
      throw new Error('Composition must include a non-empty scenes array')
    }

    const composition: Composition = {
      output: typeof value.output === 'string' ? value.output : DEFAULT_OUTPUT,
      width: typeof value.width === 'number' ? value.width : DEFAULT_WIDTH,
      height: typeof value.height === 'number' ? value.height : DEFAULT_HEIGHT,
      fps: typeof value.fps === 'number' ? value.fps : DEFAULT_FPS,
      scenes: value.scenes.map((scene, index) =>
        this.parseScene(scene, `scenes[${index}]`),
      ),
    }

    if (value.audio !== undefined) {
      if (!Array.isArray(value.audio)) {
        throw new Error('audio must be an array')
      }

      composition.audio = value.audio.map((clip, audioIndex) =>
        this.parseAudioClip(clip, `audio[${audioIndex}]`),
      )
    }

    if (value.texts !== undefined) {
      if (!Array.isArray(value.texts)) {
        throw new Error('texts must be an array')
      }

      composition.texts = value.texts.map((clip, textIndex) =>
        this.parseTextClip(clip, `texts[${textIndex}]`),
      )
    }

    if (value.overlays !== undefined) {
      if (!Array.isArray(value.overlays)) {
        throw new Error('overlays must be an array')
      }

      composition.overlays = value.overlays.map((clip, overlayIndex) =>
        this.parseOverlayClip(clip, `overlays[${overlayIndex}]`),
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

  private parseTextClip(value: unknown, label: string): TextClip {
    if (!this.isRecord(value)) {
      throw new Error(`${label} must be an object`)
    }

    if (typeof value.content !== 'string' || value.content.length === 0) {
      throw new Error(`${label}.content is required`)
    }

    this.assertStart(value.start, label)
    const duration = this.parseRequiredDuration(value.duration, label)

    if (value.fontSize !== undefined) {
      if (typeof value.fontSize !== 'number' || !(value.fontSize > 0)) {
        throw new Error(`${label}.fontSize must be > 0`)
      }
    }

    if (value.color !== undefined && typeof value.color !== 'string') {
      throw new Error(`${label}.color must be a string`)
    }

    return {
      content: value.content,
      start: typeof value.start === 'number' ? value.start : 0,
      duration,
      x: this.parsePosition(value.x, `${label}.x`, 'center'),
      y: this.parsePosition(value.y, `${label}.y`, 'center'),
      fontSize:
        typeof value.fontSize === 'number'
          ? value.fontSize
          : DEFAULT_TEXT_FONT_SIZE,
      color: typeof value.color === 'string' ? value.color : DEFAULT_TEXT_COLOR,
    }
  }

  private parseOverlayClip(value: unknown, label: string): OverlayClip {
    if (!this.isRecord(value)) {
      throw new Error(`${label} must be an object`)
    }

    if (typeof value.source !== 'string' || value.source.length === 0) {
      throw new Error(`${label}.source is required`)
    }

    this.assertStart(value.start, label)
    const duration = this.parseRequiredDuration(value.duration, label)

    if (typeof value.x !== 'number') {
      throw new Error(`${label}.x must be a number`)
    }

    if (typeof value.y !== 'number') {
      throw new Error(`${label}.y must be a number`)
    }

    if (typeof value.width !== 'number' || !(value.width > 0)) {
      throw new Error(`${label}.width must be > 0`)
    }

    if (typeof value.height !== 'number' || !(value.height > 0)) {
      throw new Error(`${label}.height must be > 0`)
    }

    return {
      source: value.source,
      start: typeof value.start === 'number' ? value.start : 0,
      duration,
      x: value.x,
      y: value.y,
      width: value.width,
      height: value.height,
    }
  }

  private parsePosition(
    value: unknown,
    label: string,
    fallback: PositionValue,
  ): PositionValue {
    if (value === undefined) {
      return fallback
    }

    if (value === 'center') {
      return 'center'
    }

    if (typeof value === 'number') {
      return value
    }

    throw new Error(`${label} must be a number or "center"`)
  }

  private assertStart(value: unknown, label: string): void {
    if (value !== undefined && typeof value !== 'number') {
      throw new Error(`${label}.start must be a number`)
    }

    if (typeof value === 'number' && value < 0) {
      throw new Error(`${label}.start must be >= 0`)
    }
  }

  private parseRequiredDuration(value: unknown, label: string): number {
    if (typeof value !== 'number') {
      throw new Error(`${label}.duration must be a number`)
    }

    if (!(value > 0)) {
      throw new Error(`${label}.duration must be > 0`)
    }

    return value
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
