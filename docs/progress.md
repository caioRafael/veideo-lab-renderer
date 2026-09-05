# Progresso

O engine expõe progresso por callback na API pública (`pnpm add @caiorafael/patchwork`).

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

A API pública emite, nesta ordem típica: `planning` → `preparing` → `rendering` → `finalizing` → `completed`. `loading` existe no tipo, mas o parse da composition acontece antes do callback.

## Regras

- `progress` fica em `[0, 1]`.
- Durante o FFmpeg, `progress` vem de `time=` no stderr dividido pela duração do vídeo. Não é inventado.
- Antes do primeiro `time=`, o progresso permanece `0` e a fase já identifica a etapa.
- Conclusão: `phase: "completed"`, `progress: 1`.
- Erro ou cancelamento emitem `failed` / `cancelled` e a Promise rejeita.
