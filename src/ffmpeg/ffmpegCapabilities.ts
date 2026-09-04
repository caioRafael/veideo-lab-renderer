import { spawnSync } from 'node:child_process'

let drawtextSupport: boolean | undefined

export function detectDrawtextSupport(
  helpOutput: string,
  spawnError?: Error,
): boolean {
  if (errorCode(spawnError) === 'ENOENT') {
    throw new Error('FFmpeg was not found in PATH')
  }

  if (spawnError) {
    throw new Error(`Failed to inspect FFmpeg filters: ${spawnError.message}`)
  }

  return !helpOutput.includes('Unknown filter')
}

function errorCode(error: Error | undefined): string | undefined {
  if (error === undefined || !('code' in error)) {
    return undefined
  }

  return typeof error.code === 'string' ? error.code : undefined
}

export function ffmpegSupportsDrawtext(): boolean {
  if (drawtextSupport !== undefined) {
    return drawtextSupport
  }

  const result = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-h', 'filter=drawtext'],
    {
      encoding: 'utf8',
    },
  )
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  drawtextSupport = detectDrawtextSupport(output, result.error)
  return drawtextSupport
}
