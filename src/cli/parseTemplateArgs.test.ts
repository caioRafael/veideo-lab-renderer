import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseTemplateArgs } from './parseTemplateArgs'

describe('parseTemplateArgs', () => {
  it('reads a template path and defaults to normal', () => {
    assert.deepEqual(parseTemplateArgs(['templates/quote.json']), {
      templatePath: 'templates/quote.json',
      variables: {},
      level: 'normal',
    })
  })

  it('reads --input and repeated --var flags', () => {
    assert.deepEqual(
      parseTemplateArgs([
        'templates/quote.json',
        '--input',
        'templates/inputs/quote.json',
        '--var',
        'title=Hello',
        '--var',
        'author=World',
        '--verbose',
      ]),
      {
        templatePath: 'templates/quote.json',
        inputPath: 'templates/inputs/quote.json',
        variables: {
          title: 'Hello',
          author: 'World',
        },
        level: 'verbose',
      },
    )
  })

  it('requires a template path', () => {
    assert.throws(
      () => parseTemplateArgs(['--verbose']),
      /Template path is required/,
    )
  })
})
