export type RenderPhase =
  | 'loading'
  | 'planning'
  | 'preparing'
  | 'rendering'
  | 'finalizing'
  | 'completed'
  | 'cancelled'
  | 'failed'

export interface RenderProgress {
  phase: RenderPhase
  progress: number
  elapsedMs: number
  durationMs?: number
  fps?: number
  speed?: number
  message?: string
}

export interface RenderOptions {
  signal?: AbortSignal
  onProgress?: (progress: RenderProgress) => void
}

export interface RenderPlanStats {
  sceneCount: number
  videoItemCount: number
  audioItemCount: number
  textItemCount: number
  overlayItemCount: number
  transitionCount: number
  effectCount: number
  inputCount: number
  width: number
  height: number
  fps: number
  videoDuration: number
}

export interface RenderPhaseTimings {
  planningMs: number
  preparingMs: number
  commandMs: number
  ffmpegMs: number
  cleanupMs: number
}

export interface RenderMetrics {
  composition?: string
  videoDuration: number
  renderDurationMs: number
  renderFactor: number
  inputCount: number
  sceneCount: number
  textCount: number
  overlayCount: number
  audioCount: number
  transitionCount: number
  effectCount: number
  temporaryFiles: number
  outputSizeBytes: number
  startedAt: string
  finishedAt: string
  durationMs: number
  phases: RenderPhaseTimings
}

export interface FfmpegProgressUpdate {
  timeSeconds?: number
  fps?: number
  speed?: number
}
