import { AudioTimeline } from '../composition/AudioTimeline'
import { ffmpegSupportsDrawtext } from '../ffmpeg/ffmpegCapabilities'
import { FfmpegCommandBuilder } from '../ffmpeg/FfmpegCommandBuilder'
import {
  SpawnFfmpegExecutor,
  type FfmpegExecutor,
} from '../ffmpeg/FfmpegExecutor'
import type { Composition } from '../interfaces/composition'
import { getTextItems, type RenderPlan } from '../interfaces/render-plan'
import {
  assertVideoMedia,
  type MediaDurationProbe,
} from '../media/assertVideoMedia'
import { FontResolver } from '../media/FontResolver'
import type { MediaResolver } from '../media/MediaResolver'
import {
  rasterizeTextTrack,
  removeTemporaryDirectory,
} from '../media/rasterizeTextTrack'
import { buildRenderPlan } from './buildRenderPlan'

export interface RendererOptions {
  mediaResolver: MediaResolver
  fontResolver?: FontResolver
  audioTimeline?: AudioTimeline
  commandBuilder?: FfmpegCommandBuilder
  executor?: FfmpegExecutor
  mediaDurationProbe?: MediaDurationProbe
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
  private readonly mediaDurationProbe: MediaDurationProbe | undefined
  private temporaryDirectory: string | undefined

  constructor(options: RendererOptions) {
    this.mediaResolver = options.mediaResolver
    this.fontResolver = options.fontResolver ?? new FontResolver()
    this.audioTimeline = options.audioTimeline ?? new AudioTimeline()
    this.commandBuilder = options.commandBuilder ?? new FfmpegCommandBuilder()
    this.executor = options.executor ?? new SpawnFfmpegExecutor()
    this.mediaDurationProbe = options.mediaDurationProbe
  }

  prepare(composition: Composition): RenderResult {
    this.cleanupTemporaryFiles()
    const plan = this.preparePlan(composition)

    return {
      outputPath: plan.outputPath,
      args: this.commandBuilder.build(plan),
    }
  }

  async execute(args: string[]): Promise<void> {
    try {
      await this.executor.execute(args)
    } finally {
      this.cleanupTemporaryFiles()
    }
  }

  async render(composition: Composition): Promise<RenderResult> {
    const result = this.prepare(composition)
    await this.execute(result.args)
    return result
  }

  cleanupTemporaryFiles(): void {
    if (this.temporaryDirectory === undefined) {
      return
    }

    removeTemporaryDirectory(this.temporaryDirectory)
    this.temporaryDirectory = undefined
  }

  private preparePlan(composition: Composition): RenderPlan {
    const plan = buildRenderPlan(
      composition,
      this.mediaResolver,
      this.audioTimeline,
      this.fontResolver,
    )

    assertVideoMedia(plan, this.mediaDurationProbe)

    if (getTextItems(plan).length === 0 || ffmpegSupportsDrawtext()) {
      return plan
    }

    const rasterized = rasterizeTextTrack(plan)
    this.temporaryDirectory = rasterized.temporaryDirectory
    return rasterized.plan
  }
}
