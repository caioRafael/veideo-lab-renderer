# Progress

**English** | [Português](pt-BR/progress.md)

The engine exposes progress through a callback on the public API (`pnpm add @caiorafael/patchwork`).

```ts
import { render } from '@caiorafael/patchwork'

await render({
  composition,
  assets,
  output,
  onProgress: (progress) => {
    console.log(progress.phase, progress.progress)
  },
})
```

```ts
interface RenderProgress {
  phase:
    | 'loading'
    | 'planning'
    | 'preparing'
    | 'rendering'
    | 'finalizing'
    | 'completed'
    | 'cancelled'
    | 'failed'
  progress: number // 0..1
  elapsedMs: number
  durationMs?: number
  fps?: number
  speed?: number
  message?: string
}
```

The public API typically emits: `planning` → `preparing` → `rendering` → `finalizing` → `completed`. `loading` exists on the type, but composition parsing happens before the callback.

## Rules

- `progress` stays in `[0, 1]`.
- During FFmpeg, `progress` comes from `time=` on stderr divided by the video duration. It is not invented.
- Before the first `time=`, progress stays `0` and the phase already identifies the step.
- Completion: `phase: "completed"`, `progress: 1`.
- Error or cancellation emit `failed` / `cancelled` and the Promise rejects.
