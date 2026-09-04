export class RenderCancelledError extends Error {
  constructor(message = 'Render was cancelled') {
    super(message)
    this.name = 'RenderCancelledError'
  }
}

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new RenderCancelledError()
  }
}
