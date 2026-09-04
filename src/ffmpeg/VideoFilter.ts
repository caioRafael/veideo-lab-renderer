import type { EasingName } from '../interfaces/easing'
import {
  DEFAULT_MEDIA_START,
  DEFAULT_SHORT_MEDIA,
  loopCopyCount,
} from '../interfaces/media-timing'
import type { VideoItem } from '../interfaces/render-plan'
import {
  hasPlacementTransform,
  isAnimatedScalar,
  resolveTransform,
  type ResolvedScalar,
  type ResolvedTransform,
} from '../interfaces/transform'

export class VideoFilter {
  private readonly width: number
  private readonly height: number
  private readonly fps: number

  constructor(width: number, height: number, fps: number) {
    this.width = width
    this.height = height
    this.fps = fps
  }

  prepare(inputLabel: string, outputLabel: string, item: VideoItem): string {
    const resolved = resolveTransform(item.transform)
    const cropPrefix = this.cropPrefix(resolved)
    const looped = this.loopedInput(inputLabel, outputLabel, item)

    if (looped !== undefined) {
      const rest = hasPlacementTransform(resolved)
        ? this.placeOnCanvas(
            looped.label,
            outputLabel,
            cropPrefix,
            resolved,
            item.duration,
          )
        : `[${looped.label}]${cropPrefix}${this.canvasNormalize()}[${outputLabel}]`

      return `${looped.chains.join(';')};${rest}`
    }

    const mediaPrefix = this.mediaTimePrefix(item)

    if (!hasPlacementTransform(resolved)) {
      return `[${inputLabel}]${mediaPrefix}${cropPrefix}${this.canvasNormalize()}[${outputLabel}]`
    }

    return this.placeOnCanvas(
      inputLabel,
      outputLabel,
      `${mediaPrefix}${cropPrefix}`,
      resolved,
      item.duration,
    )
  }

  scale(inputLabel: string, outputLabel: string): string {
    return `[${inputLabel}]${this.canvasNormalize()}[${outputLabel}]`
  }

  concat(videoLabels: string[], outputLabel = 'vout'): string {
    return `${videoLabels.join('')}concat=n=${videoLabels.length}:v=1:a=0[${outputLabel}]`
  }

  xfade(
    leftLabel: string,
    rightLabel: string,
    outputLabel: string,
    duration: number,
    offset: number,
  ): string {
    const leftTb = `${outputLabel}a`
    const rightTb = `${outputLabel}b`

    return [
      `[${leftLabel}]settb=AVTB[${leftTb}]`,
      `[${rightLabel}]settb=AVTB[${rightTb}]`,
      `[${leftTb}][${rightTb}]xfade=transition=fade:duration=${duration}:offset=${offset}[${outputLabel}]`,
    ].join(';')
  }

  fadeOut(
    inputLabel: string,
    outputLabel: string,
    start: number,
    duration: number,
  ): string {
    return `[${inputLabel}]fade=t=out:st=${start}:d=${duration}:c=black[${outputLabel}]`
  }

  fadeIn(inputLabel: string, outputLabel: string, duration: number): string {
    return `[${inputLabel}]fade=t=in:st=0:d=${duration}:c=black[${outputLabel}]`
  }

  private canvasNormalize(): string {
    return `${this.fitScale()},pad=${this.width}:${this.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${this.fps},format=yuv420p`
  }

  private fitScale(): string {
    return `scale=${this.width}:${this.height}:force_original_aspect_ratio=decrease`
  }

  private loopedInput(
    inputLabel: string,
    outputLabel: string,
    item: VideoItem,
  ): { label: string; chains: string[] } | undefined {
    if (
      item.mediaType !== 'video' ||
      (item.shortMedia ?? DEFAULT_SHORT_MEDIA) !== 'loop'
    ) {
      return undefined
    }

    const copies = loopCopyCount(item)
    if (copies === undefined || copies <= 1) {
      return undefined
    }

    const splitLabels = Array.from(
      { length: copies },
      (_, index) => `${outputLabel}l${index}`,
    )
    const loopedLabel = `${outputLabel}loop`

    return {
      label: loopedLabel,
      chains: [
        `[${inputLabel}]setpts=PTS-STARTPTS,split=${copies}${splitLabels
          .map((label) => `[${label}]`)
          .join('')}`,
        `${splitLabels
          .map((label) => `[${label}]`)
          .join(
            '',
          )}concat=n=${copies}:v=1:a=0,trim=duration=${item.duration},setpts=PTS-STARTPTS[${loopedLabel}]`,
      ],
    }
  }

  private mediaTimePrefix(item: VideoItem): string {
    const filters = this.mediaTimeFilters(item)
    if (filters.length === 0) {
      return ''
    }

    return `${filters.join(',')},`
  }

  private mediaTimeFilters(item: VideoItem): string[] {
    if (item.mediaType !== 'video') {
      return []
    }

    const mediaStart = item.mediaStart ?? DEFAULT_MEDIA_START
    const policy = item.shortMedia ?? DEFAULT_SHORT_MEDIA

    if (policy === 'loop') {
      return [
        'setpts=PTS-STARTPTS',
        `trim=duration=${item.duration}`,
        'setpts=PTS-STARTPTS',
      ]
    }

    if (policy === 'freeze') {
      return [
        'setpts=PTS-STARTPTS',
        `tpad=stop_mode=clone:stop_duration=${item.duration}`,
        `trim=duration=${item.duration}`,
        'setpts=PTS-STARTPTS',
      ]
    }

    if (mediaStart > 0) {
      return ['setpts=PTS-STARTPTS']
    }

    return []
  }

