import type { FactoryProgress, RenderJob } from '../interfaces/factory'

export class RenderQueue {
  private readonly jobs: RenderJob[] = []
  private readonly queuedIds: string[] = []

  enqueue(job: RenderJob): void {
    this.jobs.push(job)
    if (job.status === 'queued') {
      this.queuedIds.push(job.id)
    }
  }

  requeue(job: RenderJob): void {
    if (job.status !== 'queued') {
      throw new Error(`Cannot requeue job ${job.id} with status ${job.status}`)
    }

    if (!this.queuedIds.includes(job.id)) {
      this.queuedIds.push(job.id)
    }
  }

  dequeue(): RenderJob | undefined {
    while (this.queuedIds.length > 0) {
      const id = this.queuedIds.shift()
      if (id === undefined) {
        return undefined
      }

      const job = this.get(id)
      if (job?.status === 'queued') {
        return job
      }
    }

    return undefined
  }

  get(id: string): RenderJob | undefined {
    return this.jobs.find((job) => job.id === id)
  }

  all(): RenderJob[] {
    return [...this.jobs]
  }

  queuedCount(): number {
    return this.queuedIds.length
  }

  activeCount(): number {
    return this.jobs.filter(
      (job) => job.status === 'preparing' || job.status === 'rendering',
    ).length
  }

  progress(): FactoryProgress {
    return {
      total: this.jobs.length,
      completed: this.count('completed'),
      failed: this.count('failed'),
      cancelled: this.count('cancelled'),
      active: this.activeCount(),
      queued: this.queuedCount(),
    }
  }

  private count(
    status: 'completed' | 'failed' | 'cancelled' | 'queued',
  ): number {
    return this.jobs.filter((job) => job.status === status).length
  }
}
