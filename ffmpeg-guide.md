# FFmpeg — Guia de Comandos e Flags para um Video Engine

> Referência prática para construir um renderer de vídeo em Node.js/TypeScript usando o executável `ffmpeg` diretamente.

---

# 1. Estrutura básica

A estrutura geral de um comando FFmpeg é:

```bash
ffmpeg [opções globais] [opções de entrada] -i INPUT [opções de saída] OUTPUT
```

Exemplo:

```bash
ffmpeg -i input.mp4 output.mp4
```

Com múltiplas entradas:

```bash
ffmpeg -i video.mp4 -i audio.mp3 output.mp4
```

Com múltiplas entradas e filtros:

```bash
ffmpeg \
  -i video.mp4 \
  -i audio.mp3 \
  -filter_complex "..." \
  output.mp4
```

---

# 2. Conceito fundamental: streams

Um arquivo multimídia pode conter várias streams:

```text
MP4
├── Video
├── Audio
├── Subtitle
└── Data
```

O FFmpeg identifica streams usando:

```text
:v = video
:a = audio
:s = subtitle
:d = data
```

Exemplos:

```bash
-c:v libx264
-c:a aac
-b:v 5M
-b:a 192k
```

---

# 3. Inputs

## `-i`

Define uma entrada.

```bash
ffmpeg -i input.mp4 output.mp4
```

Múltiplas entradas:

```bash
ffmpeg \
  -i video.mp4 \
  -i audio.mp3 \
  output.mp4
```

Os inputs recebem índices:

```text
0 = primeiro input
1 = segundo input
2 = terceiro input
...
```

Exemplo:

```bash
ffmpeg \
  -i video.mp4 \
  -i music.mp3 \
  -i narration.mp3 \
  ...
```

```text
0:v → vídeo
1:a → música
2:a → narração
```

---

# 4. `-map`

Define explicitamente quais streams irão para a saída.

```bash
-map 0:v
```

Primeiro vídeo.

```bash
-map 0:a
```

Primeiro áudio.

```bash
-map 0:v:0
```

Primeiro vídeo do primeiro input.

```bash
-map 1:a:0
```

Primeiro áudio do segundo input.

Exemplo:

```bash
ffmpeg \
  -i video.mp4 \
  -i narration.mp3 \
  -map 0:v \
  -map 1:a \
  output.mp4
```

Isso significa:

```text
video.mp4
   │
   └── video ─────────┐
                      │
narration.mp3         ├──► output.mp4
   │                  │
   └── audio ─────────┘
```

Para um Video Engine, `-map` é extremamente importante.

---

# 5. Codecs

## `-c`

Define o codec.

```bash
-c:v libx264
```

Codec de vídeo.

```bash
-c:a aac
```

Codec de áudio.

```bash
-c:v copy
```

Copia o vídeo sem reencodar.

```bash
-c:a copy
```

Copia o áudio sem reencodar.

Exemplo:

```bash
ffmpeg \
  -i input.mp4 \
  -c:v libx264 \
  -c:a aac \
  output.mp4
```

---

# 6. Codecs comuns

## Vídeo

### H.264

```bash
-c:v libx264
```

Excelente escolha para vídeos compatíveis com YouTube e players comuns.

### H.265 / HEVC

```bash
-c:v libx265
```

Maior eficiência de compressão, mas maior custo de processamento e compatibilidade menos universal.

### AV1

Dependendo da build instalada:

```bash
-c:v libaom-av1
```

ou outros encoders AV1 disponíveis.

Confira:

```bash
ffmpeg -encoders
```

---

# 7. Preset

Usado principalmente pelo H.264/H.265.

```bash
-preset medium
```

Exemplos:

```bash
-preset ultrafast
-preset superfast
-preset veryfast
-preset faster
-preset fast
-preset medium
-preset slow
-preset slower
-preset veryslow
```

Regra geral:

```text
mais rápido
     ↓
ultrafast
superfast
veryfast
faster
fast
medium
slow
slower
veryslow
     ↓
mais lento
```

Quanto mais lento o preset, normalmente maior a eficiência de compressão para uma determinada qualidade, ao custo de tempo de encoding.

---

# 8. CRF

Controle de qualidade para encoders como libx264.

```bash
-crf 23
```

Exemplo:

