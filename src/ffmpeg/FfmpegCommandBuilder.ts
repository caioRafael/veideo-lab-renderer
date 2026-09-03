import { AudioTimeline } from '../composition/AudioTimeline'
import { CompositionParser } from '../composition/CompositionParser'
import type { BuildCommandOptions } from '../interfaces/build-command'
import { AudioFilter } from './AudioFilter'
import { MediaResolver } from './MediaResolver'
import { VideoFilter } from './VideoFilter'

export class FfmpegCommandBuilder {
  private readonly options: BuildCommandOptions

  constructor(options: BuildCommandOptions) {
    this.options = options
  }

  build(): string[] {
    const composition = new CompositionParser().parse(this.options.composition)
    const resolver = new MediaResolver(this.options.mediaPaths)

    const width = composition.width ?? 1920
    const height = composition.height ?? 1080
    const fps = composition.fps ?? 25
    const totalSeconds = composition.scenes.reduce(
      (sum, scene) => sum + scene.duration,
      0,
    )

    const outputPath = resolver.resolveOutput(
      composition.output ?? 'output.mp4',
    )

    const videoFilter = new VideoFilter(width, height, fps)
    const audioFilter = new AudioFilter(totalSeconds)
    const audioTimeline = new AudioTimeline(resolver)

    const args: string[] = ['-y']
    const filterParts: string[] = []
    const videoLabels: string[] = []

    for (const [index, scene] of composition.scenes.entries()) {
      const sourcePath = resolver.resolveSceneSource(scene)

      if (scene.type === 'image') {
        args.push('-loop', '1', '-t', String(scene.duration), '-i', sourcePath)
      } else {
        args.push('-t', String(scene.duration), '-i', sourcePath)
      }

      const outputLabel = `v${index}`
      filterParts.push(videoFilter.scale(`${index}:v`, outputLabel))
      videoLabels.push(`[${outputLabel}]`)
    }

    const audioClips = audioTimeline.collect(composition, totalSeconds)
    const audioInputOffset = composition.scenes.length

    if (audioClips.length === 0) {
      args.push(
        '-f',
        'lavfi',
        '-t',
        String(totalSeconds),
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=44100',
      )
    } else {
      for (const clip of audioClips) {
        args.push('-i', clip.path)
      }
    }

    filterParts.push(
      `${videoLabels.join('')}concat=n=${composition.scenes.length}:v=1:a=0[vout]`,
    )

    if (audioClips.length === 0) {
      filterParts.push(
        `[${audioInputOffset}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]`,
      )
    } else if (audioClips.length === 1) {
      const clip = audioClips[0]!
      filterParts.push(
        audioFilter.prepare(`${audioInputOffset}:a`, 'aout', clip),
      )
    } else {
      const audioLabels: string[] = []
      for (const [index, clip] of audioClips.entries()) {
        const inputIndex = audioInputOffset + index
        const outputLabel = `a${index}`
        filterParts.push(
          audioFilter.prepare(`${inputIndex}:a`, outputLabel, clip),
        )
        audioLabels.push(`[${outputLabel}]`)
      }
      filterParts.push(
        `${audioLabels.join('')}amix=inputs=${audioClips.length}:duration=first:dropout_transition=0:normalize=0[aout]`,
      )
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
      String(totalSeconds),
      '-pix_fmt',
      'yuv420p',
      outputPath,
    )

    return args
  }
}
