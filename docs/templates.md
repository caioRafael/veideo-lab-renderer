# Templates

O Template Engine transforma um documento reutilizável em uma `Composition` normal. Ele não renderiza vídeo e não conhece FFmpeg.

```text
Template + Input
        ↓
TemplateResolver
        ↓
Composition
        ↓
CompositionParser
        ↓
RenderPlan
        ↓
Renderer / FFmpeg
```

O renderer não sabe se a composição veio de um template, de um JSON escrito à mão ou de código TypeScript.

## Template versus Composition

| | Template | Composition |
|---|---|---|
| Papel | composição parametrizada | composição concreta, pronta para renderizar |
| Variáveis | declara e referencia | não existem |
| Destino | `TemplateResolver` | `CompositionParser` → `Renderer` |

Exemplo:

```text
Template:  "Olá, {{name}}"
Input:     name = "Caio"
     ↓
Composition: "Olá, Caio"
```

## Estrutura

```json
{
  "name": "quote",
  "version": 1,
  "variables": {
    "title": { "type": "string", "required": true },
    "fontSize": { "type": "number", "default": 64 },
    "background": { "type": "asset", "required": true }
  },
  "composition": {
    "output": "quote.mp4",
    "width": 1920,
    "height": 1080,
    "fps": 25,
    "scenes": [
      { "type": "image", "source": "{{background}}", "duration": 6 }
    ],
    "texts": [
      {
        "content": "{{title}}",
        "fontSize": { "$variable": "fontSize" }
      }
    ]
  }
}
```

`composition` é um JSON no formato que o parser já entende, com dois mecanismos extras:

- `{{name}}` em valores **string**
- `{ "$variable": "name" }` para valores tipados (number, boolean, asset ou string)

Depois da resolução esses marcadores desaparecem.

## Variáveis

Tipos suportados:

| Tipo | Valor | Uso típico |
|---|---|---|
| `string` | texto | `{{title}}` ou `$variable` |
| `number` | número finito | somente `{ "$variable": "fontSize" }` |
| `boolean` | `true` / `false` | somente `$variable` |
| `asset` | caminho/nome de arquivo | `{{background}}` ou `$variable` |

Não há coerção. `"64"` não vira `64`.

O engine **não abre** assets. A existência do arquivo continua sendo responsabilidade do renderer/parser.

### Defaults

```json
{ "fontSize": { "type": "number", "default": 64 } }
```

Se o input omitir `fontSize`, o valor resolvido é `64`.

### Required

```json
{ "title": { "type": "string", "required": true } }
```

Regras:

- `required: true` e sem input e sem default → `Template variable "title" is required`
- `required` omitido e sem default → a variável é obrigatória
- `required` omitido e com default → a variável é opcional
- `required: false` sem default e sem input → permitido só se a variável não for usada; se for referenciada, o resolve falha com a mesma mensagem de required

Uma variável obrigatória nunca vira `undefined` dentro da composição.

### Input

```ts
interface TemplateInput {
  variables?: Record<string, unknown>
}
```

Arquivo JSON aceita os dois formatos:

```json
{ "title": "Minha história" }
```

```json
{ "variables": { "title": "Minha história" } }
```

Chaves que não existem em `variables` geram erro: `Unknown template input variable "extra"`.

## Interpolação

Somente em strings:

```json
{ "content": "{{title}}" }
{ "content": "Título: {{title}}" }
{ "content": "{{title}}\n{{subtitle}}" }
```

`{{ fontSize }}` é erro se `fontSize` for `number` ou `boolean`:

```text
Template variable "fontSize" is used as string
```

`{{missing}}` é erro:

```text
Template references unknown variable "missing"
```

A interpolação é substituição de texto. Não usa `eval`, `Function`, expressões, `if` ou loops.

## Referência tipada

```json
{ "fontSize": { "$variable": "fontSize" } }
{ "bold": { "$variable": "bold" } }
```

O objeto precisa ter **somente** a chave `$variable`. O valor resolvido mantém o tipo.

## Imutabilidade e determinismo

`resolve` clona o documento. O template original não é alterado e pode ser reutilizado.

O mesmo template + o mesmo input sempre produz a mesma `Composition`. Não há random, timestamps nem IDs gerados.

## CLI

```bash
pnpm render-template templates/quote.json --input templates/inputs/quote.json

pnpm render-template templates/quote.json \
  --var title="Minha história" \
  --var author="Uma história real"

pnpm render-template templates/full.json --input templates/inputs/full.json --verbose
```

`--var` sempre entrega **string**. Números e booleanos devem ir no arquivo `--input`.

A CLI carrega o template, resolve, e reutiliza o mesmo pipeline de `pnpm render`. Composições antigas continuam iguais:

```bash
pnpm render compositions/example.json
```

Uma variável declarada e nunca usada gera aviso (não é erro):

```text
Warning: template variable "subtitle" is declared but never used
```

## API programática

```ts
import { loadTemplate, loadTemplateInput } from './src/template/loadTemplate'
import { TemplateResolver } from './src/template/TemplateResolver'
import { Renderer } from './src/renderer/Renderer'

const template = loadTemplate('templates/quote.json')
const input = loadTemplateInput('templates/inputs/quote.json')
const composition = new TemplateResolver().resolve(template, input)

await renderer.render(composition)
```

`resolve` devolve uma `Composition` já passada pelo `CompositionParser`. O resolver não chama FFmpeg.

## Exemplos

| Arquivo | O que demonstra |
|---|---|
| `templates/quote.json` | fundo + título + autor |
| `templates/youtube-short.json` | 9:16, título, subtítulo, overlay |
| `templates/slideshow.json` | várias cenas, fade e crossfade |
| `templates/full.json` | vídeo, transform, effects, texto, áudio, overlay, transition |
| `templates/presets/youtube-16x9.json` | preset 1920×1080 |
| `templates/presets/youtube-short-9x16.json` | preset 1080×1920 |
| `templates/presets/square-1x1.json` | preset 1080×1080 |
| `templates/inputs/batch-youtube-short.json` | três inputs para a Factory |

Presets são templates comuns. Não existe herança (`extends`) nesta fase.

## Lote (Video Factory)

Vários inputs no mesmo template. O resolver continua o mesmo; a Factory só cria um job por input.

```bash
pnpm factory render-template \
  templates/youtube-short.json \
  --input templates/inputs/batch-youtube-short.json \
  --concurrency 2
```

Ver [factory.md](factory.md).

## Segurança

Templates são dados, não código.

- sem `eval` / `new Function`
- sem execução de shell
- sem escrita arbitrária no filesystem
- o loader só lê o JSON indicado
- o resultado é somente uma `Composition`

## Limitações

- Sem `if` / `else`, loops, funções ou expressões
- Sem herança de templates
- Sem interpolação em números (use `$variable`)
- Sem validação física de assets
- Sem API HTTP, banco ou fila persistente
- O PNG de texto (bounding box) é do renderer, não desta camada
