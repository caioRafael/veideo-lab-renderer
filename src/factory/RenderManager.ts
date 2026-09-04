import type {
  FactoryProgress,
  FactoryProgressEvent,
  JobProgress,
  RenderJob,
  RenderManagerOptions,
} from '../interfaces/factory'
import type { RenderProgress } from '../interfaces/render-runtime'
import type { Renderer } from '../renderer/Renderer'
import { RenderCancelledError } from '../renderer/RenderCancelledError'
import { buildManifest } from './buildManifest'
import { isRetryableError } from './isRetryableError'
import { transitionJob } from './jobLifecycle'
import { RenderQueue } from './RenderQueue'
import {
  parseNonNegativeInteger,
  parsePositiveInteger,
} from './validateOptions'

export interface RenderManagerDependencies {
  createRenderer: () => Renderer
  onProgress?: (event: FactoryProgressEvent) => void
}

export class RenderManager {
  private readonly queue = new RenderQueue()
  private readonly maxConcurrentRenders: number
  private readonly maxRetries: number
  private readonly createRenderer: () => Renderer
  private readonly onProgress:
    ((event: FactoryProgressEvent) => void) | undefined

  private readonly jobProgress = new Map<string, JobProgress>()
  private readonly jobControllers = new Map<string, AbortController>()
  private readonly factoryController = new AbortController()

  constructor(
    options: RenderManagerOptions,
    dependencies: RenderManagerDependencies,
  ) {
    this.maxConcurrentRenders = parsePositiveInteger(
      options.maxConcurrentRenders,
      'concurrency',
    )
    this.maxRetries = parseNonNegativeInteger(
      options.maxRetries ?? 0,
      'retries',
    )
    this.createRenderer = dependencies.createRenderer
    this.onProgress = dependencies.onProgress
  }

  enqueue(job: RenderJob): void {
    this.queue.enqueue(job)
    this.emitProgress()
  }

  getJob(id: string): RenderJob | undefined {
    return this.queue.get(id)
  }

  getProgress(): FactoryProgress {
    return this.queue.progress()
  }

  cancel(): void {
    this.factoryController.abort()
  }

  async run(signal?: AbortSignal): Promise<ReturnType<typeof buildManifest>> {
    const onFactoryAbort = (): void => {
      this.cancelQueuedJobs()
      this.abortRunningJobs()
    }

    const onExternalAbort = (): void => {
      this.factoryController.abort()
    }

    this.factoryController.signal.addEventListener('abort', onFactoryAbort, {
      once: true,
    })

    if (signal?.aborted === true) {
      this.factoryController.abort()
      return buildManifest(this.queue.all())
    }

    signal?.addEventListener('abort', onExternalAbort, { once: true })

    if (this.factoryController.signal.aborted) {
      onFactoryAbort()
      signal?.removeEventListener('abort', onExternalAbort)
      return buildManifest(this.queue.all())
    }

    try {
      const workers = Array.from({ length: this.maxConcurrentRenders }, () =>
        this.worker(),
      )
      await Promise.all(workers)
      return buildManifest(this.queue.all())
    } finally {
      signal?.removeEventListener('abort', onExternalAbort)
      this.factoryController.signal.removeEventListener('abort', onFactoryAbort)
    }
  }

  private async worker(): Promise<void> {
    while (!this.isAborted()) {
      const job = this.queue.dequeue()
      if (job === undefined) {
        return
      }

      await this.executeJob(job)
    }

    this.cancelQueuedJobs()
  }

  private async executeJob(job: RenderJob): Promise<void> {
    const renderer = this.createRenderer()
    const jobController = new AbortController()
    this.jobControllers.set(job.id, jobController)

    const onFactoryAbort = (): void => {
      jobController.abort()
    }

    this.factoryController.signal.addEventListener('abort', onFactoryAbort, {
      once: true,
    })

    try {
      job.attempt += 1
      transitionJob(job, 'preparing')
      this.emitProgress()

      const renderOptions = {
        signal: jobController.signal,
        onProgress: (progress: RenderProgress) => {
          this.jobProgress.set(job.id, { jobId: job.id, progress })
          this.emitProgress()
        },
      }

      const prepared = await renderer.prepare(job.composition, renderOptions)
      transitionJob(job, 'rendering')
      this.emitProgress()

      const result = await renderer.runPrepared(prepared, renderOptions)
      job.metrics = result.metrics
      job.outputPath = result.outputPath
      delete job.error
      transitionJob(job, 'completed')
      this.emitProgress()
    } catch (error) {
      this.handleJobError(job, error)
    } finally {
      this.factoryController.signal.removeEventListener('abort', onFactoryAbort)
      this.jobControllers.delete(job.id)
      this.jobProgress.delete(job.id)
      renderer.cleanupTemporaryFiles()
    }
  }

  private handleJobError(job: RenderJob, error: unknown): void {
    const cancelled = this.isAborted() || error instanceof RenderCancelledError

    if (cancelled) {
      if (job.status !== 'cancelled') {
        transitionJob(job, 'cancelled')
      }
      job.error =
        error instanceof Error ? error.message : 'Render was cancelled'
      this.emitProgress()
      return
    }

    job.error = error instanceof Error ? error.message : String(error)
    transitionJob(job, 'failed')

    if (isRetryableError(error) && job.attempt <= this.maxRetries) {
      transitionJob(job, 'queued')
      this.queue.requeue(job)
    }

    this.emitProgress()
  }

  private cancelQueuedJobs(): void {
    for (const job of this.queue.all()) {
      if (job.status === 'queued') {
        transitionJob(job, 'cancelled')
      }
    }

    this.emitProgress()
  }

  private abortRunningJobs(): void {
    for (const controller of this.jobControllers.values()) {
      controller.abort()
    }
  }

  private isAborted(): boolean {
    return this.factoryController.signal.aborted
  }

  private emitProgress(): void {
    this.onProgress?.({
      factory: this.queue.progress(),
      jobs: [...this.jobProgress.values()],
    })
  }
}
