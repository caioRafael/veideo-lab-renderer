import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { collectInterpolationNames, interpolateString } from './interpolate'
import { TemplateError } from './TemplateError'

const stringVars = {
  title: { type: 'string' as const, required: true },
  subtitle: { type: 'string' as const, required: true },
}

describe('interpolateString', () => {
  it('replaces a single placeholder', () => {
    assert.equal(
      interpolateString('{{title}}', stringVars, { title: 'Hello' }),
      'Hello',
    )
  })

  it('replaces multiple placeholders in one string', () => {
    assert.equal(
      interpolateString('{{title}} - {{subtitle}}', stringVars, {
        title: 'Hello',
        subtitle: 'World',
      }),
      'Hello - World',
    )
  })

  it('keeps surrounding text and line breaks', () => {
    assert.equal(
      interpolateString('Título: {{title}}\n{{subtitle}}', stringVars, {
        title: 'Minha história',
        subtitle: 'Parte 1',
      }),
      'Título: Minha história\nParte 1',
    )
  })

  it('allows whitespace inside the braces', () => {
    assert.equal(
      interpolateString('{{ title }}', stringVars, { title: 'Ok' }),
      'Ok',
    )
  })

  it('rejects unknown placeholders', () => {
    assert.throws(
      () => interpolateString('{{missing}}', stringVars, {}),
      (error: unknown) =>
        error instanceof TemplateError &&
        error.message === 'Template references unknown variable "missing"',
    )
  })

  it('rejects interpolating a number variable as string', () => {
    assert.throws(
      () =>
        interpolateString(
          '{{fontSize}}',
          { fontSize: { type: 'number', default: 64 } },
          { fontSize: 64 },
        ),
      /Template variable "fontSize" is used as string/,
    )
  })
})

describe('collectInterpolationNames', () => {
  it('finds placeholder names in order', () => {
    assert.deepEqual(collectInterpolationNames('{{title}} / {{subtitle}}'), [
      'title',
      'subtitle',
    ])
  })
})
