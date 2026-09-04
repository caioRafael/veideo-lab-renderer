import type { TextItem } from '../interfaces/render-plan'
import type { TextAlign, TextVerticalAlign } from '../interfaces/text'
import { TextRenderer } from './TextRenderer'
import { defaultTextAlign, defaultTextVerticalAlign } from './textDefaults'

export interface TextRasterBounds {
  x: number
  y: number
  width: number
  height: number
  refX: number
  refY: number
}

const renderer = new TextRenderer()

export function computeTextRasterBounds(
  item: TextItem,
  canvasWidth: number,
  canvasHeight: number,
): TextRasterBounds {
  const layout = renderer.layout(item)
  const align = item.align ?? defaultTextAlign(item.x)
  const verticalAlign = item.verticalAlign ?? defaultTextVerticalAlign(item.y)
  const blockWidth = layout.contentWidth
  const blockHeight = layout.contentHeight
  const layoutWidth = item.box?.width ?? blockWidth
  const layoutHeight = item.box?.height ?? blockHeight
  const refX = item.x === 'center' ? canvasWidth / 2 : item.x
  const refY = item.y === 'center' ? canvasHeight / 2 : item.y

  const boxLeft = alignedStart(refX, layoutWidth, align)
  const boxTop = verticalStart(refY, layoutHeight, verticalAlign)
  const textTop = verticalContentStart(
    boxTop,
    layoutHeight,
    blockHeight,
    verticalAlign,
  )
  const alignedContentLeft =
    align === 'right'
      ? boxLeft + layoutWidth - blockWidth
      : align === 'center'
        ? boxLeft + (layoutWidth - blockWidth) / 2
        : boxLeft

  const padding = item.background?.padding ?? 0
  const stroke = item.stroke?.width ?? 0
  const shadowX = item.shadow?.x ?? 0
  const shadowY = item.shadow?.y ?? 0
  const safety = Math.ceil(item.fontSize * 0.25) + 2

  let left = alignedContentLeft - padding - stroke
  let top = textTop - padding - stroke
  let right = alignedContentLeft + blockWidth + padding + stroke
  let bottom = textTop + blockHeight + padding + stroke

  if (item.shadow !== undefined) {
    left = Math.min(left, alignedContentLeft + shadowX - stroke)
    top = Math.min(top, textTop + shadowY - stroke)
    right = Math.max(right, alignedContentLeft + blockWidth + shadowX + stroke)
    bottom = Math.max(bottom, textTop + blockHeight + shadowY + stroke)
  }

  left = Math.floor(left - safety)
  top = Math.floor(top - safety)
  right = Math.ceil(right + safety)
  bottom = Math.ceil(bottom + safety)

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    refX,
    refY,
  }
}

function alignedStart(origin: number, size: number, align: TextAlign): number {
  if (align === 'right') {
    return origin - size
  }

  if (align === 'center') {
    return origin - size / 2
  }

  return origin
}

function verticalStart(
  origin: number,
  size: number,
  align: TextVerticalAlign,
): number {
  if (align === 'bottom') {
    return origin - size
  }

  if (align === 'middle') {
    return origin - size / 2
  }

  return origin
}

function verticalContentStart(
  boxTop: number,
  layoutHeight: number,
  blockHeight: number,
  align: TextVerticalAlign,
): number {
  if (align === 'bottom') {
    return boxTop + layoutHeight - blockHeight
  }

  if (align === 'middle') {
    return boxTop + (layoutHeight - blockHeight) / 2
  }

  return boxTop
}
