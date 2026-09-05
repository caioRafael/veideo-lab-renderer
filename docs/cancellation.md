# Cancellation

**English** | [Português](pt-BR/cancellation.md)

The public API accepts `AbortSignal` (`pnpm add @caiorafael/patchwork`):

```ts
import { render } from '@caiorafael/patchwork'

const controller = new AbortController()

const job = render({
  composition,
  assets,
  output,
  signal: controller.signal,
})

controller.abort()
await job // rejects with RenderCancelledError
```

## Behavior

```text
abort
 ↓
current step checks the signal
 ↓
FFmpeg receives SIGTERM (then SIGKILL)
 ↓
staging `*.tmp.mp4` is removed
 ↓
RenderContext is deleted (PNG texts and URL downloads)
 ↓
RenderCancelledError
```

The consuming app decides when to abort (timeout, button, shutdown). The core does not listen for SIGINT/SIGTERM.

## Limits

- Swift rasterization is interrupted between texts (and, in the current `spawn`, also via the process `AbortSignal`).
