export class FfmpegProcessError extends Error {
  readonly phase = 'rendering'
  readonly binary: string
  readonly exitCode: number | null
  readonly signal: NodeJS.Signals | null
  readonly stderr: string

  constructor(options: {
    binary: string
    exitCode: number | null
    signal: NodeJS.Signals | null
    stderr: string
    cause?: unknown
  }) {
    super(formatFfmpegError(options))
    this.name = 'FfmpegProcessError'
    this.binary = options.binary
    this.exitCode = options.exitCode
    this.signal = options.signal
    this.stderr = options.stderr
  }
}

function formatFfmpegError(options: {
  binary: string
  exitCode: number | null
  signal: NodeJS.Signals | null
  stderr: string
}): string {
  const details: string[] = []

  if (options.signal) {
    details.push(`signal ${options.signal}`)
  } else if (options.exitCode !== null) {
    details.push(`exit code ${options.exitCode}`)
  }

  const stderr = options.stderr.trim()
  const suffix = stderr === '' ? '' : `\n${lastLines(stderr, 12)}`

  if (options.binary === 'ffmpeg') {
    return `FFmpeg failed (${details.join(', ') || 'unknown error'})${suffix}`
  }

  return `${options.binary} failed (${details.join(', ') || 'unknown error'})${suffix}`
}

function lastLines(value: string, count: number): string {
  const lines = value.split(/\r?\n/).filter((line) => line.trim().length > 0)
  return lines.slice(-count).join('\n')
}
