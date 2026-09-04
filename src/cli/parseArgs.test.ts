import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseArgs } from './parseArgs'

describe('parseArgs', () => {
  it('reads a composition path and defaults to normal', () => {
    assert.deepEqual(parseArgs(['--', 'compositions/example.json']), {
      compositionPath: 'compositions/example.json',
      level: 'normal',
    })
  })

  it('enables verbose, debug and quiet flags', () => {
    assert.equal(parseArgs(['--verbose']).level, 'verbose')
    assert.equal(parseArgs(['-v']).level, 'verbose')
    assert.equal(parseArgs(['--debug']).level, 'debug')
    assert.equal(parseArgs(['--quiet']).level, 'quiet')
  })
})
