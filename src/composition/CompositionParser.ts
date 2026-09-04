import type { AudioClip, AudioRole } from '../interfaces/audio'
import type { Composition } from '../interfaces/composition'
import { isEasingName, type EasingName } from '../interfaces/easing'
import { isShortMediaPolicy } from '../interfaces/media-timing'
import type { OverlayClip } from '../interfaces/overlay'
import type { Scene, SceneType } from '../interfaces/scene'
import type { PositionValue, TextClip } from '../interfaces/text'
import type {
  AnimatedPoint,
  AnimatedValue,
  CropRegion,
  PanOffset,
  PanValue,
  Point,
  Transform,
  TransformValue,
} from '../interfaces/transform'
import type { Transition, TransitionType } from '../interfaces/transition'
import { COMPOSITION_DEFAULTS } from './defaults'
import { visualDuration } from './visualDuration'

export class CompositionParser {
  parse(value: unknown): Composition {
    if (!this.isRecord(value)) {
      throw this.invalid('composition', 'expected a JSON object')
    }

    if (!Array.isArray(value.scenes) || value.scenes.length === 0) {
      throw this.invalid('composition', 'expected a non-empty scenes array')
    }

    const composition: Composition = {
      output: this.parseOutput(value.output),
      width: this.parseDimension(
        value.width,
        'width',
        COMPOSITION_DEFAULTS.width,
      ),
      height: this.parseDimension(
        value.height,
        'height',
        COMPOSITION_DEFAULTS.height,
      ),
      fps: this.parsePositiveNumber(value.fps, 'fps', COMPOSITION_DEFAULTS.fps),
      scenes: value.scenes.map((scene, index) =>
        this.parseScene(scene, `scenes[${index}]`),
      ),
    }

    if (value.audio !== undefined) {
      if (!Array.isArray(value.audio)) {
        throw this.invalid('audio', 'expected an array')
      }

      composition.audio = value.audio.map((clip, audioIndex) =>
        this.parseAudioClip(clip, `audio[${audioIndex}]`),
      )
    }

    if (value.texts !== undefined) {
      if (!Array.isArray(value.texts)) {
        throw this.invalid('texts', 'expected an array')
      }

      composition.texts = value.texts.map((clip, textIndex) =>
        this.parseTextClip(clip, `texts[${textIndex}]`),
      )
    }

    if (value.overlays !== undefined) {
      if (!Array.isArray(value.overlays)) {
        throw this.invalid('overlays', 'expected an array')
      }

      composition.overlays = value.overlays.map((clip, overlayIndex) =>
        this.parseOverlayClip(clip, `overlays[${overlayIndex}]`),
      )
    }

    this.assertTransitions(composition)
    this.assertItemsFitTimeline(composition)

    return composition
  }

  private parseScene(value: unknown, label: string): Scene {
    if (!this.isRecord(value)) {
      throw this.invalid(label, 'expected an object')
    }

    if (!this.isSceneType(value.type)) {
      throw this.invalid(`${label}.type`, 'expected "image" or "video"')
    }

    const scene: Scene = {
      type: value.type,
      source: this.parseRequiredString(value.source, `${label}.source`),
      duration: this.parseRequiredPositiveNumber(
        value.duration,
        `${label}.duration`,
      ),
    }

    if (value.mediaStart !== undefined) {
      if (value.type !== 'video') {
        throw this.invalid(
          `${label}.mediaStart`,
          'expected to be used only on video scenes',
        )
      }

      scene.mediaStart = this.parseNonNegativeNumber(
        value.mediaStart,
        `${label}.mediaStart`,
      )
    }

    if (value.shortMedia !== undefined) {
      if (value.type !== 'video') {
        throw this.invalid(
          `${label}.shortMedia`,
          'expected to be used only on video scenes',
        )
      }

      if (!isShortMediaPolicy(value.shortMedia)) {
        throw this.invalid(
          `${label}.shortMedia`,
          'expected "error", "loop" or "freeze"',
        )
      }

      scene.shortMedia = value.shortMedia
    }

    if (value.keepAudio !== undefined) {
      if (value.type !== 'video') {
        throw this.invalid(
          `${label}.keepAudio`,
          'expected to be used only on video scenes',
        )
      }

      scene.keepAudio = this.parseBoolean(value.keepAudio, `${label}.keepAudio`)
    }

    if (value.transition !== undefined) {
      scene.transition = this.parseTransition(
        value.transition,
        `${label}.transition`,
      )
    }

    if (value.transform !== undefined) {
      scene.transform = this.parseTransform(
        value.transform,
        `${label}.transform`,
      )
    }

    if (value.audio !== undefined) {
      if (!Array.isArray(value.audio)) {
        throw this.invalid(`${label}.audio`, 'expected an array')
      }

      scene.audio = value.audio.map((clip, audioIndex) =>
        this.parseAudioClip(clip, `${label}.audio[${audioIndex}]`),
      )

      for (const [audioIndex, clip] of scene.audio.entries()) {
        if (clip.start !== undefined && clip.start >= scene.duration) {
          throw this.invalid(
            `${label}.audio[${audioIndex}].start`,
            `expected a value within the scene duration (${scene.duration}s)`,
          )
        }
      }
    }

    return scene
  }

