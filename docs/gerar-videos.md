# Como gerar vídeos

Guia prático. Em poucos minutos você instala, coloca as mídias e sai com um MP4.

Há **três jeitos** de gerar (e um comando à parte para importar mídia):

| Quando usar | Comando | Entrada |
|---|---|---|
| Um vídeo descrito à mão | `pnpm render` | `compositions/*.json` |
| Um vídeo a partir de um modelo | `pnpm render-template` | template + arquivo de variáveis |
| Vários vídeos do mesmo modelo | `pnpm factory` | template + batch de variáveis |
| Guardar um arquivo no Video Lab | `pnpm asset import` | caminho absoluto no computador |

O FFmpeg faz o encode. O Node só valida o JSON e monta o comando.

---

## 1. Uma vez: ambiente

```bash
# Node.js + pnpm
pnpm install

# FFmpeg no PATH
ffmpeg -version
```

No macOS, se ainda não tiver FFmpeg:

```bash
brew install ffmpeg
```

O formula padrão do Homebrew pode não ter `drawtext`. Não precisa instalar outro FFmpeg: o engine desenha o texto em PNG e aplica como overlay.

---

## 2. Coloque as mídias

O jeito mais simples continua sendo o **nome do arquivo** no JSON. A pasta é escolhida pelo tipo:

| Tipo no JSON | Pasta |
|---|---|
| cena `"type": "image"` | `input/images/` |
| cena `"type": "video"` | `input/videos/` |
| áudio / overlay de imagem | `input/audios/` / `input/images/` |
| fonte (opcional) | `input/fonts/` |
| MP4 gerado | `output/videos/` |

O repositório já tem exemplos (`flamengo.png`, `input.png`, `audio.mp3`, `gloria-eterna.mp4`). Para um vídeo seu, copie os arquivos para essas pastas e use o mesmo nome no JSON.

```text
input/images/minha-foto.jpg
input/audios/trilha.mp3
input/videos/clipe.mp4
```

Se o arquivo **não** estiver em `input/`, o `source` pode ser um objeto:

| Origem | JSON | Observação |
|---|---|---|
| Disco (qualquer pasta) | `{ "type": "file", "path": "/Users/caio/Desktop/foto.jpg" }` | usa o arquivo no lugar |
| Asset importado | `{ "type": "asset", "id": "asset_…" }` | copie antes com `pnpm asset import` |
| URL | `{ "type": "url", "url": "https://example.com/foto.jpg" }` | só HTTP/HTTPS; baixa no render |

```bash
pnpm asset import /Users/caio/Desktop/foto.jpg
pnpm asset list
```

Detalhes: [assets.md](assets.md).

---

## 3. O caminho mais rápido (composição pronta)

```bash
pnpm render compositions/example.json
```

Saída: `output/videos/output.mp4`.

Com mais informação:

```bash
pnpm render compositions/example.json --verbose
pnpm render compositions/example.json --debug
```

- normal: composição + caminho do MP4
- `--verbose` (`-v`): planejamento, barra de progresso, render factor
- `--debug`: inclui o comando FFmpeg
- `--quiet`: só erros

`Ctrl+C` cancela o FFmpeg e apaga o arquivo pela metade.

Outros exemplos prontos:

```bash
pnpm render compositions/text-basic.json
pnpm render compositions/fade.json
pnpm render compositions/ken-burns.json
pnpm render compositions/effects-combined.json
pnpm render compositions/joao-e-maria.json
```

O campo `output` do JSON é só o nome do arquivo. `text-basic.json` grava `output/videos/text-basic.mp4`.

---

## 4. Seu primeiro JSON

Crie `compositions/meu-video.json`:

```json
{
  "output": "meu-video.mp4",
  "width": 1920,
  "height": 1080,
  "fps": 25,
  "scenes": [
    { "type": "image", "source": "flamengo.png", "duration": 5 }
  ],
  "texts": [
    {
      "content": "Meu primeiro vídeo",
      "start": 0,
      "duration": 5,
      "x": "center",
      "y": 200,
      "fontSize": 64,
      "color": "#FFFFFF",
      "bold": true
    }
  ],
  "audio": [
    {
      "source": "audio.mp3",
      "role": "background",
      "start": 0,
      "duration": 5
    }
  ]
}
```

```bash
pnpm render compositions/meu-video.json
```

Abra `output/videos/meu-video.mp4`.

### Campos que mais importam

**Vídeo**

| Campo | Default | Notas |
|---|---|---|
| `output` | `output.mp4` | nome em `output/videos/` |
| `width` / `height` | `1920` / `1080` | inteiros pares |
| `fps` | `25` | |

**Cena**

| Campo | Obrigatório | Notas |
|---|---|---|
| `type` | sim | `image` ou `video` |
| `source` | sim | nome em `input/` **ou** objeto `file` / `asset` / `url` |
| `duration` | sim | segundos na timeline |
| `transition` | não | `fade` ou `crossfade` **a partir da cena anterior** |
| `transform` | não | `scale`, `position`, `crop`, `zoom`, `pan` |
| `effects` | não | opacity, brightness, contrast, saturation, grayscale, sepia, blur |
| `mediaStart` | não | só `video`: offset no arquivo |
| `shortMedia` | não | só `video`: `error` (default), `loop`, `freeze` |
| `keepAudio` | não | só `video`: mantém o áudio do arquivo |

**Texto** (o essencial)

```json
{
  "content": "Título\nsegunda linha",
  "start": 0,
  "duration": 5,
  "x": "center",
  "y": 140,
  "fontSize": 72,
  "color": "#FFFFFF"
}
```

`x` e `y` aceitam número (pixels) ou `"center"`. Para wrap automático, use `"box": { "width": 900 }`.