```bash
ffmpeg \
  -i input.mp4 \
  -c:v libx264 \
  -crf 20 \
  -preset medium \
  output.mp4
```

Regra geral:

```text
CRF menor = maior qualidade = arquivo maior

CRF maior = menor qualidade = arquivo menor
```

Valores comuns para H.264:

```text
18 → alta qualidade
20 → alta qualidade
23 → padrão comum
26 → menor tamanho
28 → qualidade mais baixa
```

---

# 9. Bitrate

## Vídeo

```bash
-b:v 5M
```

Exemplo:

```bash
-b:v 8M
```

## Áudio

```bash
-b:a 192k
```

Exemplo:

```bash
-b:a 128k
```

---

# 10. Resolução

## `-s`

Define resolução.

```bash
-s 1920x1080
```

Exemplos:

```bash
-s 1280x720
-s 1920x1080
-s 3840x2160
```

Porém, para um Video Engine, prefira frequentemente o filtro `scale`:

```bash
-vf "scale=1920:1080"
```

---

# 11. FPS

## `-r`

Define framerate.

```bash
-r 30
```

Exemplos:

```bash
-r 24
-r 25
-r 30
-r 60
```

---

# 12. Pixel format

## `-pix_fmt`

Define formato de pixel.

Muito comum para MP4:

```bash
-pix_fmt yuv420p
```

Exemplo:

```bash
ffmpeg \
  -i input.mp4 \
  -pix_fmt yuv420p \
  output.mp4
```

Para vídeos destinados a ampla compatibilidade, `yuv420p` é uma escolha comum.

---

# 13. Formato/container

## `-f`

Força o formato.

```bash
-f mp4
```

Exemplo:

```bash
ffmpeg \
  -i input.mov \
  -f mp4 \
  output.mp4
```

Normalmente o FFmpeg consegue inferir o container pela extensão.

---

# 14. Sobrescrever arquivos

## `-y`

Sobrescreve automaticamente.

```bash
-y
```

Muito útil no renderer:

```bash
ffmpeg -y -i input.mp4 output.mp4
```

---

# 15. Não sobrescrever

## `-n`

Não sobrescreve arquivos existentes.

```bash
-n
```

---

# 16. Duração

## `-t`

Limita duração.

```bash
-t 10
```

10 segundos.

```bash
-t 00:01:30
```

1 minuto e 30 segundos.

Exemplo:

```bash
ffmpeg -i input.mp4 -t 10 output.mp4
```

---

# 17. Início do vídeo

## `-ss`

Define posição inicial.

```bash
-ss 10
```

Começa em 10 segundos.

Exemplo:

```bash
ffmpeg \
  -ss 10 \
  -i input.mp4 \
  output.mp4
```

---

# 18. Combinar `-ss` + `-t`

Para cortar um trecho:

```bash
ffmpeg \
  -ss 00:01:10 \
  -i input.mp4 \
  -t 10 \
  output.mp4
```

Resultado:

```text
Input
──────────────────────────────────────
           ↑
          1:10
           │
           └────── 10 segundos ──────┘
```

---

# 19. Remover vídeo

## `-vn`

Não gera vídeo.

```bash
ffmpeg \
  -i input.mp4 \
  -vn \
  output.mp3
```

---

# 20. Remover áudio

## `-an`

Não gera áudio.

```bash
ffmpeg \
  -i input.mp4 \
  -an \
  output.mp4
```

Muito útil para separar processamento de vídeo e áudio.

---

# 21. Extrair áudio

```bash
ffmpeg \
  -i video.mp4 \
  -vn \
  -c:a mp3 \
  audio.mp3
```

---

# 22. Extrair imagem/frame

```bash
ffmpeg \
  -i video.mp4 \
  -ss 00:00:05 \
  -frames:v 1 \
  frame.png
```

---

# 23. Número de frames

## `-frames:v`

```bash
-frames:v 1
```

Gera um frame.

```bash
-frames:v 100
```

Gera 100 frames.

---

# 24. Filtros

Os filtros são uma das partes mais importantes do FFmpeg para seu renderer.

## `-vf`

Video Filter.

```bash
-vf "scale=1920:1080"
```

É um alias de:

```bash
-filter:v
```

---

# 25. Escalar vídeo

```bash
-vf "scale=1920:1080"
```