  private cropPrefix(resolved: ResolvedTransform): string {
    if (resolved.crop === undefined) {
      return ''
    }

    const { width, height, x, y } = resolved.crop
    return `crop=${width}:${height}:${x}:${y},`
  }

  private placeOnCanvas(
    inputLabel: string,
    outputLabel: string,
    cropPrefix: string,
    resolved: ResolvedTransform,
    duration: number,
  ): string {
    const fitLabel = `${outputLabel}fit`
    const bgLabel = `${outputLabel}bg`
    const chains: string[] = [
      `[${inputLabel}]${cropPrefix}${this.fitScale()},setsar=1,setpts=PTS-STARTPTS[${fitLabel}]`,
    ]

    const overlayLabel = this.pushContentScale(
      chains,
      fitLabel,
      outputLabel,
      resolved,
      duration,
    )

    chains.push(
      `color=c=black:s=${this.width}x${this.height}:r=${this.fps}:d=${duration},format=yuv420p,setsar=1[${bgLabel}]`,
    )
    chains.push(
      `[${bgLabel}][${overlayLabel}]overlay=${this.overlayPosition(resolved, duration)}:shortest=1,setsar=1,fps=${this.fps},format=yuv420p[${outputLabel}]`,
    )

    return chains.join(';')
  }

  private pushContentScale(
    chains: string[],
    fitLabel: string,
    outputLabel: string,
    resolved: ResolvedTransform,
    duration: number,
  ): string {
    const animated =
      isAnimatedScalar(resolved.scale) || isAnimatedScalar(resolved.zoom)
    const staticFactor = resolved.scale.from * resolved.zoom.from

    if (!animated && staticFactor === 1) {
      return fitLabel
    }

    const scaledLabel = `${outputLabel}z`

    if (!animated) {
      chains.push(
        `[${fitLabel}]scale=iw*${staticFactor}:ih*${staticFactor}[${scaledLabel}]`,
      )
      return scaledLabel
    }

    const factor = this.scaleFactorExpr(resolved.scale, resolved.zoom, duration)
    chains.push(
      `[${fitLabel}]scale=w='trunc(iw*(${factor})/2)*2':h='trunc(ih*(${factor})/2)*2':eval=frame[${scaledLabel}]`,
    )
    return scaledLabel
  }

  private scaleFactorExpr(
    scale: ResolvedScalar,
    zoom: ResolvedScalar,
    duration: number,
  ): string {
    const scaleExpr = this.lerpExpr(scale, duration)
    const zoomExpr = this.lerpExpr(zoom, duration)

    if (scaleExpr === '1') {
      return zoomExpr
    }

    if (zoomExpr === '1') {
      return scaleExpr
    }

    return `${scaleExpr}*${zoomExpr}`
  }

  private overlayPosition(
    resolved: ResolvedTransform,
    duration: number,
  ): string {
    const xAnimated =
      isAnimatedScalar(resolved.x) || isAnimatedScalar(resolved.panX)
    const yAnimated =
      isAnimatedScalar(resolved.y) || isAnimatedScalar(resolved.panY)

    if (!xAnimated && !yAnimated) {
      return `${this.centerOffset('main_w-overlay_w', resolved.x.from + resolved.panX.from)}:${this.centerOffset('main_h-overlay_h', resolved.y.from + resolved.panY.from)}`
    }

    return `x='${this.offsetExpr('main_w-overlay_w', resolved.x, resolved.panX, duration)}':y='${this.offsetExpr('main_h-overlay_h', resolved.y, resolved.panY, duration)}'`
  }

  private offsetExpr(
    dimensionExpr: string,
    position: ResolvedScalar,
    pan: ResolvedScalar,
    duration: number,
  ): string {
    const terms = [`(${dimensionExpr})/2`]
    this.pushDisplacementTerm(terms, position, duration)
    this.pushDisplacementTerm(terms, pan, duration)
    return terms.join('+')
  }

  private pushDisplacementTerm(
    terms: string[],
    value: ResolvedScalar,
    duration: number,
  ): void {
    if (!isAnimatedScalar(value) && value.from === 0) {
      return
    }

    const expr = this.lerpExpr(value, duration)
    terms.push(expr.startsWith('-') ? `(${expr})` : expr)
  }

  private centerOffset(dimensionExpr: string, offset: number): string {
    const center = `(${dimensionExpr})/2`
    if (offset === 0) {
      return center
    }
    if (offset > 0) {
      return `${center}+${offset}`
    }
    return `${center}${offset}`
  }

  private lerpExpr(value: ResolvedScalar, duration: number): string {
    if (!isAnimatedScalar(value)) {
      return this.formatNumber(value.from)
    }

    const progress = this.easingProgressExpr(value.easing, duration)
    const delta = this.formatNumber(value.to - value.from)
    const from = this.formatNumber(value.from)

    if (value.from === 0) {
      return `(${delta}*${progress})`
    }

    return `(${from}+(${delta})*${progress})`
  }

  private easingProgressExpr(easing: EasingName, duration: number): string {
    const tNorm = `min(max(if(isnan(t),0,t)/${duration},0),1)`

    switch (easing) {
      case 'linear':
        return tNorm
      case 'ease-in':
        return `pow(${tNorm},2)`
      case 'ease-out':
        return `(1-pow(1-(${tNorm}),2))`
      case 'ease-in-out':
        return `if(lt(${tNorm},0.5),2*pow(${tNorm},2),1-pow(-2*(${tNorm})+2,2)/2)`
    }
  }

  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return String(value)
    }

    return String(Number(value.toPrecision(12)))
  }
}
