import { AudioTimeline } from '../composition/AudioTimeline'
import { FfmpegCommandBuilder } from '../ffmpeg/FfmpegCommandBuilder'
import {
  SpawnFfmpegExecutor,
  type FfmpegExecutor,
} from '../ffmpeg/FfmpegExecutor'
import { formatFfmpegCommand } from '../ffmpeg/formatFfmpegCommand'
import type { Composition } from '../interfaces/composition'
import type { RenderPlan } from '../interfaces/render-plan'
import type { MediaResolver } from '../media/MediaResolver'

export interface RendererOptions {
  mediaResolver: MediaResolver
  audioTimeline?: AudioTimeline
  commandBuilder?: FfmpegCommandBuilder
  executor?: FfmpegExecutor
}

export interface RenderResult {
  outputPath: string
  args: string[]
}

export class Renderer {
  private readonly mediaResolver: MediaResolver
  private readonly audioTimeline: AudioTimeline
  private readonly commandBuilder: FfmpegCommandBuilder
  private readonly executor: FfmpegExecutor

  constructor(options: RendererOptions) {
    this.mediaResolver = options.mediaResolver
    this.audioTimeline = options.audioTimeline ?? new AudioTimeline()
    this.commandBuilder = options.commandBuilder ?? new FfmpegCommandBuilder()
    this.executor = options.executor ?? new SpawnFfmpegExecutor()
  }

  async render(composition: Composition): Promise<RenderResult> {
    const plan = this.createPlan(composition)
    const args = this.commandBuilder.build(plan)

    console.log('FFmpeg command:')
    console.log(formatFfmpegCommand(args))
    console.log('')

    await this.executor.execute(args)

    return {
      outputPath: plan.outputPath,
      args,
    }
  }

  private createPlan(composition: Composition): RenderPlan {
    const totalSeconds = composition.scenes.reduce(
      (sum, scene) => sum + scene.duration,
      0,
    )

    return {
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      totalSeconds,
      outputPath: this.mediaResolver.resolveOutput(composition.output),
      scenes: composition.scenes.map((scene) => ({
        type: scene.type,
        path: this.mediaResolver.resolveSceneSource(scene),
        duration: scene.duration,
      })),
      audioTracks: this.audioTimeline
        .collect(composition, totalSeconds)
        .map((clip) => ({
          path: this.mediaResolver.resolveAudio(clip.source),
          start: clip.start,
          duration: clip.duration,
          volume: clip.volume,
        })),
    }
  }
}
