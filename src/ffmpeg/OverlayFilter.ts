import type { OverlayItem } from '../interfaces/render-plan'

export class OverlayFilter {
  scale(inputLabel: string, outputLabel: string, item: OverlayItem): string {
    return `[${inputLabel}]scale=${item.width}:${item.height}[${outputLabel}]`
  }

  overlay(
    mainLabel: string,
    overlayLabel: string,
    outputLabel: string,
    item: OverlayItem,
  ): string {
    const end = item.start + item.duration
    return `[${mainLabel}][${overlayLabel}]overlay=${item.x}:${item.y}:enable='between(t,${item.start},${end})'[${outputLabel}]`
  }
}