Manter proporção:

```bash
-vf "scale=1920:-1"
```

Ou:

```bash
-vf "scale=-1:1080"
```

---

# 26. Crop

```bash
-vf "crop=1920:1080"
```

Formato:

```text
crop=width:height:x:y
```

Exemplo:

```bash
-vf "crop=1920:1080:0:0"
```

---

# 27. Rotacionar

```bash
-vf "transpose=1"
```

Outros valores dependem da direção desejada.

---

# 28. FPS com filtro

```bash
-vf "fps=30"
```

---

# 29. Blur

```bash
-vf "boxblur=10"
```

---

# 30. Saturação

```bash
-vf "eq=saturation=1.5"
```

---

# 31. Brilho/contraste

```bash
-vf "eq=brightness=0.1:contrast=1.2"
```

---

# 32. Texto

Um dos filtros mais importantes para sua ferramenta:

```bash
-vf "drawtext=text='Hello World':fontsize=60:x=100:y=100"
```

Exemplo:

```bash
ffmpeg \
  -i input.mp4 \
  -vf "drawtext=text='Meu vídeo':fontsize=60:x=100:y=100" \
  output.mp4
```

---

# 33. Texto com arquivo de fonte

```bash
-vf "drawtext=fontfile=/path/font.ttf:text='Hello':fontsize=60:x=100:y=100"
```

---

# 34. Fade de vídeo

O filtro `fade` altera a opacidade de **um** stream em direção a uma cor (preto, por padrão). Não mistura duas cenas.

Fade in:

```bash
-vf "fade=t=in:st=0:d=1"
```

Fade out:

```bash
-vf "fade=t=out:st=9:d=1"
```

Onde:

```text
t  = tipo (`in` ou `out`)
st = início
d  = duração
c  = cor (opcional; `black` no video-lab)
```

No video-lab, `transition.type = "fade"` **não** usa `xfade`. É fade-out da cena anterior + fade-in da seguinte + `concat`:

```text
A ─────────╲
            BLACK
                  ╱──────── B
```

```bash
[v0]fade=t=out:st=4:d=1:c=black[fo1];
[v1]fade=t=in:st=0:d=1:c=black[fi1];
[fo1][fi1]concat=n=2:v=1:a=0[vout]
```

Para misturar pixels das duas cenas, use `xfade` (seção 89).

---

# 35. Fade de áudio

## `-af`

Audio Filter.

```bash
-af "afade=t=in:st=0:d=2"
```

Fade out:

```bash
-af "afade=t=out:st=8:d=2"
```

---

# 36. Zoom

O FFmpeg não possui simplesmente um comando universal chamado "zoom". Normalmente você cria o efeito através de filtros como `zoompan`, `scale`, `crop` e expressões.

Exemplo conceitual:

```bash
-vf "zoompan=z='min(zoom+0.0015,1.5)':d=150"
```

Isso é especialmente útil para:

```text
imagem
   ↓
zoom lento
   ↓
vídeo
```

---

# 37. Imagem como vídeo

Uma imagem pode ser transformada em uma sequência de frames.

```bash
ffmpeg \
  -loop 1 \
  -i image.jpg \
  -t 5 \
  output.mp4
```

Isso cria aproximadamente:

```text
image.jpg
   ↓
frame
frame
frame
frame
...
   ↓
5 segundos
   ↓
video.mp4
```

---

# 38. Imagens em sequência

```bash
ffmpeg \
  -framerate 30 \
  -i image-%03d.png \
  output.mp4
```

Com:

```text
image-001.png
image-002.png
image-003.png
...
```

---

# 39. Concatenar vídeos

Método baseado no demuxer `concat`:

```text
videos.txt
```

```text
file '01.mp4'
file '02.mp4'
file '03.mp4'
```

Comando:

```bash
ffmpeg \
  -f concat \
  -safe 0 \
  -i videos.txt \
  -c copy \
  output.mp4
```

Quando os arquivos não são compatíveis para stream copy, pode ser necessário reencodar.

---

# 40. `-filter_complex`

Uma das opções mais importantes para um Video Engine.

Use quando você precisa de:

- múltiplas entradas;
- múltiplas saídas;
- overlays;
- composição;
- concatenação via filtros;
- mixagem;
- pipelines complexos.

