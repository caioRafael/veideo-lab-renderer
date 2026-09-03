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
}
