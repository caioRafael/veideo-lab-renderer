export class VideoFilter {
  private readonly width: number
  private readonly height: number
  private readonly fps: number

  constructor(width: number, height: number, fps: number) {
    this.width = width
    this.height = height
    this.fps = fps
  }

  scale(inputLabel: string, outputLabel: string): string {
    return `[${inputLabel}]scale=${this.width}:${this.height}:force_original_aspect_ratio=decrease,pad=${this.width}:${this.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${this.fps},format=yuv420p[${outputLabel}]`
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
}
