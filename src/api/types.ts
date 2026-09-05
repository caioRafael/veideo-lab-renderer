import type {
  RenderMetrics,
  RenderProgress,
} from '../interfaces/render-runtime'

export interface RenderOutputPath {
  path: string
}

export type RenderOutput = string | RenderOutputPath

export interface RenderInput {
  composition: unknown
  assets?: Record<string, string>
  output: RenderOutput
  fonts?: string
  signal?: AbortSignal
  onProgress?: (progress: RenderProgress) => void
}

export interface RenderOutputResult {
  outputPath: string
  duration: number
  metrics: RenderMetrics
}
