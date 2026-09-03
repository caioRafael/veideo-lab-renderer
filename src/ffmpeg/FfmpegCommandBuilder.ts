import type { RenderPlan } from '../interfaces/render-plan'
import { AudioFilter } from './AudioFilter'
import { VideoFilter } from './VideoFilter'

export class FfmpegCommandBuilder {
  build(plan: RenderPlan): string[] {
    const videoFilter = new VideoFilter(plan.width, plan.height, plan.fps)
    const audioFilter = new AudioFilter(plan.totalSeconds)

    const args: string[] = ['-y']
    const filterParts: string[] = []
    const videoLabels: string[] = []

    for (const [index, scene] of plan.scenes.entries()) {
      if (scene.type === 'image') {
        args.push('-loop', '1', '-t', String(scene.duration), '-i', scene.path)
      } else {
        args.push('-t', String(scene.duration), '-i', scene.path)
      }

      const outputLabel = `v${index}`
      filterParts.push(videoFilter.scale(`${index}:v`, outputLabel))
      videoLabels.push(`[${outputLabel}]`)
    }

    const audioInputOffset = plan.scenes.length

    if (plan.audioTracks.length === 0) {
      args.push(
        '-f',
        'lavfi',
        '-t',
        String(plan.totalSeconds),
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=44100',
      )
    } else {
      for (const track of plan.audioTracks) {
        args.push('-i', track.path)
      }
    }

    filterParts.push(videoFilter.concat(videoLabels))

    if (plan.audioTracks.length === 0) {
      filterParts.push(audioFilter.silence(`${audioInputOffset}:a`, 'aout'))
    } else if (plan.audioTracks.length === 1) {
      const track = plan.audioTracks[0]
      if (!track) {
        throw new Error('Expected a single audio track')
      }
      filterParts.push(
        audioFilter.prepare(`${audioInputOffset}:a`, 'aout', track),
      )
    } else {
      const audioLabels: string[] = []
      for (const [index, track] of plan.audioTracks.entries()) {
        const inputIndex = audioInputOffset + index
        const outputLabel = `a${index}`
        filterParts.push(
          audioFilter.prepare(`${inputIndex}:a`, outputLabel, track),
        )
        audioLabels.push(`[${outputLabel}]`)
      }
      filterParts.push(audioFilter.mix(audioLabels, 'aout'))
    }

    args.push(
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[vout]',
      '-map',
      '[aout]',
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-t',
      String(plan.totalSeconds),
      '-pix_fmt',
      'yuv420p',
      plan.outputPath,
    )

    return args
  }
}
