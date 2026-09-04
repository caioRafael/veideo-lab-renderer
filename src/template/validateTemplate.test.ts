import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Template } from '../interfaces/template'
import { parseTemplate, unusedTemplateVariables } from './validateTemplate'

function validTemplate(): Record<string, unknown> {
  return {
    name: 'demo',
    version: 1,
    variables: {
      title: { type: 'string', required: true },
    },
    composition: {
      output: 'out.mp4',
      scenes: [{ type: 'image', source: 'frame.png', duration: 4 }],
      texts: [{ content: '{{title}}', start: 0, duration: 4 }],
    },
  }
}

describe('parseTemplate', () => {
  it('parses a valid template', () => {
    const template = parseTemplate(validTemplate())

    assert.equal(template.name, 'demo')
    assert.equal(template.version, 1)
    assert.equal(template.variables.title?.type, 'string')
  })

  it('requires a name', () => {
    const raw = validTemplate()
    delete raw.name

    assert.throws(() => parseTemplate(raw), /Template name is required/)
  })

  it('rejects an unsupported variable type', () => {
    const raw = validTemplate()
    raw.variables = { title: { type: 'foo' } }

    assert.throws(
      () => parseTemplate(raw),
      /Unsupported template variable type "foo"/,
    )
  })

  it('rejects an invalid default', () => {
    const raw = validTemplate()
    raw.variables = { fontSize: { type: 'number', default: '64' } }

    assert.throws(
      () => parseTemplate(raw),
      /Template variable "fontSize" has invalid default/,
    )
  })

  it('rejects unknown interpolated variables', () => {
    const raw = validTemplate()
    raw.composition = {
      texts: [{ content: '{{subtitle}}' }],
    }

    assert.throws(
      () => parseTemplate(raw),
      /Template references unknown variable "subtitle"/,
    )
  })

  it('rejects interpolating a number variable as string', () => {
    const raw = validTemplate()
    raw.variables = { fontSize: { type: 'number', default: 64 } }
    raw.composition = {
      texts: [{ content: '{{fontSize}}' }],
    }

    assert.throws(
      () => parseTemplate(raw),
      /Template variable "fontSize" is used as string/,
    )
  })

  it('accepts a typed reference for a number variable', () => {
    const raw = validTemplate()
    raw.variables = { fontSize: { type: 'number', default: 64 } }
    raw.composition = {
      texts: [{ fontSize: { $variable: 'fontSize' } }],
    }

    const template = parseTemplate(raw)
    assert.equal(template.variables.fontSize?.type, 'number')
  })

  it('rejects an unknown typed reference', () => {
    const raw = validTemplate()
    raw.composition = {
      texts: [{ fontSize: { $variable: 'missing' } }],
    }

    assert.throws(
      () => parseTemplate(raw),
      /Template references unknown variable "missing"/,
    )
  })
})

describe('unusedTemplateVariables', () => {
  it('lists declared variables that never appear in the composition', () => {
    const template: Template = {
      name: 'demo',
      version: 1,
      variables: {
        title: { type: 'string', required: true },
        subtitle: { type: 'string', required: false },
      },
      composition: {
        texts: [{ content: '{{title}}' }],
      },
    }

    assert.deepEqual(unusedTemplateVariables(template), ['subtitle'])
  })
})
