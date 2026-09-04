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

A CLI liga SIGINT/SIGTERM a um `AbortController`.

## Limites

- A rasterização Swift (`spawnSync`) não pode ser interrompida no meio de um PNG. O sinal é conferido **entre** textos.
- Probe `ffprobe` é síncrono e curto; o sinal é conferido antes e depois.
