import type { TextItem } from '../interfaces/render-plan'
import type { TextAlign, TextVerticalAlign } from '../interfaces/text'
import { DEFAULT_LINE_SPACING } from './textDefaults'
import { estimateTextHeight, estimateTextWidth } from './wrapText'

export interface TextLayout {
  lines: string[]
  align: TextAlign
  verticalAlign: TextVerticalAlign
  lineSpacing: number
  lineHeight: number
  contentWidth: number
  contentHeight: number
}

export class TextRenderer {
  layout(item: TextItem): TextLayout {
    const lineSpacing = item.lineSpacing ?? DEFAULT_LINE_SPACING
    const align = item.align ?? (item.x === 'center' ? 'center' : 'left')
    const verticalAlign =
      item.verticalAlign ?? (item.y === 'center' ? 'middle' : 'top')
    const lines = item.content.split('\n')
    const contentWidth = lines.reduce(
      (width, line) => Math.max(width, estimateTextWidth(line, item.fontSize)),
      0,
    )

    return {
      lines,
      align,
      verticalAlign,
      lineSpacing,
      lineHeight: item.fontSize * lineSpacing,
      contentWidth,
      contentHeight: estimateTextHeight(
        lines.length,
        item.fontSize,
        lineSpacing,
      ),
    }
  }
}
