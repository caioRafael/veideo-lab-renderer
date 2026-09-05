# Assets e sources

O campo `source` de cenas, áudios e overlays aceita uma **string** (id lógico ou caminho absoluto) ou um **objeto**. Em todos os casos o FFmpeg só recebe um caminho local.

```text
string "background"                 → assets.background
string "/abs/foto.jpg"              → o próprio caminho
{ type: "asset", id: "background" } → assets.background
{ type: "file", path }              → LocalFileSourceResolver
{ type: "url", url }                → download em RenderContext/downloads/
         ↓
ResolvedSource.path
         ↓
MediaResolver / RenderPlan
         ↓
FFmpeg
```

A aplicação passa o mapa em `render({ assets })`. O core não importa, cataloga nem copia mídia para `storage/`. Não existe pasta `input/` obrigatória.

## string e asset

Os dois resolvem o mesmo mapa:

```ts
await render({
  composition: {
    scenes: [{ type: 'image', source: 'background', duration: 4 }],
  },
  assets: {
    background: '/path/background.png',
  },
  output: '/path/video.mp4',
})
```

```json
{
  "type": "image",
  "source": { "type": "asset", "id": "background" },
  "duration": 4
}
```

Uma string relativa que não está em `assets` falha. Os JSONs em `compositions/` usam nomes de arquivo como id (`"flamengo.png"`). Para renderizá-los, mapeie cada id:

```ts
assets: {
  'flamengo.png': '/path/to/flamengo.png',
  'audio.mp3': '/path/to/audio.mp3',
}
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

## url

Somente `http://` e `https://`. O arquivo é baixado para `RenderContext.downloadsDir` (timeout 30s) e apagado no sucesso, no erro e no cancelamento.

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

## Fontes

Texto não usa `assets`. A fonte vem de:

1. caminho absoluto no campo `font` / `style.font` (arquivo `.ttf` / `.otf` / `.ttc`);
2. diretório passado em `render({ fonts })`;
3. fontes empacotadas no pacote npm (`assets/fonts`);
4. fontes do sistema (Arial, DejaVu, Liberation, etc.).

## Onde `source` aparece

O mesmo contrato vale em:

- `scenes[].source`
- `scenes[].audio[].source`
- `audio[].source`
- `overlays[].source`
