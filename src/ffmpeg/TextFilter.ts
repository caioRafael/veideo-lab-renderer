import type { TextItem } from '../interfaces/render-plan'
import type {
  PositionValue,
  TextAlign,
  TextVerticalAlign,
} from '../interfaces/text'
import { DEFAULT_LINE_SPACING } from '../text/textDefaults'
import {
  escapeDrawtext,
  escapeFilterPath,
  toFfmpegColor,
} from './escapeDrawtext'

export class TextFilter {
  draw(item: TextItem): string {
    const text = escapeDrawtext(item.content)
    const fontfile = escapeFilterPath(item.fontPath)
    const end = item.start + item.duration
    const align = item.align ?? (item.x === 'center' ? 'center' : 'left')
    const verticalAlign =
      item.verticalAlign ?? (item.y === 'center' ? 'middle' : 'top')
    const lineSpacing = item.lineSpacing ?? DEFAULT_LINE_SPACING

    const parts = [
      `drawtext=fontfile='${fontfile}'`,
      `text='${text}'`,
      `fontsize=${item.fontSize}`,
      `fontcolor=${toFfmpegColor(item.color)}`,
      `x=${toDrawtextX(item.x, align)}`,
      `y=${toDrawtextY(item.y, verticalAlign, item)}`,
    ]

    if (lineSpacing !== DEFAULT_LINE_SPACING) {
      parts.push(
        `line_spacing=${formatNumber(item.fontSize * (lineSpacing - 1))}`,
      )
    }

    if (item.stroke !== undefined && item.stroke.width > 0) {
      parts.push(`borderw=${item.stroke.width}`)
      parts.push(`bordercolor=${toFfmpegColor(item.stroke.color)}`)
    }

    if (item.shadow !== undefined) {
      parts.push(`shadowx=${item.shadow.x}`)
      parts.push(`shadowy=${item.shadow.y}`)
      parts.push(`shadowcolor=${toFfmpegColor(item.shadow.color)}`)
    }

    if (item.background !== undefined) {
      parts.push('box=1')
      parts.push(
        `boxcolor=${toFfmpegColor(item.background.color, item.background.opacity)}`,
      )
      if (item.background.padding > 0) {
        parts.push(`boxborderw=${item.background.padding}`)
      }
    }

    parts.push(`enable='between(t,${item.start},${end})'`)
    return parts.join(':')
  }

  apply(inputLabel: string, outputLabel: string, item: TextItem): string {
    return `[${inputLabel}]${this.draw(item)}[${outputLabel}]`
  }
}

function toDrawtextX(value: PositionValue, align: TextAlign): string {
  const reference = value === 'center' ? 'w/2' : String(value)

  if (align === 'left') {
    return reference
  }

  if (align === 'center') {
    return value === 'center' ? '(w-text_w)/2' : `${reference}-text_w/2`
  }

  return value === 'center' ? 'w-text_w' : `${reference}-text_w`
}

function toDrawtextY(
  value: PositionValue,
  verticalAlign: TextVerticalAlign,
  item: TextItem,
): string {
  const reference = value === 'center' ? 'h/2' : String(value)
  const boxHeight = item.box?.height
  const inner = boxHeight === undefined ? 'text_h' : String(boxHeight)

  if (verticalAlign === 'top') {
    return reference
  }

  if (verticalAlign === 'middle') {
    if (value === 'center' && boxHeight === undefined) {
      return '(h-text_h)/2'
    }

    return `(${reference}-(${inner})/2)`
  }

  if (value === 'center' && boxHeight === undefined) {
    return 'h-text_h'
  }

  return `(${reference}-(${inner}))`
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return String(Number(value.toPrecision(12)))
}
