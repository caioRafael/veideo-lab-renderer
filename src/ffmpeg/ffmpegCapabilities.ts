import { spawnSync } from 'node:child_process'

let drawtextSupport: boolean | undefined

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
  drawtextSupport = !output.includes('Unknown filter')
  return drawtextSupport
}