Exemplo:

```bash
ffmpeg \
  -i video.mp4 \
  -i logo.png \
  -filter_complex "[0:v][1:v]overlay=10:10" \
  output.mp4
```

---

# 41. Labels no `filter_complex`

Exemplo:

```bash
-filter_complex "[0:v]scale=1920:1080[video]"
```

Aqui:

```text
0:v
 │
 ▼
scale
 │
 ▼
[video]
```

Você pode utilizar `[video]` posteriormente.

---

# 42. Overlay

Colocar uma imagem sobre um vídeo:

```bash
ffmpeg \
  -i video.mp4 \
  -i logo.png \
  -filter_complex "[0:v][1:v]overlay=10:10" \
  output.mp4
```

Estrutura:

```text
video ───────┐
             ├──► overlay ──► output
logo ────────┘
```

---

# 43. Overlay centralizado

```bash
-filter_complex "[0:v][1:v]overlay=(W-w)/2:(H-h)/2"
```

Onde:

```text
W = largura do vídeo principal
H = altura do vídeo principal
w = largura do overlay
h = altura do overlay
```

---

# 44. Picture-in-picture

```bash
-filter_complex "[0:v][1:v]overlay=W-w-20:H-h-20"
```

Coloca o segundo vídeo no canto inferior direito.

---

# 45. Mixar áudio

## `amix`

```bash
-filter_complex "[0:a][1:a]amix=inputs=2"
```

Exemplo:

```bash
ffmpeg \
  -i narration.mp3 \
  -i music.mp3 \
  -filter_complex "[0:a][1:a]amix=inputs=2" \
  output.mp3
```

---

# 46. Volume

```bash
-af "volume=0.5"
```

Metade do volume.

```bash
-af "volume=2"
```

Dobro.

---

# 47. Delay de áudio

```bash
-af "adelay=1000|1000"
```

Adiciona aproximadamente 1 segundo de delay aos canais.

---

# 48. Normalização de áudio

Um filtro bastante útil:

```bash
-af "loudnorm"
```

---

# 49. Concatenação através de filtro

Para composição mais complexa:

```bash
-filter_complex \
"[0:v][1:v][2:v]concat=n=3:v=1:a=0[outv]"
```

Depois:

```bash
-map "[outv]"
```

---

# 50. Múltiplas entradas + concat

Conceitualmente:

```text
Input 0 ──┐
Input 1 ──┼──► filter_complex ──► output
Input 2 ──┘
```

Exemplo:

```bash
ffmpeg \
  -i 01.mp4 \
  -i 02.mp4 \
  -i 03.mp4 \
  -filter_complex \
  "[0:v][1:v][2:v]concat=n=3:v=1:a=0[outv]" \
  -map "[outv]" \
  output.mp4
```

---

# 51. Mapear saída do filtro

Se o filtro produz:

```text
[outv]
```

Use:

```bash
-map "[outv]"
```

Para áudio:

```bash
-map "[outa]"
```

---

# 52. Metadata / informações do arquivo

```bash
ffmpeg -i video.mp4
```

Para informações mais apropriadas a automação, utilize também:

```bash
ffprobe video.mp4
```

Exemplo:

```bash
ffprobe -v quiet -print_format json -show_format -show_streams video.mp4
```

Isso é extremamente útil no seu projeto.

Seu Node poderá executar:

```text
ffprobe
   ↓
JSON
   ↓
VideoMetadata
```

E descobrir:

```json
{
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "duration": 120,
  "codec": "h264"
}
```

---

# 53. Verificar codecs disponíveis

```bash
ffmpeg -codecs
```

Somente encoders:

```bash
ffmpeg -encoders
```

Somente decoders:

```bash
ffmpeg -decoders
```

---

# 54. Verificar filtros

```bash
ffmpeg -filters
```

Informação específica:

```bash
ffmpeg -h filter=scale
```

Ou:

```bash
ffmpeg -h filter=drawtext
```

Ou:

```bash
ffmpeg -h filter=xfade
```

---

# 55. Verificar formatos

```bash
ffmpeg -formats
```

---

# 56. Verificar pixel formats

```bash
ffmpeg -pix_fmts
```

---

# 57. Verificar protocolos

```bash
ffmpeg -protocols
```

---

# 58. Ver ajuda

