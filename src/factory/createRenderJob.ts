import type { Composition } from '../interfaces/composition'
import type { RenderJob } from '../interfaces/factory'
import { cloneJson } from '../template/jsonValue'

export function formatJobId(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid job index: expected a non-negative integer`)
  }

  return `job-${String(index + 1).padStart(3, '0')}`
}

export function createRenderJob(options: {
  id: string
  composition: Composition
  outputPath: string
}): RenderJob {
  return {
    id: options.id,
    composition: cloneJson(options.composition),
    outputPath: options.outputPath,
    status: 'queued',
    attempt: 0,
  }
}
