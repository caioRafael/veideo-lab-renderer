# Assets and sources

**English** | [Português](pt-BR/assets.md)

The `source` field on scenes, audio clips, and overlays accepts a **string** (logical id or absolute path) or an **object**. In every case FFmpeg only receives a local path.

```text
string "background"                 → assets.background
string "/abs/photo.jpg"             → the path itself
{ type: "asset", id: "background" } → assets.background
{ type: "file", path }              → LocalFileSourceResolver
{ type: "url", url }                → download into RenderContext/downloads/
         ↓
ResolvedSource.path
         ↓
MediaResolver / RenderPlan
         ↓
FFmpeg
```

The app passes the map in `render({ assets })`. The core does not import, catalog, or copy media into `storage/`. There is no required `input/` folder.

## string and asset

Both resolve the same map:

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

A relative string that is not in `assets` fails. The JSON files in `compositions/` use file names as ids (`"flamengo.png"`). To render them, map each id:

```ts
assets: {
  'flamengo.png': '/path/to/flamengo.png',
  'audio.mp3': '/path/to/audio.mp3',
}
```

## file

A file anywhere on disk. The engine **reads it in place**; it does not copy.

```json
{
  "type": "image",
  "source": {
    "type": "file",
    "path": "/Users/caio/Desktop/photo.jpg"
  },
  "duration": 5
}
```

The file must exist and be a file (not a directory).

## url

Only `http://` and `https://`. The file is downloaded into `RenderContext.downloadsDir` (30s timeout) and deleted on success, error, and cancellation.

```json
{
  "type": "image",
  "source": {
    "type": "url",
    "url": "https://example.com/photo.jpg"
  },
  "duration": 5
}
```

## Fonts

Text does not use `assets`. The font comes from:

1. an absolute path in `font` / `style.font` (`.ttf` / `.otf` / `.ttc` file);
2. the directory passed in `render({ fonts })`;
3. fonts bundled in the npm package (`assets/fonts`);
4. system fonts (Arial, DejaVu, Liberation, and similar).

## Where `source` appears

The same contract applies to:

- `scenes[].source`
- `scenes[].audio[].source`
- `audio[].source`
- `overlays[].source`
