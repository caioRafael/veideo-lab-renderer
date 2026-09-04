import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { loadTemplate, loadTemplateInput } from './loadTemplate'
import { TemplateError } from './TemplateError'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-template-'))

before(() => {
  fs.writeFileSync(path.join(tmpRoot, 'broken.json'), '{ not json')
  fs.writeFileSync(
    path.join(tmpRoot, 'input.json'),
    JSON.stringify({ title: 'From file' }),
  )
  fs.writeFileSync(
    path.join(tmpRoot, 'wrapped-input.json'),
    JSON.stringify({ variables: { title: 'Wrapped' } }),
  )
  fs.writeFileSync(
    path.join(tmpRoot, 'template.json'),
    JSON.stringify({
      name: 'file-template',
      version: 1,
      variables: { title: { type: 'string', required: true } },
      composition: {
        output: 'file.mp4',
        width: 1920,
        height: 1080,
        fps: 25,
        scenes: [{ type: 'image', source: 'frame.png', duration: 4 }],
        texts: [{ content: '{{title}}', start: 0, duration: 4 }],
      },
    }),
  )
})

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('loadTemplate', () => {
  it('loads and validates a template file', () => {
    const template = loadTemplate(path.join(tmpRoot, 'template.json'))

    assert.equal(template.name, 'file-template')
    assert.equal(template.variables.title?.type, 'string')
  })

  it('throws when the template file does not exist', () => {
    assert.throws(
      () => loadTemplate(path.join(tmpRoot, 'missing.json')),
      (error: unknown) =>
        error instanceof TemplateError &&
        error.message.includes('Template file not found'),
    )
  })

  it('throws when the file is not valid JSON', () => {
    assert.throws(
      () => loadTemplate(path.join(tmpRoot, 'broken.json')),
      /Invalid template JSON/,
    )
  })
})

describe('loadTemplateInput', () => {
  it('accepts a flat variable object', () => {
    assert.deepEqual(loadTemplateInput(path.join(tmpRoot, 'input.json')), {
      variables: { title: 'From file' },
    })
  })

  it('accepts a wrapped variables object', () => {
    assert.deepEqual(
      loadTemplateInput(path.join(tmpRoot, 'wrapped-input.json')),
      { variables: { title: 'Wrapped' } },
    )
  })
})
