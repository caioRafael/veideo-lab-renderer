# Video Factory

Uso prático (primeiro lote, pastas, checklist): [gerar-videos.md](gerar-videos.md).

Camada de orquestração **acima** do renderer. Não monta filtros FFmpeg e não resolve templates — só transforma compositions em jobs, limita concorrência e agrega o resultado.

```text
Template + Inputs
        ↓
TemplateResolver
        ↓
Composition (uma por input)
        ↓
RenderJob
        ↓
RenderManager + fila in-memory
        ↓
Renderer (um processo FFmpeg por job)
        ↓
output/videos/job-001/video.mp4
        ↓
manifest.json
```

## O que a Factory não é

Não há persistência, banco, Redis, API HTTP, fila distribuída, cloud, dashboard ou SaaS. A fila vive só na memória do processo. Se o processo morre, os jobs morrem com ele.

## RenderJob

Cada job é: “esta `Composition` deve virar este arquivo”.

| Campo | Papel |
|---|---|
| `id` | `job-001`, `job-002`, … (determinístico) |
| `composition` | clone independente, já resolvido |
| `outputPath` | `output/videos/job-001/video.mp4` |
| `status` | lifecycle |
| `attempt` | tentativas já feitas |

O template original não é mutado. Cada job recebe a sua composition.

## Lifecycle

```text
queued → preparing → rendering → completed
queued → cancelled
preparing → failed | cancelled
rendering → failed | cancelled
failed → queued          (somente retry)
```

Transições inválidas lançam erro.

## Concorrência

```ts
{ maxConcurrentRenders: 2 }
```

No máximo dois `Renderer` / FFmpeg ao mesmo tempo. O valor deve ser inteiro `> 0`.

O `Renderer` em si continua serial. A paralelização é entre instâncias.

## Batch

Um template + N inputs vira N jobs. Erro em um input (variável ausente, asset, FFmpeg) **não** aborta os outros.

```json
{
  "items": [
    { "title": "Vídeo 1", "subtitle": "Descrição 1" },
    { "title": "Vídeo 2", "subtitle": "Descrição 2" }
  ]
}
```

Também aceita um array JSON ou um único objeto de variáveis (1 job).

## Progresso

Há dois níveis:

- **job** — o `RenderProgress` que o Renderer já emite
- **factory** — totais: `queued`, `active`, `completed`, `failed`, `cancelled`

## Cancellation

`AbortSignal` do processo (SIGINT/SIGTERM) ou `manager.cancel()`:

- queued → cancelado sem FFmpeg
- rendering → abort até o FFmpeg
- completed → permanece completed

Cancelar o batch cancela queued + ativos.

## Retry

`--retries 2` significa até **3** tentativas no total.

Só `FfmpegProcessError` é retriável. Não se repete:

- template inválido
- variável ausente
- composition inválida
- asset inexistente
- cancelamento

## Output e manifest

```text
output/videos/
  job-001/video.mp4
  job-002/video.mp4
  manifest.json
```

O rename atômico do Renderer (`name.tmp.mp4` → `name.mp4`) é reutilizado. O manifest traz status, output relativo, erro e, quando houver, `videoDuration`, `renderDurationMs` e `renderFactor`.

## CLI

```bash
pnpm factory render-template \
  templates/youtube-short.json \
  --input templates/inputs/batch-youtube-short.json \
  --concurrency 2 \
  --retries 1
```

`--verbose` / `--debug` / `--quiet` seguem o restante da CLI. `--output` troca a pasta dos `job-*/video.mp4` e do `manifest.json`.

Comandos antigos continuam iguais:

```bash
pnpm render compositions/example.json
pnpm render-template templates/quote.json --input templates/inputs/quote.json
```

## API

```ts
const factory = new VideoFactory({
  maxConcurrentRenders: 2,
  maxRetries: 1,
  mediaPaths,
})

const manifest = await factory.renderTemplate({
  template,
  inputs,
})
```

## Text bounding box

O fallback PNG (quando não há `drawtext`) deixa de gerar um canvas 1920×1080 por texto. O PNG cobre só a tinta (texto + padding + stroke + shadow) e o overlay é reposicionado para o mesmo ponto visual.

A Factory não conhece pixels. O cálculo fica em `src/text/textBounds.ts` e na rasterização.
