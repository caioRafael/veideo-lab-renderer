import { AudioTimeline } from '../composition/AudioTimeline'
import { ffmpegSupportsDrawtext } from '../ffmpeg/ffmpegCapabilities'
import { FfmpegCommandBuilder } from '../ffmpeg/FfmpegCommandBuilder'
import {
  SpawnFfmpegExecutor,
  type FfmpegExecutor,
} from '../ffmpeg/FfmpegExecutor'
import type { Composition } from '../interfaces/composition'
import { getTextItems, type RenderPlan } from '../interfaces/render-plan'
import { FontResolver } from '../media/FontResolver'
import type { MediaResolver } from '../media/MediaResolver'
import { rasterizeTextTrack } from '../media/rasterizeTextTrack'
import { buildRenderPlan } from './buildRenderPlan'

export interface RendererOptions {
  mediaResolver: MediaResolver
  fontResolver?: FontResolver
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
  private readonly fontResolver: FontResolver
  private readonly audioTimeline: AudioTimeline
  private readonly commandBuilder: FfmpegCommandBuilder
  private readonly executor: FfmpegExecutor

  constructor(options: RendererOptions) {
    this.mediaResolver = options.mediaResolver
    this.fontResolver = options.fontResolver ?? new FontResolver()
    this.audioTimeline = options.audioTimeline ?? new AudioTimeline()
    this.commandBuilder = options.commandBuilder ?? new FfmpegCommandBuilder()
    this.executor = options.executor ?? new SpawnFfmpegExecutor()
  }

  prepare(composition: Composition): RenderResult {
    const plan = this.preparePlan(composition)

    return {
      outputPath: plan.outputPath,
      args: this.commandBuilder.build(plan),
    }
  }

  async execute(args: string[]): Promise<void> {
    await this.executor.execute(args)
  }

  async render(composition: Composition): Promise<RenderResult> {
    const result = this.prepare(composition)
    await this.execute(result.args)
    return result
  }

  private preparePlan(composition: Composition): RenderPlan {
    const plan = buildRenderPlan(
      composition,
      this.mediaResolver,
      this.audioTimeline,
      this.fontResolver,
    )

    if (getTextItems(plan).length === 0 || ffmpegSupportsDrawtext()) {
      return plan
    }

    return rasterizeTextTrack(plan)
  }
}
