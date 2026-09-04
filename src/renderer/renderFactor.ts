export function renderFactor(
  renderDurationMs: number,
  videoDurationSeconds: number,
): number {
  if (
    !Number.isFinite(renderDurationMs) ||
    !Number.isFinite(videoDurationSeconds) ||
    renderDurationMs < 0 ||
    videoDurationSeconds <= 0
  ) {
    return 0
  }

  return renderDurationMs / 1000 / videoDurationSeconds
}

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(0, value))
}
