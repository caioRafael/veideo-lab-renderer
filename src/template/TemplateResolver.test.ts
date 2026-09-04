import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Template } from '../interfaces/template'
import { TemplateError } from './TemplateError'
import { TemplateResolver } from './TemplateResolver'

const resolver = new TemplateResolver()

function baseTemplate(
  variables: Template['variables'],
  composition: Record<string, unknown>,
): Template {
  return {
    name: 'demo',
    version: 1,
    variables,
    composition: {
      output: 'from-template.mp4',
      width: 1920,
      height: 1080,
      fps: 25,
      scenes: [{ type: 'image', source: 'frame.png', duration: 4 }],
      ...composition,
    },
  }
}

describe('TemplateResolver', () => {
  it('resolves a template plus input into a composition', () => {
    const composition = resolver.resolve(
      baseTemplate(
        { title: { type: 'string', required: true } },
        {
          texts: [
            {
              content: '{{title}}',
              start: 0,
              duration: 4,
              x: 'center',
              y: 'center',
            },
          ],
        },
      ),
      { variables: { title: 'Hello' } },
    )

    assert.equal(composition.output, 'from-template.mp4')
    assert.equal(composition.texts?.[0]?.content, 'Hello')
  })

  it('interpolates multiple string variables', () => {
    const composition = resolver.resolve(
      baseTemplate(
        {
          title: { type: 'string', required: true },
          subtitle: { type: 'string', required: true },
        },
        {
          texts: [
            {
              content: '{{title}} - {{subtitle}}',
              start: 0,
              duration: 4,
            },
          ],
        },
      ),
      { variables: { title: 'Hello', subtitle: 'World' } },
    )

    assert.equal(composition.texts?.[0]?.content, 'Hello - World')
  })

  it('applies defaults when input omits a variable', () => {
    const composition = resolver.resolve(
      baseTemplate(
        {
          title: { type: 'string', default: 'Untitled' },
        },
        {
          texts: [{ content: '{{title}}', start: 0, duration: 4 }],
        },
      ),
      {},
    )

    assert.equal(composition.texts?.[0]?.content, 'Untitled')
  })

  it('prefers input over the default', () => {
    const composition = resolver.resolve(
      baseTemplate(
        {
          title: { type: 'string', default: 'Untitled' },
        },
        {
          texts: [{ content: '{{title}}', start: 0, duration: 4 }],
        },
      ),
      { variables: { title: 'Provided' } },
    )

    assert.equal(composition.texts?.[0]?.content, 'Provided')
  })

  it('rejects a missing required variable', () => {
    assert.throws(
      () =>
        resolver.resolve(
          baseTemplate(
            { title: { type: 'string', required: true } },
            {
              texts: [{ content: '{{title}}', start: 0, duration: 4 }],
            },
          ),
          {},
        ),
      (error: unknown) =>
        error instanceof TemplateError &&
        error.message === 'Template variable "title" is required',
    )
  })

  it('rejects a string when a number is expected', () => {
    assert.throws(
      () =>
        resolver.resolve(
          baseTemplate(
            { fontSize: { type: 'number', required: true } },
            {
              texts: [
                {
                  content: 'Hi',
                  start: 0,
                  duration: 4,
                  fontSize: { $variable: 'fontSize' },
                },
              ],
            },
          ),
          { variables: { fontSize: '64' } },
        ),
      /Template variable "fontSize" expected number, received string/,
    )
  })

  it('does not coerce numeric strings', () => {
    assert.throws(
      () =>
        resolver.resolve(
          baseTemplate(
            { fontSize: { type: 'number', default: 64 } },
            {
              texts: [
                {
                  content: 'Hi',
                  start: 0,
                  duration: 4,
                  fontSize: { $variable: 'fontSize' },
                },
              ],
            },
          ),
          { variables: { fontSize: '64' } },
        ),
      /expected number, received string/,
    )
  })

  it('resolves a typed number reference', () => {
    const composition = resolver.resolve(
      baseTemplate(
        { fontSize: { type: 'number', required: true } },
        {
          texts: [
            {
              content: 'Hi',
              start: 0,
              duration: 4,
              fontSize: { $variable: 'fontSize' },
            },
          ],
        },
      ),
      { variables: { fontSize: 72 } },
    )

    assert.equal(composition.texts?.[0]?.fontSize, 72)
  })

  it('resolves a typed boolean reference', () => {
    const composition = resolver.resolve(
      baseTemplate(
        { bold: { type: 'boolean', required: true } },
        {
          texts: [
            {
              content: 'Hi',
              start: 0,
              duration: 4,
              bold: { $variable: 'bold' },
            },
          ],
        },
      ),
      { variables: { bold: true } },
    )

    assert.equal(composition.texts?.[0]?.bold, true)
  })

  it('resolves an asset as a source path without opening the file', () => {
    const composition = resolver.resolve(
      baseTemplate(
        { background: { type: 'asset', required: true } },
        {
          scenes: [{ type: 'image', source: '{{background}}', duration: 4 }],
        },
      ),
      { variables: { background: 'assets/background.jpg' } },
    )

    assert.equal(composition.scenes[0]?.source, 'assets/background.jpg')
  })

  it('walks nested objects and arrays', () => {
    const composition = resolver.resolve(
      baseTemplate(
        {
          first: { type: 'string', required: true },
          second: { type: 'string', required: true },
          opacity: { type: 'number', required: true },
        },
        {
          scenes: [
            {
              type: 'image',
              source: 'frame.png',
              duration: 4,
              effects: { opacity: { $variable: 'opacity' } },
            },
          ],
          texts: [
            { content: '{{first}}', start: 0, duration: 2 },
            { content: '{{second}}', start: 2, duration: 2 },
          ],
        },
      ),
      {
        variables: {
          first: 'One',
          second: 'Two',
          opacity: 0.8,
        },
      },
    )

    assert.equal(composition.scenes[0]?.effects?.opacity, 0.8)
    assert.equal(composition.texts?.[0]?.content, 'One')
    assert.equal(composition.texts?.[1]?.content, 'Two')
  })

  it('does not mutate the original template', () => {
    const template = baseTemplate(
      { title: { type: 'string', required: true } },
      {
        texts: [{ content: '{{title}}', start: 0, duration: 4 }],
      },
    )
    const snapshot = JSON.stringify(template)

    resolver.resolve(template, { variables: { title: 'Hello' } })

    assert.equal(JSON.stringify(template), snapshot)
    assert.equal(
      (template.composition.texts as Array<{ content: string }>)[0]?.content,
      '{{title}}',
    )
  })

  it('is deterministic for the same template and input', () => {
    const template = baseTemplate(
      {
        title: { type: 'string', required: true },
        fontSize: { type: 'number', default: 48 },
      },
      {
        texts: [
          {
            content: '{{title}}',
            start: 0,
            duration: 4,
            fontSize: { $variable: 'fontSize' },
          },
        ],
      },
    )
    const input = { variables: { title: 'Hello', fontSize: 60 } }

    const first = resolver.resolve(template, input)
    const second = resolver.resolve(template, input)

    assert.deepEqual(first, second)
  })

  it('rejects an unknown typed reference at resolve time', () => {
    const template = baseTemplate(
      { title: { type: 'string', required: true } },
      {
        texts: [{ content: '{{title}}', start: 0, duration: 4 }],
      },
    )
    const mutated = {
      ...template,
      composition: {
        ...template.composition,
        texts: [
          {
            content: '{{title}}',
            start: 0,
            duration: 4,
            fontSize: { $variable: 'missing' },
          },
        ],
      },
    }

    assert.throws(
      () => resolver.resolve(mutated, { variables: { title: 'Hello' } }),
      /Template references unknown variable "missing"/,
    )
  })

  it('rejects unknown input variables', () => {
    assert.throws(
      () =>
        resolver.resolve(
          baseTemplate({ title: { type: 'string', default: 'Hi' } }, {}),
          { variables: { extra: 'nope' } },
        ),
      /Unknown template input variable "extra"/,
    )
  })

  it('rejects a boolean when a string is expected', () => {
    assert.throws(
      () =>
        resolver.resolve(
          baseTemplate(
            { title: { type: 'string', required: true } },
            {
              texts: [{ content: '{{title}}', start: 0, duration: 4 }],
            },
          ),
          { variables: { title: true } },
        ),
      /Template variable "title" expected string, received boolean/,
    )
  })
})
