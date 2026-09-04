export function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%')
}

export function escapeFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:')
}

export function toFfmpegColor(color: string, opacity?: number): string {
  const converted = color.startsWith('#') ? `0x${color.slice(1)}` : color
  if (opacity === undefined || opacity === 1) {
    return converted
  }

  return `${converted}@${opacity}`
}
