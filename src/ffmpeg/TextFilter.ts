import type { PositionValue } from '../interfaces/text'
import type { TextItem } from '../interfaces/render-plan'
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

    return [
      `drawtext=fontfile='${fontfile}'`,
      `text='${text}'`,
      `fontsize=${item.fontSize}`,
      `fontcolor=${toFfmpegColor(item.color)}`,
      `x=${toDrawtextPosition(item.x, 'w-text_w')}`,
      `y=${toDrawtextPosition(item.y, 'h-text_h')}`,
      `enable='between(t,${item.start},${end})'`,
    ].join(':')
  }

  apply(inputLabel: string, outputLabel: string, item: TextItem): string {
    return `[${inputLabel}]${this.draw(item)}[${outputLabel}]`
  }
}

function toDrawtextPosition(value: PositionValue, axisSize: string): string {
  if (value === 'center') {
    return `(${axisSize})/2`
  }

  return String(value)
}
