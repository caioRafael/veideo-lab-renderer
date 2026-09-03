import { AudioTimeline } from '../composition/AudioTimeline'
import { ffmpegSupportsDrawtext } from '../ffmpeg/ffmpegCapabilities'
import { FfmpegCommandBuilder } from '../ffmpeg/FfmpegCommandBuilder'
import {
  SpawnFfmpegExecutor,
  type FfmpegExecutor,
} from '../ffmpeg/FfmpegExecutor'
import { formatFfmpegCommand } from '../ffmpeg/formatFfmpegCommand'
import type { Composition } from '../interfaces/composition'
import { getTextItems, type RenderPlan } from '../interfaces/render-plan'
import type { MediaResolver } from '../media/MediaResolver'
import { rasterizeTextTrack } from '../media/rasterizeTextTrack'
import { buildRenderPlan } from './buildRenderPlan'

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
    const plan = this.preparePlan(composition)
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

  private preparePlan(composition: Composition): RenderPlan {
    const plan = buildRenderPlan(
      composition,
      this.mediaResolver,
      this.audioTimeline,
    )

    if (getTextItems(plan).length === 0 || ffmpegSupportsDrawtext()) {
      return plan
    }

    return rasterizeTextTrack(plan)
  }
}