Ajuda básica:

```bash
ffmpeg -h
```

Ajuda completa:

```bash
ffmpeg -h full
```

Ajuda sobre encoder:

```bash
ffmpeg -h encoder=libx264
```

Ajuda sobre filtro:

```bash
ffmpeg -h filter=scale
```

A documentação oficial também permite consultar listas de codecs, encoders, decoders, formatos, filtros e outras capacidades diretamente pelo executável.

---

# 59. Logs

## `-loglevel`

```bash
-loglevel error
```

Opções comuns:

```text
quiet
panic
fatal
error
warning
info
verbose
debug
trace
```

Para seu renderer:

```bash
-loglevel error
```

pode ser interessante em produção.

---

# 60. Estatísticas

```bash
-stats
```

Desabilitar:

```bash
-nostats
```

---

# 61. Progresso para automação

Uma opção especialmente interessante para Node:

```bash
-progress pipe:1
```

Exemplo:

```bash
ffmpeg \
  -i input.mp4 \
  -progress pipe:1 \
  output.mp4
```

Isso permite que seu Node acompanhe o progresso do FFmpeg.

---

# 62. Threads

```bash
-threads 4
```

Ou:

```bash
-threads 0
```

Dependendo do codec, `0` pode permitir que o encoder escolha automaticamente.

---

# 63. Stream copy

Se não precisa reencodar:

```bash
-c copy
```

Exemplo:

```bash
ffmpeg \
  -i input.mp4 \
  -c copy \
  output.mkv
```

Isso pode ser muito mais rápido porque evita decodificação/re-encoding.

---

# 64. Copiar somente vídeo

```bash
-c:v copy
```

---

# 65. Copiar somente áudio

```bash
-c:a copy
```

---

# 66. Remux

Alterar container sem reencodar:

```bash
ffmpeg \
  -i input.mkv \
  -c copy \
  output.mp4
```

---

# 67. Aspect ratio

```bash
-aspect 16:9
```

Entretanto, em um renderer moderno, normalmente é melhor trabalhar com resolução e filtros apropriados em vez de simplesmente forçar metadata de aspect ratio.

---

# 68. Metadata

Definir metadata:

```bash
-metadata title="Meu vídeo"
```

Exemplo:

```bash
ffmpeg \
  -i input.mp4 \
  -metadata title="Meu vídeo" \
  output.mp4
```

---

# 69. Fast start para MP4

Muito útil para arquivos destinados à reprodução progressiva/web:

```bash
-movflags +faststart
```

Exemplo:

```bash
ffmpeg \
  -i input.mp4 \
  -c:v libx264 \
  -c:a aac \
  -movflags +faststart \
  output.mp4
```

---

# 70. Exemplo de vídeo para YouTube

```bash
ffmpeg \
  -i input.mp4 \
  -c:v libx264 \
  -preset medium \
  -crf 20 \
  -c:a aac \
  -b:a 192k \
  -pix_fmt yuv420p \
  -movflags +faststart \
  output.mp4
```

---

# 71. Exemplo: imagem + narração

```bash
ffmpeg \
  -loop 1 \
  -i image.jpg \
  -i narration.mp3 \
  -c:v libx264 \
  -c:a aac \
  -pix_fmt yuv420p \
  -shortest \
  output.mp4
```

---

# 72. Exemplo: vídeo + narração

```bash
ffmpeg \
  -i video.mp4 \
  -i narration.mp3 \
  -map 0:v \
  -map 1:a \
  -c:v libx264 \
  -c:a aac \
  output.mp4
```

---

# 73. Exemplo: vídeo + música

```bash
ffmpeg \
  -i video.mp4 \
  -i music.mp3 \
  -filter_complex "[1:a]volume=0.2[music]" \
  -map 0:v \
  -map "[music]" \
  -c:v copy \
  -c:a aac \
  output.mp4
```

---

# 74. Exemplo: narração + música

```bash
ffmpeg \
  -i narration.mp3 \
  -i music.mp3 \
  -filter_complex \
  "[1:a]volume=0.15[music];[0:a][music]amix=inputs=2:duration=first[outa]" \
  -map "[outa]" \
  output.mp3
```

---

# 75. Exemplo: vídeo + logo + áudio

