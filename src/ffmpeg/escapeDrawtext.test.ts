import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { escapeDrawtext, toFfmpegColor } from './escapeDrawtext'

describe('escapeDrawtext', () => {
  it('keeps ordinary text', () => {
    assert.equal(escapeDrawtext('Hello World'), 'Hello World')
    assert.equal(escapeDrawtext('texto com espaços'), 'texto com espaços')
  })

  it('escapes characters that break drawtext', () => {
    assert.equal(escapeDrawtext('Hello: World'), 'Hello\\: World')
    assert.equal(escapeDrawtext("It's working"), "It\\'s working")
    assert.equal(escapeDrawtext('100%'), '100\\%')
    assert.equal(escapeDrawtext('A=B'), 'A=B')
    assert.equal(escapeDrawtext('Hello, World'), 'Hello, World')
  })

  it('converts hex colors to FFmpeg format', () => {
    assert.equal(toFfmpegColor('#FFFFFF'), '0xFFFFFF')
    assert.equal(toFfmpegColor('#FFD400'), '0xFFD400')
    assert.equal(toFfmpegColor('white'), 'white')
    assert.equal(toFfmpegColor('#000000', 0.5), '0x000000@0.5')
  })

  it('escapes newlines as drawtext \\n', () => {
    assert.equal(escapeDrawtext('Linha 1\nLinha 2'), 'Linha 1\\nLinha 2')
  })
})
