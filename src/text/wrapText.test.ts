import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { estimateTextHeight, estimateTextWidth, wrapText } from './wrapText'

describe('wrapText', () => {
  it('keeps a short line unchanged', () => {
    assert.equal(wrapText('Hello', 400, 48), 'Hello')
  })

  it('preserves explicit newlines', () => {
    assert.equal(
      wrapText('Linha 1\nLinha 2\nLinha 3', 2000, 48),
      'Linha 1\nLinha 2\nLinha 3',
    )
  })

  it('wraps a long sentence to the box width', () => {
    const wrapped = wrapText(
      'Este e um texto muito grande que deve ser quebrado automaticamente',
      360,
      48,
    )

    assert.ok(wrapped.includes('\n'))
    for (const line of wrapped.split('\n')) {
      assert.ok(estimateTextWidth(line, 48) <= 360 + 1e-6)
    }
  })

  it('is deterministic', () => {
    const input =
      'Um texto longo o suficiente para quebrar em mais de uma linha'
    assert.equal(wrapText(input, 300, 40), wrapText(input, 300, 40))
  })

  it('estimates multiline height with a lineSpacing multiplier', () => {
    assert.equal(estimateTextHeight(1, 50, 1.2), 50)
    assert.equal(estimateTextHeight(2, 50, 1.2), 110)
  })
})
