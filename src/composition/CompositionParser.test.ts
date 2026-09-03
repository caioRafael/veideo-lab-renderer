import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CompositionParser } from './CompositionParser'

const parser = new CompositionParser()

const validScene = {
  type: 'image',
  source: 'frame.png',
  duration: 4,
}

describe('CompositionParser', () => {
  it('parses a valid composition', () => {
    const composition = parser.parse({
      output: 'custom.mp4',
      width: 1280,
      height: 720,
      fps: 30,
      scenes: [validScene],
      audio: [
        {
          source: 'track.mp3',
          role: 'background',
          start: 1,
          duration: 2,
          volume: 0.5,
        },
      ],
    })

    assert.deepEqual(composition, {
      output: 'custom.mp4',
      width: 1280,
      height: 720,
      fps: 30,
      scenes: [validScene],
      audio: [
        {
          source: 'track.mp3',
          role: 'background',
          start: 1,
          duration: 2,
          volume: 0.5,
        },
      ],
    })
  })

  it('applies defaults for output, width, height and fps', () => {
    const composition = parser.parse({
      scenes: [validScene],
    })

    assert.equal(composition.output, 'output.mp4')
    assert.equal(composition.width, 1920)
    assert.equal(composition.height, 1080)
    assert.equal(composition.fps, 25)
    assert.equal(composition.audio, undefined)
  })

  it('rejects a non-object composition', () => {
    assert.throws(() => parser.parse([]), /JSON object/)
  })

  it('rejects a composition without scenes', () => {
    assert.throws(() => parser.parse({}), /non-empty scenes/)
  })

  it('rejects an invalid scene type', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, type: 'gif' }],
        }),
      /type must be "image" or "video"/,
    )
  })

  it('rejects a scene without a source', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ type: 'image', duration: 4 }],
        }),
      /source is required/,
    )
  })

  it('rejects a scene duration that is not greater than 0', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, duration: 0 }],
        }),
      /duration must be > 0/,
    )
  })

  it('rejects an invalid audio role', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          audio: [{ source: 'track.mp3', role: 'voice' }],
        }),
      /role must be "background" or "focus"/,
    )
  })

  it('parses scene audio clips', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          audio: [{ source: 'sfx.mp3', role: 'focus', start: 1 }],
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.audio, [
      { source: 'sfx.mp3', role: 'focus', start: 1 },
    ])
  })
})
