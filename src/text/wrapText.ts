const DEFAULT_CHAR_FACTOR = 0.55

const CHAR_FACTORS: Record<string, number> = {
  i: 0.28,
  I: 0.3,
  l: 0.28,
  j: 0.3,
  f: 0.35,
  t: 0.35,
  r: 0.38,
  ' ': 0.3,
  '.': 0.28,
  ',': 0.28,
  "'": 0.2,
  '"': 0.35,
  m: 0.85,
  M: 0.9,
  w: 0.85,
  W: 1,
  '@': 0.95,
}

export function estimateCharWidth(char: string, fontSize: number): number {
  return fontSize * (CHAR_FACTORS[char] ?? DEFAULT_CHAR_FACTOR)
}

export function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0
  for (const char of text) {
    width += estimateCharWidth(char, fontSize)
  }
  return width
}

export function lineHeight(fontSize: number, lineSpacing: number): number {
  return fontSize * lineSpacing
}

export function estimateTextHeight(
  lineCount: number,
  fontSize: number,
  lineSpacing: number,
): number {
  if (lineCount <= 0) {
    return 0
  }

  return fontSize + (lineCount - 1) * lineHeight(fontSize, lineSpacing)
}

export function wrapText(
  content: string,
  maxWidth: number,
  fontSize: number,
): string {
  return content
    .split('\n')
    .map((line) => wrapLine(line, maxWidth, fontSize))
    .join('\n')
}

function wrapLine(line: string, maxWidth: number, fontSize: number): string {
  if (line.length === 0 || estimateTextWidth(line, fontSize) <= maxWidth) {
    return line
  }

  const words = line.split(/ +/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const pieces = splitLongWord(word, maxWidth, fontSize)
    for (const piece of pieces) {
      const next = current.length === 0 ? piece : `${current} ${piece}`
      if (estimateTextWidth(next, fontSize) <= maxWidth) {
        current = next
        continue
      }

      if (current.length > 0) {
        lines.push(current)
      }
      current = piece
    }
  }

  if (current.length > 0) {
    lines.push(current)
  }

  return lines.join('\n')
}

function splitLongWord(
  word: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  if (estimateTextWidth(word, fontSize) <= maxWidth) {
    return [word]
  }

  const pieces: string[] = []
  let current = ''

  for (const char of word) {
    const next = `${current}${char}`
    if (current.length > 0 && estimateTextWidth(next, fontSize) > maxWidth) {
      pieces.push(current)
      current = char
      continue
    }
    current = next
  }

  if (current.length > 0) {
    pieces.push(current)
  }

  return pieces
}
