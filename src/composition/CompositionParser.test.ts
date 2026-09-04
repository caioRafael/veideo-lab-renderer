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
    assert.throws(() => parser.parse([]), /expected a JSON object/)
  })

  it('rejects a composition without scenes', () => {
    assert.throws(() => parser.parse({}), /non-empty scenes array/)
  })

  it('rejects an invalid scene type', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, type: 'gif' }],
        }),
      /expected "image" or "video"/,
    )
  })

  it('rejects a scene without a source', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ type: 'image', duration: 4 }],
        }),
      /source: expected a non-empty string/,
    )
  })

  it('rejects a scene duration that is not greater than 0', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, duration: 0 }],
        }),
      /duration: expected a value greater than 0/,
    )
  })

  it('rejects an invalid audio role', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          audio: [{ source: 'track.mp3', role: 'voice' }],
        }),
      /role: expected "background" or "focus"/,
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

  it('parses keepAudio on a video scene', () => {
    const composition = parser.parse({
      scenes: [
        {
          type: 'video',
          source: 'clip.mp4',
          duration: 8,
          keepAudio: true,
        },
      ],
    })

    assert.equal(composition.scenes[0]?.keepAudio, true)
  })

  it('rejects keepAudio on an image scene', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, keepAudio: true }],
        }),
      /keepAudio: expected to be used only on video scenes/,
    )
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
      /font: expected a non-empty string/,
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
      /content: expected a non-empty string/,
    )
  })

  it('rejects an invalid text position', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [{ content: 'Hi', duration: 4, x: 'left' }],
        }),
      /expected a number or "center"/,
    )
  })

  it('rejects invalid canvas and fps values', () => {
    assert.throws(
      () => parser.parse({ width: 0, scenes: [validScene] }),
      /Invalid width: expected a value greater than 0/,
    )
    assert.throws(
      () => parser.parse({ height: 1081, scenes: [validScene] }),
      /Invalid height: expected an even integer greater than 0/,
    )
    assert.throws(
      () => parser.parse({ fps: -1, scenes: [validScene] }),
      /Invalid fps: expected a value greater than 0/,
    )
    assert.throws(
      () => parser.parse({ fps: Infinity, scenes: [validScene] }),
      /Invalid fps: expected a value greater than 0/,
    )
  })

  it('rejects a present output that is not a non-empty string', () => {
    assert.throws(
      () => parser.parse({ output: '', scenes: [validScene] }),
      /Invalid output: expected a non-empty string/,
    )
  })

  it('rejects an invalid volume', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          audio: [{ source: 'track.mp3', role: 'focus', volume: -1 }],
        }),
      /volume: expected a value greater than or equal to 0/,
    )
  })

  it('rejects texts and overlays that start outside the timeline', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [{ content: 'Late', start: 4, duration: 1 }],
        }),
      /texts\[0\].start: expected a value within the composition duration \(4s\)/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          overlays: [
            {
              source: 'logo.png',
              start: 8,
              duration: 1,
              x: 0,
              y: 0,
              width: 10,
              height: 10,
            },
          ],
        }),
      /overlays\[0\].start: expected a value within the composition duration \(4s\)/,
    )
  })

  it('rejects scene audio that starts outside the scene', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              audio: [{ source: 'sfx.mp3', role: 'focus', start: 4 }],
            },
          ],
        }),
      /audio\[0\].start: expected a value within the scene duration \(4s\)/,
    )
  })
})
