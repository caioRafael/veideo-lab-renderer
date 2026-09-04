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

  it('parses texts with defaults', () => {
    const composition = parser.parse({
      scenes: [validScene],
      texts: [{ content: 'Hello', duration: 4 }],
    })

    assert.deepEqual(composition.texts, [
      {
        content: 'Hello',
        start: 0,
        duration: 4,
        x: 'center',
        y: 'center',
        fontSize: 48,
        color: '#FFFFFF',
      },
    ])
  })

  it('parses font family and style', () => {
    const composition = parser.parse({
      scenes: [validScene],
      texts: [
        {
          content: 'Title',
          duration: 4,
          font: 'Georgia',
          bold: true,
          italic: true,
        },
      ],
    })

    assert.deepEqual(composition.texts?.[0], {
      content: 'Title',
      start: 0,
      duration: 4,
      x: 'center',
      y: 'center',
      fontSize: 48,
      color: '#FFFFFF',
      font: 'Georgia',
      bold: true,
      italic: true,
    })
  })

  it('rejects an invalid font name', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [{ content: 'Hi', duration: 4, font: '' }],
        }),
      /font must be a non-empty string/,
    )
  })

  it('parses texts and overlays from the public schema', () => {
    const composition = parser.parse({
      scenes: [validScene],
      texts: [
        {
          content: 'Video Lab',
          start: 2,
          duration: 5,
          x: 'center',
          y: 140,
          fontSize: 72,
          color: '#FFD400',
        },
      ],
      overlays: [
        {
          source: 'logo.png',
          start: 1,
          duration: 3,
          x: 80,
          y: 80,
          width: 280,
          height: 280,
        },
      ],
    })

    assert.deepEqual(composition.texts?.[0], {
      content: 'Video Lab',
      start: 2,
      duration: 5,
      x: 'center',
      y: 140,
      fontSize: 72,
      color: '#FFD400',
    })
    assert.deepEqual(composition.overlays?.[0], {
      source: 'logo.png',
      start: 1,
      duration: 3,
      x: 80,
      y: 80,
      width: 280,
      height: 280,
    })
  })

  it('rejects an empty text content', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [{ content: '', duration: 4 }],
        }),
      /content is required/,
    )
  })

  it('rejects an invalid text position', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [{ content: 'Hi', duration: 4, x: 'left' }],
        }),
      /must be a number or "center"/,
    )
  })
})
