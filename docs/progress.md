# Progresso

O engine expõe progresso por callback. A CLI só decide como imprimir.

```ts
interface RenderProgress {
  phase: 'loading' | 'planning' | 'preparing' | 'rendering' | 'finalizing' | 'completed' | 'cancelled' | 'failed'
  progress: number // 0..1
  elapsedMs: number
  durationMs?: number
  fps?: number
  speed?: number
  message?: string
}

await renderer.render(composition, {
  onProgress: (progress) => { /* CLI, API, worker */ },
})
```

## Regras

- `progress` fica em `[0, 1]`.
- Durante o FFmpeg, `progress` vem de `time=` no stderr dividido pela duração do vídeo. Não é inventado.
- Antes do primeiro `time=`, o progresso permanece `0` e a fase já identifica a etapa.
- Conclusão: `phase: "completed"`, `progress: 1`.
- Erro ou cancelamento emitem `failed` / `cancelled`.
