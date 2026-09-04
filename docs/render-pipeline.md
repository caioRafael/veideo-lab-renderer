# Render pipeline

O video-lab orquestra o FFmpeg. O Node não processa frames.

```text
Composition  ou  Template + Input → TemplateResolver
    ↓                    (factory: N inputs → N jobs → RenderManager)
loadComposition / CompositionParser
    ↓
Renderer.prepare
    ↓
RenderPlan + RenderContext
    ↓
FfmpegCommandBuilder
    ↓
FfmpegExecutor (spawn)
    ↓
    name.tmp.mp4 → rename → name.mp4
    ↓
cleanup
```

## Ciclo de vida

1. **loading** — a CLI lê e valida o JSON.
2. **planning** — `buildRenderPlan` monta tracks.
3. **preparing** — probe de duração, rasterização de texto (se não houver `drawtext`), comando FFmpeg.
4. **rendering** — `spawn` do FFmpeg. O arquivo é escrito em `name.tmp.mp4` (extensão `.mp4` para o muxer).
5. **finalizing** — rename atômico para o caminho final.
6. **completed** / **cancelled** / **failed** — cleanup do `RenderContext`.

`prepare` e `runPrepared` / `execute` continuam separados. `render()` é o atalho das duas etapas.

## RenderContext

Cada render ganha um diretório isolado:

```text
/tmp/video-lab-render-XXXXXX/
  text/
  intermediate/
```

Dois `Renderer` podem rodar ao mesmo tempo sem colidir. Um mesmo `Renderer` trata um render por vez. A Factory cria uma instância por job e limita quantas rodam juntos (`maxConcurrentRenders`).

## Temporary files

Textos rasterizados (fallback PNG) vão para `context.textDir`. Sucesso, erro e cancelamento chamam `disposeRenderContext`.

## FFmpeg

- `spawn` com argumentos em array
- stdin ignorado
- stderr limitado (~16 KB) para erros
- progresso lido de linhas `time=` / `fps=` / `speed=`
- `AbortSignal` envia SIGTERM e, se preciso, SIGKILL
- exit code ≠ 0 vira `FfmpegProcessError` com stderr

## Output

O MP4 final só aparece depois do exit 0. Um render interrompido não deve deixar `output.mp4` pela metade; o staging `.tmp` é apagado.
