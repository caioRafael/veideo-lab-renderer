import fs from 'node:fs'
import path from 'node:path'
import { AudioTimeline } from '../composition/AudioTimeline'
import { ffmpegSupportsDrawtext } from '../ffmpeg/ffmpegCapabilities'
import { FfmpegCommandBuilder } from '../ffmpeg/FfmpegCommandBuilder'
import {
  SpawnFfmpegExecutor,
  type FfmpegExecutor,
} from '../ffmpeg/FfmpegExecutor'
import type { Composition } from '../interfaces/composition'
import { getTextItems, type RenderPlan } from '../interfaces/render-plan'
import type {
  RenderMetrics,
  RenderOptions,
  RenderPhase,
  RenderPhaseTimings,
  RenderPlanStats,
  RenderProgress,
} from '../interfaces/render-runtime'
import {
  assertVideoMedia,
  type MediaDurationProbe,
} from '../media/assertVideoMedia'
import { FontResolver } from '../media/FontResolver'
import type { MediaResolver } from '../media/MediaResolver'
import { rasterizeTextTrack } from '../media/rasterizeTextTrack'
import { buildRenderPlan } from './buildRenderPlan'
import { collectPlanStats } from './collectPlanStats'
import {
  countTemporaryFiles,
  createRenderContext,
  disposeRenderContext,
  type RenderContext,
} from './RenderContext'
import { RenderCancelledError, throwIfAborted } from './RenderCancelledError'
import { clampProgress, renderFactor } from './renderFactor'

export interface RendererOptions {
  mediaResolver: MediaResolver
  fontResolver?: FontResolver
  audioTimeline?: AudioTimeline
  commandBuilder?: FfmpegCommandBuilder
  executor?: FfmpegExecutor
  mediaDurationProbe?: MediaDurationProbe
}

export interface PreparedRender {
  outputPath: string
  args: string[]
  plan: RenderPlan
  stats: RenderPlanStats
  context: RenderContext
  phaseTimings: Pick<
    RenderPhaseTimings,
    'planningMs' | 'preparingMs' | 'commandMs'
  >
}

export interface RenderResult {
  outputPath: string
  args: string[]
  metrics: RenderMetrics
}

export class Renderer {
  private readonly mediaResolver: MediaResolver
  private readonly fontResolver: FontResolver
  private readonly audioTimeline: AudioTimeline
  private readonly commandBuilder: FfmpegCommandBuilder
  private readonly executor: FfmpegExecutor
  private readonly mediaDurationProbe: MediaDurationProbe | undefined
  private activeContext: RenderContext | undefined

  constructor(options: RendererOptions) {
    this.mediaResolver = options.mediaResolver
    this.fontResolver = options.fontResolver ?? new FontResolver()
    this.audioTimeline = options.audioTimeline ?? new AudioTimeline()
    this.commandBuilder = options.commandBuilder ?? new FfmpegCommandBuilder()
    this.executor = options.executor ?? new SpawnFfmpegExecutor()
    this.mediaDurationProbe = options.mediaDurationProbe
  }

  async prepare(
    composition: Composition,
    options: RenderOptions = {},
  ): Promise<PreparedRender> {
    this.cleanupTemporaryFiles()
    throwIfAborted(options.signal)

    emitProgress(options, {
      phase: 'planning',
      progress: 0,
      elapsedMs: 0,
      message: 'Building render plan',
    })

    const context = createRenderContext()
    this.activeContext = context

    try {
      const planningStart = performance.now()
      const { plan, stats } = await this.preparePlan(
        composition,
        context,
        options,
      )
      const preparingMs = performance.now() - planningStart
      throwIfAborted(options.signal)
      const commandStart = performance.now()
      const args = this.commandBuilder.build(plan)
      const commandMs = performance.now() - commandStart
      emitProgress(options, {
        phase: 'preparing',
        progress: 0,
        elapsedMs: preparingMs + commandMs,
        message: 'FFmpeg command ready',
      })

      return {
        outputPath: plan.outputPath,
        args,
        plan,
        stats,
        context,
        phaseTimings: {
          planningMs: preparingMs,
          preparingMs,
          commandMs,
        },
      }
    } catch (error) {
      this.cleanupTemporaryFiles()
      throw error
    }
  }

  async execute(args: string[], options: RenderOptions = {}): Promise<void> {
    try {
      throwIfAborted(options.signal)
      await this.executor.execute(args, {
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      })
    } finally {
      this.cleanupTemporaryFiles()
    }
  }

