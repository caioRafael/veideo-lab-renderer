import type {
  RenderMetrics,
  RenderPlanStats,
} from '../interfaces/render-runtime'

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatSeconds(value: number): string {
  return `${value.toFixed(2)}s`
}

export function formatProgressBar(progress: number, width = 20): string {
  const clamped = Math.min(1, Math.max(0, progress))
  const filled = Math.round(clamped * width)
  return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}] ${(clamped * 100).toFixed(0)}%`
}

export function formatPlanningReport(
  compositionLabel: string,
  stats: RenderPlanStats,
): string {
  return [
    'Video Lab',
    '',
    `Composition: ${compositionLabel}`,
    '',
    'Planning',
    `  Scenes: ${stats.sceneCount}`,
    `  Duration: ${formatSeconds(stats.videoDuration)}`,
    `  Resolution: ${stats.width}x${stats.height}`,
    `  FPS: ${stats.fps}`,
    '',
    'Features',
    `  Video: ${stats.videoItemCount}`,
    `  Audio: ${stats.audioItemCount}`,
    `  Text: ${stats.textItemCount}`,
    `  Overlay: ${stats.overlayItemCount}`,
    `  Transitions: ${stats.transitionCount}`,
    `  Effects: ${stats.effectCount}`,
  ].join('\n')
}

export function formatMetricsReport(metrics: RenderMetrics): string {
  return [
    'Metrics',
    `  Render time: ${formatSeconds(metrics.renderDurationMs / 1000)}`,
    `  Video duration: ${formatSeconds(metrics.videoDuration)}`,
    `  Render factor: ${metrics.renderFactor.toFixed(3)}x`,
    `  Output size: ${formatBytes(metrics.outputSizeBytes)}`,
    `  Temporary files: ${metrics.temporaryFiles}`,
    '',
    'Phases',
    `  Planning: ${metrics.phases.planningMs.toFixed(1)}ms`,
    `  Preparing: ${metrics.phases.preparingMs.toFixed(1)}ms`,
    `  Command: ${metrics.phases.commandMs.toFixed(1)}ms`,
    `  FFmpeg: ${formatSeconds(metrics.phases.ffmpegMs / 1000)}`,
    `  Cleanup: ${metrics.phases.cleanupMs.toFixed(1)}ms`,
  ].join('\n')
}
