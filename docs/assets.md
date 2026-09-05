# Assets e sources

Uso prático (copiar para `input/`, importar, renderizar): [gerar-videos.md](gerar-videos.md).

O campo `source` de cenas, áudios e overlays aceita o **nome de arquivo** de sempre **ou** um objeto com origem explícita. Em todos os casos o FFmpeg só recebe um caminho local.

```text
string "foto.jpg"     → MediaResolver → input/<tipo>/foto.jpg
{ type: "file" }      → LocalFileSourceResolver → arquivo no disco
{ type: "asset" }     → AssetSourceResolver → cópia em storage/assets/
{ type: "url" }       → UrlSourceResolver → download em RenderContext/downloads/
         ↓
ResolvedSource.path
         ↓
MediaResolver / RenderPlan
         ↓
FFmpeg
```

O `Renderer` não conhece HTTP, storage nem importação. Ele materializa as sources no `prepare` e segue o pipeline antigo.

## Formato string (compatível)

Compositions e templates existentes continuam válidos. A pasta vem do tipo:

| Tipo | Pasta |
|---|---|
| `image` / overlay | `input/images/` |
| `video` | `input/videos/` |
| áudio | `input/audios/` |

```json
{ "type": "image", "source": "foto.jpg", "duration": 5 }
```

## file

Arquivo em qualquer lugar do computador. O engine **lê no lugar**; não copia.

```json
{
  "type": "image",
  "source": {
    "type": "file",
    "path": "/Users/caio/Desktop/foto.jpg"
  },
  "duration": 5
}
```

O arquivo precisa existir e ser um arquivo (não um diretório).

## asset

Mídia importada e gerenciada pelo Video Lab. O original **não** é movido: uma cópia vai para `storage/assets/`.

```bash
pnpm asset import /Users/caio/Desktop/foto.jpg
pnpm asset list
pnpm asset get asset_0123456789abcdef0123456789abcdef
```

```text
/Users/caio/Desktop/foto.jpg
        │ copy
        ▼
storage/assets/asset_<id>/original.jpg
storage/assets/asset_<id>/meta.json
```

O id é `asset_` + UUID sem hífens. Não deriva do nome do arquivo.

```json
{
  "type": "image",
  "source": {
    "type": "asset",
    "id": "asset_0123456789abcdef0123456789abcdef"
  },
  "duration": 5
}
```

Tipos aceitos na importação: imagem (`jpg`, `jpeg`, `png`, `gif`, `webp`, `bmp`), vídeo (`mp4`, `mov`, `webm`, `mkv`) e áudio (`mp3`, `wav`, `aac`, `m4a`, `ogg`).

`storage/` não entra no git.

## url

Somente `http://` e `https://`. O arquivo é baixado para `RenderContext.downloadsDir` (timeout 30s) e apagado no sucesso, no erro e no cancelamento. A URL **não** vira Asset automaticamente.

```json
{
  "type": "image",
  "source": {
    "type": "url",
    "url": "https://example.com/foto.jpg"
  },
  "duration": 5
}
```

## Onde `source` aparece

O mesmo contrato vale em:

- `scenes[].source`
- `scenes[].audio[].source`
- `audio[].source`
- `overlays[].source`

## Template type `asset`

No Template Engine, o tipo de variável `asset` continua sendo uma **string** (nome de arquivo ou valor interpolado). Não é o objeto `{ "type": "asset", "id": "…" }`.

Um template pode interpolar um path dentro de um source objeto:

```json
{ "type": "file", "path": "{{photo}}" }
```

Documentação do template: [templates.md](templates.md).
