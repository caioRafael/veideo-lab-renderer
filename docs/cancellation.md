# Cancelamento

A API pública aceita `AbortSignal` (`pnpm add @caiorafael/patchwork`):

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
await job // rejeita com RenderCancelledError
```

## Comportamento

```text
abort
 ↓
etapa atual verifica o sinal
 ↓
FFmpeg recebe SIGTERM (depois SIGKILL)
 ↓
staging `*.tmp.mp4` é removido
 ↓
RenderContext é apagado (textos PNG e downloads de URL)
 ↓
RenderCancelledError
```

A aplicação consumidora decide quando abortar (timeout, botão, shutdown). O core não escuta SIGINT/SIGTERM.

## Limites

- A rasterização Swift é interrompida entre textos (e no `spawn` atual, também via `AbortSignal` do processo).
