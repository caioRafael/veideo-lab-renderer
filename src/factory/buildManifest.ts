import type {
  FactoryManifest,
  RenderJob,
  RenderJobResult,
} from '../interfaces/factory'

export function jobToResult(job: RenderJob): RenderJobResult {
  const result: RenderJobResult = {
    jobId: job.id,
    status: job.status,
    attempt: job.attempt,
  }

  if (job.status === 'completed') {
    result.outputPath = job.outputPath
  }

  if (job.error !== undefined) {
    result.error = job.error
  }

  if (job.metrics !== undefined) {
    result.videoDuration = job.metrics.videoDuration
    result.renderDurationMs = job.metrics.renderDurationMs
    result.renderFactor = job.metrics.renderFactor
  }

  return result
}

export function buildManifest(jobs: RenderJob[]): FactoryManifest {
  const results = jobs.map(jobToResult)

  return {
    total: results.length,
    completed: results.filter((job) => job.status === 'completed').length,
    failed: results.filter((job) => job.status === 'failed').length,
    cancelled: results.filter((job) => job.status === 'cancelled').length,
    jobs: results,
  }
}