**Áudio**

```json
{ "source": "audio.mp3", "role": "background", "start": 0, "duration": 8 }
```

`role` é `background` ou `focus`.

**Overlay** (imagem por cima)

```json
{
  "source": "input.png",
  "start": 1,
  "duration": 4,
  "x": 80,
  "y": 80,
  "width": 220,
  "height": 220
}
```

Receita de duas cenas com transição:

```json
{
  "output": "duas-cenas.mp4",
  "scenes": [
    { "type": "image", "source": "flamengo.png", "duration": 4 },
    {
      "type": "image",
      "source": "input.png",
      "duration": 4,
      "transition": { "type": "crossfade", "duration": 0.8 }
    }
  ]
}
```

Schema completo: [README](../README.md#composição-json). Sources: [assets.md](assets.md). Como o JSON vira FFmpeg: [flow-create-video.md](../flow-create-video.md).

---

## 5. Template: trocar só o texto e a imagem

Quando o layout se repete e só mudam título, autor e fundo, use um template.

```bash
pnpm render-template templates/quote.json --input templates/inputs/quote.json
```

Saída: `output/videos/template-quote.mp4`.

### Arquivo de variáveis

`templates/inputs/quote.json`:

```json
{
  "background": "flamengo.png",
  "title": "A bola não entra por acaso",
  "author": "Uma história real"
}
```

`background` é o nome do arquivo em `input/images/`. `title` e `author` entram no texto.

Para um quote seu:

1. Copie a foto para `input/images/minha-foto.jpg`.
2. Crie `templates/inputs/meu-quote.json`:

```json
{
  "background": "minha-foto.jpg",
  "title": "Frase do vídeo",
  "author": "Seu nome",
  "output": "meu-quote.mp4"
}
```

3. Renderize:

```bash
pnpm render-template templates/quote.json --input templates/inputs/meu-quote.json
```

Variáveis só de texto também podem ir na linha de comando (`--var` é sempre string):

```bash
pnpm render-template templates/quote.json \
  --input templates/inputs/quote.json \
  --var title="Outra frase"
```

Números e booleanos (`fontSize`, `bold`) vão no JSON de input, sem aspas no valor:

```json
{ "title": "Olá", "author": "Eu", "background": "flamengo.png", "fontSize": 72 }
```

### Templates prontos

| Template | O que pede | Formato |
|---|---|---|
| `templates/quote.json` | `background`, `title`, `author` | 16:9 |
| `templates/youtube-short.json` | `background`, `overlay`, `title`, `subtitle` | 9:16 |
| `templates/slideshow.json` | `slide1`, `slide2`, `slide3`, `title` | 16:9 |
| `templates/full.json` | vídeo, foto, overlay, áudio, textos | 16:9 |
| `templates/presets/square-1x1.json` | `background`, `title` | 1:1 |

Variáveis do template: [docs/templates.md](templates.md).

---

## 6. Vários vídeos de uma vez (Factory)

Mesmo template, vários conjuntos de dados:

```bash
pnpm factory render-template \
  templates/youtube-short.json \
  --input templates/inputs/batch-youtube-short.json \
  --concurrency 2
```

O batch (`templates/inputs/batch-youtube-short.json`):

```json
{
  "items": [
    {
      "background": "flamengo.png",
      "overlay": "input.png",
      "title": "Vídeo 1",
      "subtitle": "Descrição 1"
    },
    {
      "background": "input.png",
      "overlay": "flamengo.png",
      "title": "Vídeo 2",
      "subtitle": "Descrição 2"
    }
  ]
}
```

Cada item vira um job. A saída **não** usa o `output` do item; a Factory grava:

```text
output/videos/
  job-001/video.mp4
  job-002/video.mp4
  manifest.json
```

`--concurrency 2` = no máximo dois FFmpeg ao mesmo tempo. `--retries 1` tenta de novo só se o FFmpeg falhar (não se faltar variável ou arquivo). `--output pasta/` troca o destino dos jobs e do manifest.

Um item quebrado (variável faltando, asset inexistente) **não** cancela os outros. O `manifest.json` lista `completed` / `failed` / `cancelled`.

```bash
pnpm factory render-template \
  templates/quote.json \
  --input templates/inputs/meu-lote.json \
  --concurrency 2 \
  --output output/videos/lote-quotes
```

Detalhes: [docs/factory.md](factory.md).

---

## 7. Checklist quando algo falha

| Sintoma | O que fazer |
|---|---|
| `Composition file not found` | caminho relativo à raiz do repo |
| `Asset not found` | string: arquivo na pasta `input/` certa, **só o nome** |
| `File source not found` | `{ "type": "file" }`: o `path` não existe |
| `Asset "asset_…" was not found` | rode `pnpm asset list` e use um id importado |
| `Invalid URL source` | só `http://` e `https://` |
| `Template variable "title" is required` | falta no `--input` / `--var` |
| `expected number, received string` | no JSON use `72`, não `"72"` |
| `FFmpeg failed` | `pnpm render … --debug` e leia o stderr |
| Vídeo sem texto | o fallback PNG está ativo; o render deve terminar mesmo assim |
| Quero parar | `Ctrl+C` — o `.tmp.mp4` é apagado |

---

## 8. Atalho mental

```text
1 vídeo, JSON único ..............  pnpm render compositions/x.json
1 vídeo, layout reutilizável ......  pnpm render-template t.json --input d.json
N vídeos, mesmo layout ............  pnpm factory render-template t.json --input lote.json --concurrency 2
Arquivo fora do projeto ..........  source { type: file }  ou  pnpm asset import
```

Depois: abra `output/videos/`.
