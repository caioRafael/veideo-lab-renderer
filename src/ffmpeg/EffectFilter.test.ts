import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { EffectFilter } from './EffectFilter'

const filter = new EffectFilter()

describe('EffectFilter', () => {
  it('emits no filters when effects are omitted or default', () => {
    assert.equal(filter.apply(undefined), '')
    assert.equal(filter.apply({}), '')
    assert.equal(
      filter.apply({
        opacity: 1,
        brightness: 0,
        contrast: 1,
        saturation: 1,
        grayscale: 0,
        sepia: 0,
        blur: 0,
      }),
      '',
    )
    assert.deepEqual(filter.filters({ brightness: 0 }), [])
  })

  it('maps opacity to a YUV blend toward black', () => {
    assert.equal(
      filter.apply({ opacity: 0.75 }),
      "lutyuv=y='val*0.75':u='(val-128)*0.75+128':v='(val-128)*0.75+128'",
    )
  })

  it('maps brightness, contrast and saturation to separate eq filters', () => {
    assert.equal(filter.apply({ brightness: 0.2 }), 'eq=brightness=0.2')
    assert.equal(filter.apply({ brightness: -0.1 }), 'eq=brightness=-0.1')
    assert.equal(filter.apply({ contrast: 1.2 }), 'eq=contrast=1.2')
    assert.equal(filter.apply({ saturation: 0.8 }), 'eq=saturation=0.8')
  })

  it('maps grayscale through colorchannelmixer after an RGB conversion', () => {
    const result = filter.apply({ grayscale: 1 })

    assert.match(result, /^format=gbrp,colorchannelmixer=/)
    assert.match(result, /rr=0\.299/)
    assert.match(result, /rg=0\.587/)
    assert.match(result, /rb=0\.114/)
    assert.match(result, /format=yuv420p$/)
  })

  it('maps partial grayscale as a mix toward Rec.601 luma', () => {
    const result = filter.apply({ grayscale: 0.5 })

    assert.match(result, /rr=0\.6495/)
    assert.match(result, /rg=0\.2935/)
    assert.match(result, /gg=0\.7935/)
  })

  it('maps sepia through a simple colorchannelmixer matrix', () => {
    const result = filter.apply({ sepia: 1 })

    assert.match(result, /^format=gbrp,colorchannelmixer=/)
    assert.match(result, /rr=0\.393/)
    assert.match(result, /rg=0\.769/)
    assert.match(result, /rb=0\.189/)
    assert.match(result, /format=yuv420p$/)
  })

  it('maps blur to a single-pass boxblur radius in pixels', () => {
    assert.equal(filter.apply({ blur: 2 }), 'boxblur=lr=2:lp=1:cr=2:cp=1')
  })

  it('applies effects in canonical order regardless of JSON key order', () => {
    const reversed = filter.filters({
      blur: 2,
      contrast: 1.2,
      brightness: 0.1,
    })
    const declared = filter.filters({
      brightness: 0.1,
      contrast: 1.2,
      blur: 2,
    })

    assert.deepEqual(reversed, [
      'eq=brightness=0.1',
      'eq=contrast=1.2',
      'boxblur=lr=2:lp=1:cr=2:cp=1',
    ])
    assert.deepEqual(reversed, declared)
  })

  it('keeps grayscale before sepia inside a single RGB conversion', () => {
    const result = filter.apply({
      sepia: 0.2,
      grayscale: 0.5,
      saturation: 0.8,
    })

    const saturationIndex = result.indexOf('eq=saturation=0.8')
    const grayscaleIndex = result.indexOf('rr=0.6495')
    const sepiaIndex = result.indexOf('rg=0.1538')
    const formatStart = result.indexOf('format=gbrp')
    const formatEnd = result.lastIndexOf('format=yuv420p')

    assert.equal(saturationIndex !== -1, true)
    assert.equal(grayscaleIndex !== -1, true)
    assert.equal(sepiaIndex !== -1, true)
    assert.equal(saturationIndex < formatStart, true)
    assert.equal(formatStart < grayscaleIndex, true)
    assert.equal(grayscaleIndex < sepiaIndex, true)
    assert.equal(sepiaIndex < formatEnd, true)
  })

  it('emits the full canonical chain when every effect is active', () => {
    const parts = filter.filters({
      blur: 1,
      sepia: 0.15,
      grayscale: 0.1,
      saturation: 0.8,
      contrast: 1.2,
      brightness: 0.1,
      opacity: 0.85,
    })

    assert.equal(parts[0]?.startsWith('lutyuv='), true)
    assert.equal(parts[1], 'eq=brightness=0.1')
    assert.equal(parts[2], 'eq=contrast=1.2')
    assert.equal(parts[3], 'eq=saturation=0.8')
    assert.equal(parts[4]?.startsWith('format=gbrp,'), true)
    assert.match(parts[4] ?? '', /colorchannelmixer=.*colorchannelmixer=/)
    assert.equal(parts[5], 'boxblur=lr=1:lp=1:cr=1:cp=1')
  })
})
