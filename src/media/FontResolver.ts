import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface FontStyle {
  family?: string
  bold?: boolean
  italic?: boolean
}

const BUNDLED_FONTS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'assets',
  'fonts',
)

const SYSTEM_FONT_DIRS = [
  '/System/Library/Fonts/Supplemental',
  '/System/Library/Fonts',
  '/Library/Fonts',
  '/usr/share/fonts/truetype/dejavu',
  '/usr/share/fonts/truetype/liberation',
  '/usr/share/fonts/truetype/freefont',
  'C:/Windows/Fonts',
]

const DEFAULT_FAMILIES = [
  'Arial',
  'DejaVu Sans',
  'Liberation Sans',
  'FreeSans',
  'Segoe UI',
]

export class FontResolver {
  private readonly searchDirs: string[]

  constructor(fontsDir?: string) {
    this.searchDirs = [
      ...(fontsDir ? [fontsDir] : []),
      BUNDLED_FONTS_DIR,
      ...SYSTEM_FONT_DIRS,
    ]
  }

  resolve(style: FontStyle = {}): string {
    const bold = style.bold === true
    const italic = style.italic === true

    if (style.family !== undefined && this.isFontFile(style.family)) {
      return this.resolveFontFile(style.family)
    }

    const families =
      style.family !== undefined ? [style.family] : DEFAULT_FAMILIES

    for (const family of families) {
      const resolved = this.findFamilyFile(family, bold, italic)
      if (resolved !== undefined) {
        return resolved
      }
    }

    throw new Error(this.missingFontMessage(style.family, bold, italic))
  }

  private resolveFontFile(source: string): string {
    if (path.isAbsolute(source) && fs.existsSync(source)) {
      return source
    }

    for (const dir of this.searchDirs) {
      const candidate = path.join(dir, source)
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }

    throw new Error(`Font file not found: ${source}`)
  }

  private findFamilyFile(
    family: string,
    bold: boolean,
    italic: boolean,
  ): string | undefined {
    for (const fileName of this.familyFileNames(family, bold, italic)) {
      for (const dir of this.searchDirs) {
        const candidate = path.join(dir, fileName)
        if (fs.existsSync(candidate)) {
          return candidate
        }
      }
    }

    return undefined
  }

  private familyFileNames(
    family: string,
    bold: boolean,
    italic: boolean,
  ): string[] {
    const compact = family.replace(/ /g, '')
    const names = new Set<string>()

    if (bold && italic) {
      this.addFontFiles(names, `${family} Bold Italic`)
      this.addFontFiles(names, `${family}-BoldItalic`)
      this.addFontFiles(names, `${compact}-BoldItalic`)
      this.addFontFiles(names, `${compact}bi`)
    } else if (bold) {
      this.addFontFiles(names, `${family} Bold`)
      this.addFontFiles(names, `${family}-Bold`)
      this.addFontFiles(names, `${compact}-Bold`)
      this.addFontFiles(names, `${compact}bd`)
    } else if (italic) {
      this.addFontFiles(names, `${family} Italic`)
      this.addFontFiles(names, `${family}-Italic`)
      this.addFontFiles(names, `${family}-Oblique`)
      this.addFontFiles(names, `${compact}-Italic`)
      this.addFontFiles(names, `${compact}i`)
    } else {
      this.addFontFiles(names, family)
      this.addFontFiles(names, `${family}-Regular`)
      this.addFontFiles(names, compact)
    }

    return [...names]
  }

  private addFontFiles(names: Set<string>, base: string): void {
    names.add(`${base}.ttf`)
    names.add(`${base}.otf`)
    names.add(`${base}.ttc`)
    names.add(`${base.toLowerCase()}.ttf`)
  }

  private isFontFile(value: string): boolean {
    return /\.(ttf|otf|ttc)$/i.test(value)
  }

  private missingFontMessage(
    family: string | undefined,
    bold: boolean,
    italic: boolean,
  ): string {
    const style = [bold ? 'bold' : undefined, italic ? 'italic' : undefined]
      .filter((part) => part !== undefined)
      .join(' ')
    const label = family ?? 'default'
    const styled = style.length > 0 ? `${label} ${style}` : label
    return `Font not found: ${styled}`
  }
}