  async runPrepared(
    prepared: PreparedRender,
    options: RenderOptions = {},
  ): Promise<RenderResult> {
    const wallStart = performance.now()
    const startedAt = new Date().toISOString()
    const phases: RenderPhaseTimings = {
      planningMs: prepared.phaseTimings.planningMs,
      preparingMs: prepared.phaseTimings.preparingMs,
      commandMs: prepared.phaseTimings.commandMs,
      ffmpegMs: 0,
      cleanupMs: 0,
    }

    this.activeContext = prepared.context
    const stagingPath = stagingOutputPath(prepared.outputPath)

    try {
      throwIfAborted(options.signal)
      removeIfExists(stagingPath)
      const executeArgs = [...prepared.args.slice(0, -1), stagingPath]

      emitProgress(options, {
        phase: 'rendering',
        progress: 0,
        elapsedMs: 0,
        durationMs: prepared.plan.duration * 1000,
        message: 'Starting FFmpeg',
      })

      const ffmpegStart = performance.now()
      try {
        await this.executor.execute(executeArgs, {
          ...(options.signal === undefined ? {} : { signal: options.signal }),
          onProgress: (update) => {
            const elapsedMs = performance.now() - wallStart
            const progress = clampProgress(
              update.timeSeconds === undefined
                ? 0
                : update.timeSeconds / prepared.plan.duration,
            )
            const next: RenderProgress = {
              phase: 'rendering',
              progress,
              elapsedMs,
              durationMs: prepared.plan.duration * 1000,
            }

            if (update.fps !== undefined) {
              next.fps = update.fps
            }

            if (update.speed !== undefined) {
              next.speed = update.speed
            }

            options.onProgress?.(next)
          },
        })
      } catch (error) {
        removeIfExists(stagingPath)
        throw error
      }

      phases.ffmpegMs = performance.now() - ffmpegStart

      emitProgress(options, {
        phase: 'finalizing',
        progress: 1,
        elapsedMs: performance.now() - wallStart,
        durationMs: prepared.plan.duration * 1000,
        message: 'Writing output',
      })

      const temporaryFiles = countTemporaryFiles(prepared.context.tempDir)
      if (fs.existsSync(stagingPath)) {
        replaceOutput(stagingPath, prepared.outputPath)
      }

      const durationMs = performance.now() - wallStart
      const metrics = this.buildMetrics(prepared.stats, {
        durationMs,
        startedAt,
        finishedAt: new Date().toISOString(),
        temporaryFiles,
        outputSizeBytes: fileSize(prepared.outputPath),
        phases,
      })

      emitProgress(options, {
        phase: 'completed',
        progress: 1,
        elapsedMs: durationMs,
        durationMs: prepared.plan.duration * 1000,
        message: 'Completed',
      })

      return {
        outputPath: prepared.outputPath,
        args: prepared.args,
        metrics,
      }
    } catch (error) {
      const failed =
        options.signal?.aborted === true ||
        error instanceof RenderCancelledError
      emitProgress(options, {
        phase: failed ? 'cancelled' : 'failed',
        progress: 0,
        elapsedMs: performance.now() - wallStart,
        message: error instanceof Error ? error.message : 'Render failed',
      })
      throw error
    } finally {
      const cleanupStart = performance.now()
      this.cleanupTemporaryFiles()
      phases.cleanupMs = performance.now() - cleanupStart
    }
  }

  async render(
    composition: Composition,
    options: RenderOptions = {},
  ): Promise<RenderResult> {
    const wallStart = performance.now()
    const startedAt = new Date().toISOString()
    const prepared = await this.prepare(composition, options)
    const result = await this.runPrepared(prepared, options)
    const durationMs = performance.now() - wallStart
    result.metrics.renderDurationMs = durationMs
    result.metrics.durationMs = durationMs
    result.metrics.renderFactor = renderFactor(
      durationMs,
      result.metrics.videoDuration,
    )
    result.metrics.startedAt = startedAt
    result.metrics.finishedAt = new Date().toISOString()
    return result
  }

  cleanupTemporaryFiles(): void {
    disposeRenderContext(this.activeContext)
    this.activeContext = undefined
  }

  private async preparePlan(
    composition: Composition,
    context: RenderContext,
    options: RenderOptions,
  ): Promise<{ plan: RenderPlan; stats: RenderPlanStats }> {
    const plan = buildRenderPlan(
      composition,
      this.mediaResolver,
      this.audioTimeline,
      this.fontResolver,
    )
    const stats = collectPlanStats(plan)

    assertVideoMedia(plan, this.mediaDurationProbe)
    throwIfAborted(options.signal)

    if (getTextItems(plan).length === 0 || ffmpegSupportsDrawtext()) {
      return { plan, stats }
    }

    const rasterized = await rasterizeTextTrack(plan, {
      outputDirectory: context.textDir,
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    })
    const after = collectPlanStats(rasterized.plan)
    return {
      plan: rasterized.plan,
      stats: {
        ...stats,
        inputCount: after.inputCount,
      },
    }
  }

  private buildMetrics(
    stats: RenderPlanStats,
    extras: {
      durationMs: number
      startedAt: string
      finishedAt: string
      temporaryFiles: number
      outputSizeBytes: number
      phases: RenderPhaseTimings
    },
  ): RenderMetrics {
    const metrics: RenderMetrics = {
      videoDuration: stats.videoDuration,
      renderDurationMs: extras.durationMs,
      renderFactor: renderFactor(extras.durationMs, stats.videoDuration),
      inputCount: stats.inputCount,
      sceneCount: stats.sceneCount,
      textCount: stats.textItemCount,
      overlayCount: stats.overlayItemCount,
      audioCount: stats.audioItemCount,
      transitionCount: stats.transitionCount,
      effectCount: stats.effectCount,
      temporaryFiles: extras.temporaryFiles,
      outputSizeBytes: extras.outputSizeBytes,
      startedAt: extras.startedAt,
      finishedAt: extras.finishedAt,
      durationMs: extras.durationMs,
      phases: extras.phases,
    }

    return metrics
  }
}

function emitProgress(options: RenderOptions, progress: RenderProgress): void {
  options.onProgress?.(progress)
}

function stagingOutputPath(outputPath: string): string {
  const parsed = path.parse(outputPath)
  return path.join(parsed.dir, `${parsed.name}.tmp${parsed.ext || '.mp4'}`)
}

function replaceOutput(stagingPath: string, outputPath: string): void {
  if (!fs.existsSync(stagingPath)) {
    throw new Error(`FFmpeg finished without writing ${stagingPath}`)
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.rmSync(outputPath, { force: true })
  fs.renameSync(stagingPath, outputPath)
}

function removeIfExists(filePath: string): void {
  fs.rmSync(filePath, { force: true })
}

function fileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size
  } catch {
    return 0
  }
}

export function isTerminalPhase(phase: RenderPhase): boolean {
  return phase === 'completed' || phase === 'cancelled' || phase === 'failed'
}