  private parseTransform(value: unknown, label: string): Transform {
    if (!this.isRecord(value)) {
      throw this.invalid(label, 'expected an object')
    }

    this.assertKnownKeys(
      value,
      ['scale', 'zoom', 'x', 'y', 'pan', 'crop'],
      label,
    )

    const transform: Transform = {}

    if (value.scale !== undefined) {
      transform.scale = this.parsePositiveTransformValue(
        value.scale,
        `${label}.scale`,
      )
    }

    if (value.zoom !== undefined) {
      transform.zoom = this.parsePositiveTransformValue(
        value.zoom,
        `${label}.zoom`,
      )
    }

    if (value.x !== undefined) {
      transform.x = this.parseFiniteTransformValue(value.x, `${label}.x`)
    }

    if (value.y !== undefined) {
      transform.y = this.parseFiniteTransformValue(value.y, `${label}.y`)
    }

    if (value.pan !== undefined) {
      transform.pan = this.parsePan(value.pan, `${label}.pan`)
    }

    if (value.crop !== undefined) {
      transform.crop = this.parseCrop(value.crop, `${label}.crop`)
    }

    return transform
  }

  private parsePositiveTransformValue(
    value: unknown,
    label: string,
  ): TransformValue {
    if (this.isRecord(value)) {
      return this.parseAnimatedValue(value, label, 'positive')
    }

    return this.parseRequiredPositiveNumber(value, label)
  }

  private parseFiniteTransformValue(
    value: unknown,
    label: string,
  ): TransformValue {
    if (this.isRecord(value)) {
      return this.parseAnimatedValue(value, label, 'finite')
    }

    return this.parseFiniteNumber(value, label)
  }

  private parseAnimatedValue(
    value: Record<string, unknown>,
    label: string,
    kind: 'positive' | 'finite',
  ): AnimatedValue {
    this.assertKnownKeys(value, ['from', 'to', 'easing'], label)

    if (value.from === undefined || value.to === undefined) {
      throw this.invalid(label, 'expected "from" and "to"')
    }

    const animated: AnimatedValue =
      kind === 'positive'
        ? {
            from: this.parseRequiredPositiveNumber(value.from, `${label}.from`),
            to: this.parseRequiredPositiveNumber(value.to, `${label}.to`),
          }
        : {
            from: this.parseFiniteNumber(value.from, `${label}.from`),
            to: this.parseFiniteNumber(value.to, `${label}.to`),
          }

    if (value.easing !== undefined) {
      animated.easing = this.parseEasing(value.easing, `${label}.easing`)
    }

    return animated
  }

  private parsePan(value: unknown, label: string): PanValue {
    if (!this.isRecord(value)) {
      throw this.invalid(label, 'expected an object')
    }

    if (value.from !== undefined || value.to !== undefined) {
      if (value.x !== undefined || value.y !== undefined) {
        throw this.invalid(
          label,
          'expected either { x, y } or { from, to }, not both',
        )
      }

      return this.parseAnimatedPoint(value, label)
    }

    this.assertKnownKeys(value, ['x', 'y'], label)

    const pan: PanOffset = {}

    if (value.x !== undefined) {
      pan.x = this.parseFiniteTransformValue(value.x, `${label}.x`)
    }

    if (value.y !== undefined) {
      pan.y = this.parseFiniteTransformValue(value.y, `${label}.y`)
    }

    return pan
  }

  private parseAnimatedPoint(
    value: Record<string, unknown>,
    label: string,
  ): AnimatedPoint {
    this.assertKnownKeys(value, ['from', 'to', 'easing'], label)

    if (value.from === undefined || value.to === undefined) {
      throw this.invalid(label, 'expected "from" and "to"')
    }

    const pan: AnimatedPoint = {
      from: this.parsePoint(value.from, `${label}.from`),
      to: this.parsePoint(value.to, `${label}.to`),
    }

    if (value.easing !== undefined) {
      pan.easing = this.parseEasing(value.easing, `${label}.easing`)
    }

    return pan
  }

