import path from 'node:path'
import type { Composition } from '../interfaces/composition'
import type {
  FactoryManifest,
  FactoryProgressEvent,
  RenderJob,
  RenderJobResult,
  RenderManagerOptions,
} from '../interfaces/factory'
import type { MediaPaths } from '../interfaces/media-paths'
import type { Template, TemplateInput } from '../interfaces/template'
import { FontResolver } from '../media/FontResolver'
import { MediaResolver } from '../media/MediaResolver'
import { Renderer, type RendererOptions } from '../renderer/Renderer'
import { TemplateResolver } from '../template/TemplateResolver'
import { parseTemplate } from '../template/validateTemplate'
import { createRenderJob, formatJobId } from './createRenderJob'
import { RenderManager } from './RenderManager'
import { relativizeManifest, writeManifest } from './writeManifest'

export interface VideoFactoryOptions extends RenderManagerOptions {
  mediaPaths: MediaPaths
  outputDirectory?: string
  fontDirectory?: string
  rendererOptions?: Partial<RendererOptions>
  onProgress?: (event: FactoryProgressEvent) => void
}

export interface RenderTemplateBatchOptions {
  template: Template
  inputs: TemplateInput[]
  signal?: AbortSignal
}

export class VideoFactory {
  private readonly mediaResolver: MediaResolver
  private readonly fontResolver: FontResolver
  private readonly outputDirectory: string
  private readonly templateResolver = new TemplateResolver()
  private readonly managerOptions: RenderManagerOptions
  private readonly rendererOptions: Partial<RendererOptions>
  private readonly onProgress:
    ((event: FactoryProgressEvent) => void) | undefined

  constructor(options: VideoFactoryOptions) {
    this.outputDirectory =
      options.outputDirectory ?? options.mediaPaths.outputVideos
    this.mediaResolver = new MediaResolver({
      ...options.mediaPaths,
      outputVideos: this.outputDirectory,
    })
    this.fontResolver = new FontResolver(options.fontDirectory)
    this.managerOptions = {
      maxConcurrentRenders: options.maxConcurrentRenders,
      ...(options.maxRetries === undefined
        ? {}
        : { maxRetries: options.maxRetries }),
    }
    this.rendererOptions = options.rendererOptions ?? {}
    this.onProgress = options.onProgress
  }

  async renderTemplate(
    options: RenderTemplateBatchOptions,
  ): Promise<FactoryManifest> {
    parseTemplate(options.template)

    const jobs: RenderJob[] = []
    const resolveFailures: RenderJobResult[] = []

    for (const [index, input] of options.inputs.entries()) {
      const id = formatJobId(index)
      const outputName = `${id}/video.mp4`

      try {
        const composition = this.prepareComposition(
          this.templateResolver.resolve(options.template, input),
          outputName,
        )
        jobs.push(
          createRenderJob({
            id,
            composition,
            outputPath: path.join(this.outputDirectory, outputName),
          }),
        )
      } catch (error) {
        resolveFailures.push({
          jobId: id,
          status: 'failed',
          attempt: 0,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const manager = new RenderManager(this.managerOptions, {
      createRenderer: () => this.createRenderer(),
      ...(this.onProgress === undefined ? {} : { onProgress: this.onProgress }),
    })

    for (const job of jobs) {
      manager.enqueue(job)
    }

    const rendered = await manager.run(options.signal)
    const manifest = mergeManifest(rendered, resolveFailures)
    const relative = relativizeManifest(manifest, this.outputDirectory)
    writeManifest(relative, this.outputDirectory)
    return relative
  }

  private prepareComposition(
    composition: Composition,
    outputName: string,
  ): Composition {
    return {
      ...composition,
      output: outputName,
    }
  }

  private createRenderer(): Renderer {
    return new Renderer({
      mediaResolver: this.mediaResolver,
      fontResolver: this.fontResolver,
      ...this.rendererOptions,
    })
  }
}

function mergeManifest(
  rendered: FactoryManifest,
  resolveFailures: RenderJobResult[],
): FactoryManifest {
  const jobs = [...rendered.jobs, ...resolveFailures].sort((left, right) =>
    left.jobId.localeCompare(right.jobId),
  )

  return {
    total: jobs.length,
    completed: jobs.filter((job) => job.status === 'completed').length,
    failed: jobs.filter((job) => job.status === 'failed').length,
    cancelled: jobs.filter((job) => job.status === 'cancelled').length,
    jobs,
  }
}
