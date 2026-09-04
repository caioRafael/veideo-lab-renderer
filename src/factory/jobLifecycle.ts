import type { RenderJob, RenderJobStatus } from '../interfaces/factory'

const ALLOWED_TRANSITIONS: Record<RenderJobStatus, readonly RenderJobStatus[]> =
  {
    queued: ['preparing', 'cancelled'],
    preparing: ['rendering', 'failed', 'cancelled'],
    rendering: ['completed', 'failed', 'cancelled'],
    completed: [],
    failed: ['queued'],
    cancelled: [],
  }

export function canTransition(
  from: RenderJobStatus,
  to: RenderJobStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function transitionJob(job: RenderJob, next: RenderJobStatus): void {
  if (!canTransition(job.status, next)) {
    throw new Error(`Invalid job transition: ${job.status} → ${next}`)
  }

  job.status = next
}
