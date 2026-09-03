# Guia: JSON → comando FFmpeg

Como montar um vídeo a partir de um JSON de composição.

## Ideia geral

O JSON descreve a timeline. O FFmpeg recebe um comando com esta anatomia:

```text
ffmpeg -y
  [inputs de cenas e áudios]
  -filter_complex "..."
  -map "[vout]" -map "[aout]"
  -c:v libx264 -c:a aac -t TOTAL
  output.mp4
```

| Parte do comando | Vem do JSON |
|---|---|
| Inputs de imagem/vídeo | `scenes[]` |
| Inputs de áudio | `audio[]` + `scenes[].audio` |
| `concat` de vídeo | ordem e `duration` das cenas |
| `atrim` / `adelay` / `volume` / `amix` | áudios globais e por cena |
| `-t`, resolução, fps | soma das durations + `width`/`height`/`fps` |

---

## Schema do JSON

Arquivo exemplo: `src/compositions/example.json`

```json
{
  "output": "output.mp4",
  "width": 1920,
  "height": 1080,
  "fps": 25,
  "scenes": [
    { "type": "image", "source": "flamengo.png", "duration": 4 },
    { "type": "image", "source": "input.png", "duration": 4 },
    { "type": "image", "source": "flamengo.png", "duration": 6 }
  ],
  "audio": [
    { "source": "audio2.mp3", "role": "background", "start": 0, "duration": 8 },
    { "source": "audio.mp3", "role": "focus", "start": 8, "duration": 6 }
  ]
}
```

### Campos

- `scenes`: lista visual em sequência
  - `type`: `image` ou `video`
  - `source`: arquivo em `src/assets/`
  - `duration`: segundos
  - `audio?`: áudios da cena (`start` relativo ao início da cena)
- `audio`: áudios globais (`start` absoluto na timeline)
- `role`:
  - `background` → volume padrão `0.3`
  - `focus` → volume padrão `1.0`
- `volume` opcional sobrescreve o padrão do `role`

### Timeline deste exemplo

```text
0s ──────── 4s ──────── 8s ────────────── 14s
│ flamengo  │  input   │    flamengo     │
│         audio2 (bg)  │   audio (focus) │
└───────────┴──────────┴─────────────────┘
```

---

## Como cada campo vira comando

### 1. Inputs de cena

JSON:

```json
{ "type": "image", "source": "flamengo.png", "duration": 4 }
```

FFmpeg:

```bash
-loop 1 -t 4 -i src/assets/flamengo.png
```

Para `type: "video"`:

```bash
-t 6 -i src/assets/clip.mp4
```

### 2. Preparar e concatenar vídeo

Cada cena é padronizada:

```text
[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,
     pad=1920:1080:(ow-iw)/2:(oh-ih)/2,
     setsar=1,fps=25,format=yuv420p[v0]
```

Depois:

```text
[v0][v1][v2]concat=n=3:v=1:a=0[vout]
```

### 3. Inputs e filtros de áudio

JSON global:

```json
{ "source": "audio2.mp3", "role": "background", "start": 0, "duration": 8 }
```

Vira input:

```bash
-i src/assets/audio2.mp3
```

E filtro:

```text
[3:a]atrim=0:8,asetpts=PTS-STARTPTS,volume=0.3,adelay=0|0,apad=whole_dur=14,...[a0]
```

JSON com `start: 8`:

```text
[4:a]atrim=0:6,...,volume=1,adelay=8000|8000,apad=whole_dur=14,...[a1]
```

- `atrim` — corta o pedaço usado
- `volume` — background mais baixo, focus mais alto
- `adelay` — posiciona o áudio na timeline (ms)
- `apad` — completa até a duração total (silêncio no resto)

Áudio de cena:

```json
{
  "type": "image",
  "source": "input.png",
  "duration": 4,
  "audio": [{ "source": "sfx.mp3", "role": "focus", "start": 1 }]
}
```

Se a cena começa em `t=4`, esse áudio começa em `4 + 1 = 5s` absolutos.

### 4. Misturar áudios

```text
[a0][a1]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]
```

Assim background e focus podem tocar juntos; o foco sobressai pelo volume.

### 5. Exportar

```bash
-map "[vout]" -map "[aout]" \
-c:v libx264 -c:a aac \
-t 14 -pix_fmt yuv420p \
src/assets/output.mp4
```

---

## Diagrama

```text
scenes[0] image ─ t=4 ─► prepare ─► [v0] ─┐
scenes[1] image ─ t=4 ─► prepare ─► [v1] ─┼─ concat ─► [vout] ─┐
scenes[2] image ─ t=6 ─► prepare ─► [v2] ─┘                   │
                                                              ├─► output.mp4
audio[0]  atrim/volume/adelay ─► [a0] ─┐                      │
                                       ├─ amix ─► [aout] ─────┘
audio[1]  atrim/volume/adelay ─► [a1] ─┘
```

---

## Como rodar

```bash
pnpm dev
# ou
pnpm dev -- src/compositions/example.json
```

O programa imprime o comando FFmpeg montado antes de executar — útil para estudar o que o JSON gerou.