```bash
ffmpeg \
  -i video.mp4 \
  -i logo.png \
  -i narration.mp3 \
  -filter_complex \
  "[0:v][1:v]overlay=20:20[outv]" \
  -map "[outv]" \
  -map 2:a \
  -c:v libx264 \
  -c:a aac \
  output.mp4
```

---

# 76. Exemplo: vídeo vertical

```bash
ffmpeg \
  -i input.mp4 \
  -vf "scale=1080:1920" \
  -c:v libx264 \
  -c:a aac \
  output.mp4
```

Para Shorts/Reels/TikTok, normalmente você vai querer uma estratégia de crop/scale que preserve o enquadramento em vez de simplesmente deformar a imagem.

---

# 77. Formato 16:9

```text
1920 × 1080
1280 × 720
```

---

# 78. Formato 9:16

```text
1080 × 1920
720 × 1280
```

---

# 79. Formato 1:1

```text
1080 × 1080
```

---

# 80. Formato 4:5

```text
1080 × 1350
```

---

# 81. Stream specifiers

Os modificadores:

```text
:v
:a
:s
:d
```

podem ser combinados com índices.

Exemplos:

```bash
-c:v libx264
```

Todos os vídeos.

```bash
-c:a aac
```

Todos os áudios.

```bash
-c:v:0 libx264
```

Primeiro vídeo.

```bash
-c:a:1 aac
```

Segundo áudio.

---

# 82. Composição conceitual de um comando

Um comando complexo pode seguir esta estrutura:

```text
ffmpeg

GLOBAL OPTIONS

INPUT OPTIONS
-i input1

INPUT OPTIONS
-i input2

FILTER GRAPH

MAP

VIDEO OPTIONS

AUDIO OPTIONS

OUTPUT OPTIONS

output.mp4
```

Exemplo:

```bash
ffmpeg \
  -y \
  -i video.mp4 \
  -i narration.mp3 \
  -i music.mp3 \
  -filter_complex "..." \
  -map "..." \
  -map "..." \
  -c:v libx264 \
  -crf 20 \
  -c:a aac \
  -b:a 192k \
  -pix_fmt yuv420p \
  -movflags +faststart \
  output.mp4
```

---

# 83. Como isso vira um Video Engine

O **video-lab** já segue este caminho: Composition JSON → RenderPlan → `FfmpegCommandBuilder` → `spawn(ffmpeg)`. A API pública não é uma lista de flags; é o JSON de composição (cenas, `transition`, áudio, texto, overlay). Ver [README](README.md) e as seções 89–91.

Não recomendo que a API seja:

```ts
render(["-i", "video.mp4", "-filter_complex", "..."]);
```

Isso faria o sistema virar apenas um wrapper do FFmpeg.

Em vez disso, o video-lab descreve intenção:

```json
{
  "width": 1920,
  "height": 1080,
  "fps": 25,
  "scenes": [
    { "type": "image", "source": "scene-01.jpg", "duration": 5 },
    {
      "type": "image",
      "source": "scene-02.jpg",
      "duration": 5,
      "transition": { "type": "crossfade", "duration": 1 }
    }
  ]
}
```

O engine transforma isso em:

```text
Composition
      ↓
Parser
      ↓
RenderPlan (tracks)
      ↓
FfmpegCommandBuilder
      ↓
spawn("ffmpeg", args)
      ↓
MP4
```

---

# 84. Arquitetura do video-lab

A árvore real (não um esboço futuro):

```text
src/
├── cli/           loadComposition + entrada
├── composition/   parser, visualDuration, AudioTimeline
├── interfaces/    Scene, Transition, RenderPlan
├── renderer/      Renderer, buildRenderPlan
├── media/         MediaResolver, FontResolver, rasterizeText
└── ffmpeg/        VideoFilter, AudioFilter, OverlayFilter, TextFilter,
                   FfmpegCommandBuilder, FfmpegExecutor
```

`Transition` no domínio é só `{ type, duration }`. A sintaxe `xfade` / `fade` nasce no `FfmpegCommandBuilder`.

---

# 85. API interna

O renderer atual:

```ts
const composition = loadComposition('compositions/crossfade.json')
const renderer = new Renderer({ mediaResolver, fontResolver })
await renderer.render(composition)
```

Internamente:

```text
              Composition
                    │
                    ▼
              RenderPlan
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     Video       Audio      Overlay/Text
        │           │           │
        └───────────┴───────────┘
                    ▼
          FfmpegCommandBuilder
                    │
                    ▼
            spawn("ffmpeg")
                    │
                    ▼
                 MP4
```

---

# 86. Comandos que você deve dominar primeiro

Para o seu projeto, não tente aprender tudo de uma vez.

Prioridade:

```text
1. -i
2. -map
3. -c:v
4. -c:a
5. -vf
6. -af
7. -filter_complex
8. -t
9. -ss
10. -r
11. -s / scale
12. -pix_fmt
13. -crf
14. -preset
15. -b:v
16. -b:a
17. -an
18. -vn
19. -y
20. -shortest
21. -loop
22. -movflags
23. -progress
24. -c copy
25. ffprobe
26. xfade / fade
```

---

# 87. O mais importante para seu renderer

Os quatro conceitos fundamentais serão:

```text
INPUTS
  ↓
FILTER GRAPH
  ↓
MAP
  ↓
ENCODING
```

Ou:

```text
┌─────────────┐
│   Inputs    │
│             │
│ image       │
│ video       │
│ audio       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Filters   │
│             │
│ scale       │
│ pad         │
│ fps         │
│ overlay     │
│ fade        │
│ xfade       │
│ concat      │
│ amix        │
│ drawtext    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Map      │
│             │
│ video       │
│ audio       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Encoder   │
│             │
│ H.264       │
│ AAC         │
└──────┬──────┘
       │
       ▼
    output.mp4
```

---

# 88. Comandos de diagnóstico indispensáveis

```bash
ffmpeg -version
```

```bash
ffmpeg -buildconf
```

```bash
ffmpeg -formats
```

```bash
ffmpeg -codecs
```

```bash
ffmpeg -encoders
```

```bash
ffmpeg -decoders
```

```bash
ffmpeg -filters
```

```bash
ffmpeg -pix_fmts
```

```bash
ffmpeg -protocols
```

```bash
ffprobe -version
```

```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

---

# 89. Crossfade (`xfade`)

`xfade` mistura **dois** streams de vídeo. É o filtro do `transition.type = "crossfade"` no video-lab.

Não confundir com o filtro `fade` (seção 34), que só altera um stream em direção ao preto.

```text
A ─────────────
       ╲
        ╲──── B
        ↑
     overlap
```

Ajuda:

```bash
ffmpeg -h filter=xfade
```

Parâmetros usados pelo engine:

```text
transition = preset visual (`fade` no FFmpeg = dissolve; não é o JSON "fade")
duration   = duração da mistura, em segundos
offset     = instante no stream A em que a mistura começa
```

Os dois lados precisam da mesma resolução, FPS, pixel format e time base. Por isso o video-lab aplica `settb=AVTB` imediatamente antes do `xfade`.

Exemplo (A = 5s, B = 5s, crossfade = 1s):

```text
offset = 5 - 1 = 4
duração final = 5 + 5 - 1 = 9
```

```bash
[v0]settb=AVTB[vouta];
[v1]settb=AVTB[voutb];
[vouta][voutb]xfade=transition=fade:duration=1:offset=4[vout]
```

`offset = 5` estaria errado: a transição começaria depois do fim efetivo de A.

---

# 90. Filter graph do video-lab

O `FfmpegCommandBuilder` monta **um** `-filter_complex` por render. Não há arquivos intermediários de vídeo.

Ordem:

```text
input
  imagem: -loop 1 -t N
  vídeo:  -t N  |  -ss mediaStart -t N  |  loop: -ss mediaStart -t disponível
  → setpts=PTS-STARTPTS quando mediaStart > 0, loop ou freeze
  → loop: split+concat do trecho disponível (não usa -stream_loop com mediaStart)
  → freeze: tpad=stop_mode=clone + trim=duration=N + setpts
  → crop? (pixels da mídia)
  → canvas fit (scale W:H force_original_aspect_ratio=decrease)
  → setpts=PTS-STARTPTS (caminho com placement; alinha t ao canvas)
  → transform scale/zoom + position/pan (se houver)
  → pad no canvas  OU  overlay em color=black W×H
  → setsar + fps + format=yuv420p
  → effects (só valores não-default; ordem canônica)
  → transition (concat | fade+concat | xfade)
  → overlay
  → texto (drawtext com wrap/align/stroke/shadow/box, ou PNG no bounding box com a mesma intenção)
  → áudio (atrim, adelay, amix ou anullsrc)
  → áudio (atrim, adelay, amix ou anullsrc)
  → -map [vout] -map [aout] -c:v libx264 -c:a aac -t DURAÇÃO -pix_fmt yuv420p
