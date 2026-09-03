import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BUNDLED_FONT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'assets',
  'fonts',
  'DejaVuSans.ttf',
)

const SYSTEM_FONTS = [
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/Library/Fonts/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/segoeui.ttf',
]

export class FontResolver {
  resolve(): string {
    const candidates = [BUNDLED_FONT, ...SYSTEM_FONTS]

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }

    throw new Error(
      'No TTF font found. Add assets/fonts/DejaVuSans.ttf or install a system font such as Arial or DejaVu Sans',
    )
  }
}
