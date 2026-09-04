import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseFactoryArgs } from './parseFactoryArgs'

describe('parseFactoryArgs', () => {
  it('reads a factory render-template command', () => {
    assert.deepEqual(
      parseFactoryArgs([
        'render-template',
        'templates/quote.json',
        '--input',
        'templates/inputs/batch.json',
        '--concurrency',
        '2',
        '--retries',
        '1',
        '--verbose',
      ]),
      {
        command: 'render-template',
        templatePath: 'templates/quote.json',
        inputPath: 'templates/inputs/batch.json',
        concurrency: 2,
        retries: 1,
        level: 'verbose',
      },
    )
  })

  it('rejects invalid concurrency', () => {
    assert.throws(
      () =>
        parseFactoryArgs([
          'render-template',
          'templates/quote.json',
          '--input',
          'batch.json',
          '--concurrency',
          '0',
        ]),
      /Invalid concurrency/,
    )
  })

  it('requires the factory command and input', () => {
    assert.throws(
      () => parseFactoryArgs(['templates/quote.json']),
      /render-template/,
    )
    assert.throws(
      () => parseFactoryArgs(['render-template', 'templates/quote.json']),
      /--input/,
    )
  })
})