```

`mediaStart` é seek no arquivo (`-ss` antes de `-i`). Não entra no `xfade` offset nem em `scenePlacements`. Depois do seek, `setpts=PTS-STARTPTS` impede que o PTS original vaze para a timeline global. `shortMedia: error` (default) é validado no `Renderer` com `ffprobe` da duração do container — não há probe de resolução.

Normalização de cada cena sem placement (`scale`/`zoom`/`x`/`y`/`pan`):

```text
scale=W:H:force_original_aspect_ratio=decrease,
pad=W:H:(ow-iw)/2:(oh-ih)/2,
setsar=1,
fps=F,
format=yuv420p
```

Com placement, o `pad` é substituído por overlay no canvas preto. O frame que chega na transição continua W×H, SAR 1, fps F, yuv420p. `scale` da transformação (`iw*S:ih*S` ou expressão de `t`) não é o mesmo `scale` da normalização do canvas.

Effects da cena (estáticos) são traduzidos pelo `EffectFilter` **depois** dessa normalização e **antes** de concat/`fade`/`xfade`. A ordem das propriedades no JSON é ignorada. Defaults não emitem filtro.

```text
opacity     → lutyuv (mistura YUV com preto; 1 = identidade)
brightness  → eq=brightness (API 0 = original; mesma escala do `eq`, [-1, 1])
contrast    → eq=contrast (API 1 = original)
saturation  → eq=saturation (API 1 = original)
grayscale   → format=gbrp,colorchannelmixer (mistura Rec.601), format=yuv420p
sepia       → format=gbrp,colorchannelmixer (matriz clássica 0.393/0.769/…), format=yuv420p
blur        → boxblur=lr=R:lp=1:cr=R:cp=1  (R = raio em pixels)
```

`grayscale` e `sepia` ativos compartilham uma conversão RGB. `opacity` não usa alpha no concat: o resultado é a cena sobre o canvas preto. Texto e overlay independentes não passam por esses filtros.

Animação (`{ from, to }`) usa `t` do FFmpeg, com `t_norm = min(max(if(isnan(t),0,t)/duration,0),1)`. Sem `easing` (ou `easing: "linear"`), a progressão é `t_norm`. As outras curvas viram expressions: `pow(t_norm,2)` (`ease-in`), `1-pow(1-t_norm,2)` (`ease-out`), `if(lt(t_norm,0.5),…)` (`ease-in-out`). Scale animado precisa de `eval=frame`. Dimensões animadas são forçadas a pares com `trunc(iw*…/2)*2`. `setpts=PTS-STARTPTS` no conteúdo faz `t = 0` no primeiro frame (necessário em vídeos cujo PTS não começa em 0). O Node não gera frames intermediários.

Sem `transition` nas cenas, as pads `[v0][v1]…` vão para `concat`.

Com `crossfade`, o offset é a duração acumulada da timeline visual menos a duração da transição — não um valor hardcoded.

Com `fade`, fade-out na cena anterior, fade-in na seguinte, depois `concat`. A duração total **não** encolhe.

Áudio, texto e overlay **não** recebem `xfade` / `fade`. `keepAudio` e áudio de cena usam o start visual da cena (no crossfade, o áudio original entra no overlap). `mediaStart` do vídeo não altera o `atrim` / `adelay` desses clips.

---

# 91. Conferir um render

Depois de `pnpm dev -- compositions/crossfade.json`:

```bash
ffprobe -v error \
  -select_streams v:0 \
  -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt \
  -show_entries format=duration \
  -of default=noprint_wrappers=1 \
  output/videos/output.mp4
```

Esperado para `compositions/crossfade.json` (5s + 5s, T=1s): duração **9s**, 1920×1080, 25 fps, `yuv420p`.

Para `compositions/fade.json`: duração **10s**, com um instante preto no corte (por volta de t=5s).

---
