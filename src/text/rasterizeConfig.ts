import type { TextItem } from '../interfaces/render-plan'
import { computeTextRasterBounds } from './textBounds'
import {
  DEFAULT_LINE_SPACING,
  defaultTextAlign,
  defaultTextVerticalAlign,
} from './textDefaults'

export interface RasterizeTextConfig {
  canvasWidth: number
  canvasHeight: number
  content: string
  fontPath: string
  fontSize: number
  color: string
  x: string
  y: string
  align: string
  verticalAlign: string
  lineSpacing: number
  box?: { width: number; height?: number }
  stroke?: { width: number; color: string }
  shadow?: { x: number; y: number; color: string }
  background?: { color: string; opacity: number; padding: number }
}

export function rasterizeTextConfig(
  item: TextItem,
  width: number,
  height: number,
): RasterizeTextConfig {
  const bounds = computeTextRasterBounds(item, width, height)
  const config: RasterizeTextConfig = {
    canvasWidth: bounds.width,
    canvasHeight: bounds.height,
    content: item.content,
    fontPath: item.fontPath,
    fontSize: item.fontSize,
    color: item.color,
    x: String(bounds.refX - bounds.x),
    y: String(bounds.refY - bounds.y),
    align: item.align ?? defaultTextAlign(item.x),
    verticalAlign: item.verticalAlign ?? defaultTextVerticalAlign(item.y),
    lineSpacing: item.lineSpacing ?? DEFAULT_LINE_SPACING,
  }

  if (item.box !== undefined) {
    config.box = item.box
  }

  if (item.stroke !== undefined) {
    config.stroke = item.stroke
  }

  if (item.shadow !== undefined) {
    config.shadow = item.shadow
  }

  if (item.background !== undefined) {
    config.background = item.background
  }

  return config
}
