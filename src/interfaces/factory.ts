import type { Composition } from './composition'
import type { RenderMetrics, RenderProgress } from './render-runtime'

export type RenderJobStatus =
  'queued' | 'preparing' | 'rendering' | 'completed' | 'failed' | 'cancelled'

export interface RenderJob {
  id: string
  composition: Composition
  outputPath: string
  status: RenderJobStatus
  attempt: number
  error?: string
  metrics?: RenderMetrics
}

export interface RenderManagerOptions {
  maxConcurrentRenders: number
  maxRetries?: number
}

export interface RetryOptions {
  maxRetries: number
}

export interface JobProgress {
  jobId: string
  progress: RenderProgress
}

export interface FactoryProgress {
  total: number
  completed: number
  failed: number
  cancelled: number
  active: number
  queued: number
}

export interface FactoryProgressEvent {
  factory: FactoryProgress
  jobs: JobProgress[]
}

export interface RenderJobResult {
  jobId: string
  status: RenderJobStatus
  outputPath?: string
  error?: string
  attempt: number
  videoDuration?: number
  renderDurationMs?: number
  renderFactor?: number
}

export interface FactoryManifest {
  total: number
  completed: number
  failed: number
  cancelled: number
  jobs: RenderJobResult[]
}
