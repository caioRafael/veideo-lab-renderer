export function formatFfmpegCommand(args: string[]): string {
  return ['ffmpeg', ...args]
    .map((part) => (/\s/.test(part) ? `"${part}"` : part))
    .join(' ')
}