  private parsePoint(value: unknown, label: string): Point {
    if (!this.isRecord(value)) {
      throw this.invalid(label, 'expected an object')
    }

    this.assertKnownKeys(value, ['x', 'y'], label)

    return {
      x:
        value.x === undefined
          ? 0
          : this.parseFiniteNumber(value.x, `${label}.x`),
      y:
        value.y === undefined
          ? 0
          : this.parseFiniteNumber(value.y, `${label}.y`),
    }
  }

  private parseCrop(value: unknown, label: string): CropRegion {
    if (!this.isRecord(value)) {
      throw this.invalid(label, 'expected an object')
    }

    this.assertKnownKeys(value, ['width', 'height', 'x', 'y'], label)

    return {
      width: this.parseRequiredPositiveNumber(value.width, `${label}.width`),
      height: this.parseRequiredPositiveNumber(value.height, `${label}.height`),
      x:
        value.x === undefined
          ? 0
          : this.parseNonNegativeNumber(value.x, `${label}.x`),
      y:
        value.y === undefined
          ? 0
          : this.parseNonNegativeNumber(value.y, `${label}.y`),
    }
  }

  private parseEasing(value: unknown, label: string): EasingName {
    if (!isEasingName(value)) {
      throw this.invalid(
        label,
        'expected "linear", "ease-in", "ease-out" or "ease-in-out"',
      )
    }

    return value
  }

  private parseTransition(value: unknown, label: string): Transition {
    if (!this.isRecord(value)) {
      throw this.invalid(label, 'expected an object')
    }

    if (!this.isTransitionType(value.type)) {
      throw this.invalid(`${label}.type`, 'expected "fade" or "crossfade"')
    }

    return {
      type: value.type,
      duration: this.parseRequiredPositiveNumber(
        value.duration,
        `${label}.duration`,
      ),
    }
  }

  private assertTransitions(composition: Composition): void {
    for (const [index, scene] of composition.scenes.entries()) {
      if (scene.transition === undefined) {
        continue
      }

      if (index === 0) {
        throw new Error(
          'Invalid transition: the first scene cannot have a transition.',
        )
      }

      const previous = composition.scenes[index - 1]
      if (previous === undefined) {
        continue
      }

      if (
        scene.transition.duration >= previous.duration ||
        scene.transition.duration >= scene.duration
      ) {
        throw this.invalid(
          `scenes[${index}].transition.duration`,
          'expected a duration smaller than both adjacent scenes',
        )
      }
    }
  }

  private parseAudioClip(value: unknown, label: string): AudioClip {
    if (!this.isRecord(value)) {
      throw this.invalid(label, 'expected an object')
    }

    if (!this.isAudioRole(value.role)) {
      throw this.invalid(`${label}.role`, 'expected "background" or "focus"')
    }

    const clip: AudioClip = {
      source: this.parseRequiredString(value.source, `${label}.source`),
      role: value.role,
    }

    if (value.start !== undefined) {
      clip.start = this.parseNonNegativeNumber(value.start, `${label}.start`)
    }

    if (value.duration !== undefined) {
      clip.duration = this.parseRequiredPositiveNumber(
        value.duration,
        `${label}.duration`,
      )
    }

    if (value.volume !== undefined) {
      clip.volume = this.parseNonNegativeNumber(value.volume, `${label}.volume`)
    }

    return clip
  }

  private parseTextClip(value: unknown, label: string): TextClip {
    if (!this.isRecord(value)) {
      throw this.invalid(label, 'expected an object')
    }

    const clip: TextClip = {
      content: this.parseRequiredString(value.content, `${label}.content`),
      start: this.parseOptionalStart(value.start, `${label}.start`),
      duration: this.parseRequiredPositiveNumber(
        value.duration,
        `${label}.duration`,
      ),
      x: this.parsePosition(value.x, `${label}.x`, 'center'),
      y: this.parsePosition(value.y, `${label}.y`, 'center'),
      fontSize:
        value.fontSize === undefined
          ? COMPOSITION_DEFAULTS.textFontSize
          : this.parseRequiredPositiveNumber(
              value.fontSize,
              `${label}.fontSize`,
            ),
      color:
        value.color === undefined
          ? COMPOSITION_DEFAULTS.textColor
          : this.parseRequiredString(value.color, `${label}.color`),
    }

    if (value.font !== undefined) {
      clip.font = this.parseRequiredString(value.font, `${label}.font`)
    }

    if (value.bold !== undefined) {
      clip.bold = this.parseBoolean(value.bold, `${label}.bold`)
    }

    if (value.italic !== undefined) {
      clip.italic = this.parseBoolean(value.italic, `${label}.italic`)
    }

    return clip
  }

