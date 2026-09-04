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

    if (!hasPlacementTransform(resolved)) {
      return `[${inputLabel}]${cropPrefix}${this.canvasNormalize()}[${outputLabel}]`
    }

    return this.placeOnCanvas(
      inputLabel,
      outputLabel,
      cropPrefix,
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
      `[${inputLabel}]${cropPrefix}${this.fitScale()},setsar=1[${fitLabel}]`,
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
      `[${bgLabel}][${overlayLabel}]overlay=${this.overlayPosition(resolved.x, resolved.y, duration)}:shortest=1,setsar=1,fps=${this.fps},format=yuv420p[${outputLabel}]`,
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
    x: ResolvedScalar,
    y: ResolvedScalar,
    duration: number,
  ): string {
    if (!isAnimatedScalar(x) && !isAnimatedScalar(y)) {
      return `${this.centerOffset('main_w-overlay_w', x.from)}:${this.centerOffset('main_h-overlay_h', y.from)}`
    }

    return `x='${this.offsetExpr('main_w-overlay_w', x, duration)}':y='${this.offsetExpr('main_h-overlay_h', y, duration)}'`
  }

  private offsetExpr(
    dimensionExpr: string,
    offset: ResolvedScalar,
    duration: number,
  ): string {
    const center = `(${dimensionExpr})/2`

    if (!isAnimatedScalar(offset)) {
      if (offset.from === 0) {
        return center
      }
      if (offset.from > 0) {
        return `${center}+${offset.from}`
      }
      return `${center}${offset.from}`
    }

    return `${center}+${this.lerpExpr(offset, duration)}`
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

    const progress = `min(max(if(isnan(t),0,t)/${duration},0),1)`
    const delta = this.formatNumber(value.to - value.from)
    const from = this.formatNumber(value.from)

    if (value.from === 0) {
      return `(${delta}*${progress})`
    }

    return `(${from}+(${delta})*${progress})`
  }

  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return String(value)
    }

    return String(Number(value.toPrecision(12)))
  }
}
