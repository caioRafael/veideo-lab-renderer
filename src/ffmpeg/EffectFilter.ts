import {
  DEFAULT_EFFECTS,
  hasActiveEffects,
  normalizeEffects,
  type NormalizedEffects,
  type VideoEffects,
} from '../interfaces/effects'

const GRAY_R = 0.299
const GRAY_G = 0.587
const GRAY_B = 0.114

const SEPIA = {
  rr: 0.393,
  rg: 0.769,
  rb: 0.189,
  gr: 0.349,
  gg: 0.686,
  gb: 0.168,
  br: 0.272,
  bg: 0.534,
  bb: 0.131,
}

/**
 * Translates normalized scene effects into FFmpeg filters.
 *
 * Canonical order (JSON key order is ignored):
 * opacity → brightness → contrast → saturation → grayscale → sepia → blur
 *
 * Default values emit no filter. RGB conversion happens only when
 * grayscale or sepia is active.
 */
export class EffectFilter {
  apply(effects: VideoEffects | undefined): string {
    return this.filters(effects).join(',')
  }

  filters(effects: VideoEffects | undefined): string[] {
    if (!hasActiveEffects(effects)) {
      return []
    }

    const normalized = normalizeEffects(effects)
    const parts: string[] = []

    if (normalized.opacity !== DEFAULT_EFFECTS.opacity) {
      parts.push(this.opacityFilter(normalized.opacity))
    }

    if (normalized.brightness !== DEFAULT_EFFECTS.brightness) {
      parts.push(`eq=brightness=${this.toEqBrightness(normalized.brightness)}`)
    }

    if (normalized.contrast !== DEFAULT_EFFECTS.contrast) {
      parts.push(`eq=contrast=${this.toEqContrast(normalized.contrast)}`)
    }

    if (normalized.saturation !== DEFAULT_EFFECTS.saturation) {
      parts.push(`eq=saturation=${this.toEqSaturation(normalized.saturation)}`)
    }

    const colorMix = this.colorMixFilters(normalized)
    if (colorMix.length > 0) {
      parts.push(`format=gbrp,${colorMix.join(',')},format=yuv420p`)
    }

    if (normalized.blur !== DEFAULT_EFFECTS.blur) {
      parts.push(this.blurFilter(normalized.blur))
    }

    return parts
  }

  /**
   * API 0 = original. FFmpeg `eq` brightness uses the same scale.
   */
  private toEqBrightness(apiValue: number): string {
    return this.formatNumber(apiValue)
  }

  /**
   * API 1 = original. FFmpeg `eq` contrast uses the same scale.
   */
  private toEqContrast(apiValue: number): string {
    return this.formatNumber(apiValue)
  }

  /**
   * API 1 = original, 0 = grayscale. FFmpeg `eq` saturation uses the same scale.
   */
  private toEqSaturation(apiValue: number): string {
    return this.formatNumber(apiValue)
  }

  private opacityFilter(opacity: number): string {
    const amount = this.formatNumber(opacity)
    return `lutyuv=y='val*${amount}':u='(val-128)*${amount}+128':v='(val-128)*${amount}+128'`
  }

  private colorMixFilters(normalized: NormalizedEffects): string[] {
    const mixers: string[] = []

    if (normalized.grayscale !== DEFAULT_EFFECTS.grayscale) {
      mixers.push(this.grayscaleMixer(normalized.grayscale))
    }

    if (normalized.sepia !== DEFAULT_EFFECTS.sepia) {
      mixers.push(this.sepiaMixer(normalized.sepia))
    }

    return mixers
  }

  private grayscaleMixer(amount: number): string {
    const keep = 1 - amount
    return this.channelMixer({
      rr: keep + amount * GRAY_R,
      rg: amount * GRAY_G,
      rb: amount * GRAY_B,
      gr: amount * GRAY_R,
      gg: keep + amount * GRAY_G,
      gb: amount * GRAY_B,
      br: amount * GRAY_R,
      bg: amount * GRAY_G,
      bb: keep + amount * GRAY_B,
    })
  }

  private sepiaMixer(amount: number): string {
    const keep = 1 - amount
    return this.channelMixer({
      rr: keep + amount * SEPIA.rr,
      rg: amount * SEPIA.rg,
      rb: amount * SEPIA.rb,
      gr: amount * SEPIA.gr,
      gg: keep + amount * SEPIA.gg,
      gb: amount * SEPIA.gb,
      br: amount * SEPIA.br,
      bg: amount * SEPIA.bg,
      bb: keep + amount * SEPIA.bb,
    })
  }

  private channelMixer(matrix: {
    rr: number
    rg: number
    rb: number
    gr: number
    gg: number
    gb: number
    br: number
    bg: number
    bb: number
  }): string {
    return `colorchannelmixer=${[
      `rr=${this.formatNumber(matrix.rr)}`,
      `rg=${this.formatNumber(matrix.rg)}`,
      `rb=${this.formatNumber(matrix.rb)}`,
      `gr=${this.formatNumber(matrix.gr)}`,
      `gg=${this.formatNumber(matrix.gg)}`,
      `gb=${this.formatNumber(matrix.gb)}`,
      `br=${this.formatNumber(matrix.br)}`,
      `bg=${this.formatNumber(matrix.bg)}`,
      `bb=${this.formatNumber(matrix.bb)}`,
    ].join(':')}`
  }

  private blurFilter(radius: number): string {
    const value = this.formatNumber(radius)
    return `boxblur=lr=${value}:lp=1:cr=${value}:cp=1`
  }

  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return String(value)
    }

    return String(Number(value.toPrecision(12)))
  }
}