  private parseOverlayClip(value: unknown, label: string): OverlayClip {
    if (!this.isRecord(value)) {
      throw this.invalid(label, 'expected an object')
    }

    return {
      source: this.parseRequiredString(value.source, `${label}.source`),
      start: this.parseOptionalStart(value.start, `${label}.start`),
      duration: this.parseRequiredPositiveNumber(
        value.duration,
        `${label}.duration`,
      ),
      x: this.parseFiniteNumber(value.x, `${label}.x`),
      y: this.parseFiniteNumber(value.y, `${label}.y`),
      width: this.parseRequiredPositiveNumber(value.width, `${label}.width`),
      height: this.parseRequiredPositiveNumber(value.height, `${label}.height`),
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

    if (this.isFiniteNumber(value)) {
      return value
    }

    throw this.invalid(label, 'expected a number or "center"')
  }

  private parseOutput(value: unknown): string {
    if (value === undefined) {
      return COMPOSITION_DEFAULTS.output
    }

    return this.parseRequiredString(value, 'output')
  }

  private parseDimension(
    value: unknown,
    label: string,
    fallback: number,
  ): number {
    const parsed =
      value === undefined
        ? fallback
        : this.parseRequiredPositiveNumber(value, label)

    if (!Number.isInteger(parsed) || parsed % 2 !== 0) {
      throw this.invalid(label, 'expected an even integer greater than 0')
    }

    return parsed
  }

  private parseOptionalStart(value: unknown, label: string): number {
    if (value === undefined) {
      return 0
    }

    return this.parseNonNegativeNumber(value, label)
  }

  private parseRequiredString(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.length === 0) {
      throw this.invalid(label, 'expected a non-empty string')
    }

    return value
  }

  private parseBoolean(value: unknown, label: string): boolean {
    if (typeof value !== 'boolean') {
      throw this.invalid(label, 'expected a boolean')
    }

    return value
  }

  private parsePositiveNumber(
    value: unknown,
    label: string,
    fallback: number,
  ): number {
    if (value === undefined) {
      return fallback
    }

    return this.parseRequiredPositiveNumber(value, label)
  }

  private parseRequiredPositiveNumber(value: unknown, label: string): number {
    if (!this.isFiniteNumber(value) || !(value > 0)) {
      throw this.invalid(label, 'expected a value greater than 0')
    }

    return value
  }

  private parseNonNegativeNumber(value: unknown, label: string): number {
    if (!this.isFiniteNumber(value) || value < 0) {
      throw this.invalid(label, 'expected a value greater than or equal to 0')
    }

    return value
  }

  private parseFiniteNumber(value: unknown, label: string): number {
    if (!this.isFiniteNumber(value)) {
      throw this.invalid(label, 'expected a finite number')
    }

    return value
  }

  private assertItemsFitTimeline(composition: Composition): void {
    const duration = visualDuration(composition.scenes)

    for (const [index, clip] of (composition.audio ?? []).entries()) {
      if (clip.start !== undefined && clip.start >= duration) {
        throw this.invalid(
          `audio[${index}].start`,
          `expected a value within the composition duration (${duration}s)`,
        )
      }
    }

    for (const [index, clip] of (composition.texts ?? []).entries()) {
      if (clip.start >= duration) {
        throw this.invalid(
          `texts[${index}].start`,
          `expected a value within the composition duration (${duration}s)`,
        )
      }
    }

    for (const [index, clip] of (composition.overlays ?? []).entries()) {
      if (clip.start >= duration) {
        throw this.invalid(
          `overlays[${index}].start`,
          `expected a value within the composition duration (${duration}s)`,
        )
      }
    }
  }

  private assertKnownKeys(
    value: Record<string, unknown>,
    allowed: string[],
    label: string,
  ): void {
    const unknownKey = Object.keys(value).find((key) => !allowed.includes(key))
    if (unknownKey === undefined) {
      return
    }

    throw this.invalid(label, `unexpected field "${unknownKey}"`)
  }

  private invalid(label: string, expected: string): Error {
    return new Error(`Invalid ${label}: ${expected}`)
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
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

  private isTransitionType(value: unknown): value is TransitionType {
    return value === 'fade' || value === 'crossfade'
  }
}
