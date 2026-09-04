# Cancelamento

O renderer aceita `AbortSignal`:

```ts
const controller = new AbortController()
await renderer.render(composition, { signal: controller.signal })
controller.abort()
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
RenderContext é apagado
 ↓
RenderCancelledError
```

A CLI (`pnpm render`, `pnpm render-template`, `pnpm factory`) liga SIGINT/SIGTERM a um `AbortController`.

## Factory

Cancelar o batch cancela jobs `queued` (sem FFmpeg) e aborta os que estão renderizando. Jobs `completed` ficam completed.

```ts
const controller = new AbortController()
await factory.renderTemplate({ template, inputs, signal: controller.signal })
```

## Limites

- A rasterização Swift é interrompida entre textos (e no `spawn` atual, também via `AbortSignal` do processo).
- Probe `ffprobe` é síncrono e curto; o sinal é conferido antes e depois.
