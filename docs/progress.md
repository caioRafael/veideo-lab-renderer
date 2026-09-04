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

## Factory

O lote agrega outro nível, sem substituir o callback do Renderer:

```ts
interface FactoryProgress {
  total: number
  completed: number
  failed: number
  cancelled: number
  active: number
  queued: number
}
```

`--verbose` na Factory mostra totais do batch e o progresso dos jobs ativos. Não misture a porcentagem de um vídeo com `37/100` do lote.
