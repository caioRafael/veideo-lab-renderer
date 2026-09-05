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
      /source: expected a non-empty string or a source object/,
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

  it('parses a valid crossfade on the destination scene', () => {
    const composition = parser.parse({
      scenes: [
        validScene,
        {
          ...validScene,
          source: 'next.png',
          transition: { type: 'crossfade', duration: 1 },
        },
      ],
    })

    assert.deepEqual(composition.scenes[1]?.transition, {
      type: 'crossfade',
      duration: 1,
    })
  })

  it('parses a valid fade on the destination scene', () => {
    const composition = parser.parse({
      scenes: [
        validScene,
        {
          ...validScene,
          source: 'next.png',
          transition: { type: 'fade', duration: 0.5 },
        },
      ],
    })

    assert.equal(composition.scenes[1]?.transition?.type, 'fade')
    assert.equal(composition.scenes[1]?.transition?.duration, 0.5)
  })

  it('rejects an invalid transition type', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            validScene,
            {
              ...validScene,
              transition: { type: 'zoom', duration: 1 },
            },
          ],
        }),
      /transition.type: expected "fade" or "crossfade"/,
    )
  })

  it('rejects an invalid transition duration', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            validScene,
            { ...validScene, transition: { type: 'fade', duration: 0 } },
          ],
        }),
      /transition.duration: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            validScene,
            { ...validScene, transition: { type: 'fade', duration: -1 } },
          ],
        }),
      /transition.duration: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            validScene,
            { ...validScene, transition: { type: 'fade', duration: NaN } },
          ],
        }),
      /transition.duration: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            validScene,
            {
              ...validScene,
              transition: { type: 'fade', duration: Infinity },
            },
          ],
        }),
      /transition.duration: expected a value greater than 0/,
    )
  })

  it('rejects a transition on the first scene', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transition: { type: 'crossfade', duration: 1 },
            },
          ],
        }),
      /the first scene cannot have a transition/,
    )
  })

  it('rejects a transition longer than an adjacent scene', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            { ...validScene, duration: 1 },
            {
              ...validScene,
              duration: 5,
              transition: { type: 'crossfade', duration: 2 },
            },
          ],
        }),
      /expected a duration smaller than both adjacent scenes/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            validScene,
            {
              ...validScene,
              duration: 1,
              transition: { type: 'crossfade', duration: 1 },
            },
          ],
        }),
      /expected a duration smaller than both adjacent scenes/,
    )
  })

  it('rejects texts that start after a crossfade shortens the timeline', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            { ...validScene, duration: 5 },
            {
              ...validScene,
              duration: 5,
              transition: { type: 'crossfade', duration: 1 },
            },
          ],
          texts: [{ content: 'Late', start: 9, duration: 1 }],
        }),
      /composition duration \(9s\)/,
    )
  })

  it('parses a scene without a transform', () => {
    const composition = parser.parse({
      scenes: [validScene],
    })

    assert.equal(composition.scenes[0]?.transform, undefined)
  })

  it('parses a valid transform object', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: { scale: 1.2, x: 100, y: -40 },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform, {
      scale: 1.2,
      x: 100,
      y: -40,
    })
  })

  it('parses a valid scale', () => {
    const composition = parser.parse({
      scenes: [{ ...validScene, transform: { scale: 0.5 } }],
    })

    assert.equal(composition.scenes[0]?.transform?.scale, 0.5)
  })

  it('rejects an invalid scale', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { scale: 0 } }],
        }),
      /transform.scale: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { scale: -1 } }],
        }),
      /transform.scale: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { scale: NaN } }],
        }),
      /transform.scale: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { scale: Infinity } }],
        }),
      /transform.scale: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { scale: '1.2' } }],
        }),
      /transform.scale: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { scale: null } }],
        }),
      /transform.scale: expected a value greater than 0/,
    )
  })

  it('parses a valid position', () => {
    const composition = parser.parse({
      scenes: [{ ...validScene, transform: { x: -120.5, y: 0 } }],
    })

    assert.deepEqual(composition.scenes[0]?.transform, { x: -120.5, y: 0 })
  })

  it('rejects a non-finite position', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { x: Infinity } }],
        }),
      /transform.x: expected a finite number/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { y: NaN } }],
        }),
      /transform.y: expected a finite number/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { x: '100' } }],
        }),
      /transform.x: expected a finite number/,
    )
  })

  it('parses a valid crop and defaults origin to 0', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: { crop: { width: 1280, height: 720 } },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform?.crop, {
      width: 1280,
      height: 720,
      x: 0,
      y: 0,
    })
  })

  it('parses a crop with an origin', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: {
            crop: { width: 800, height: 600, x: 10, y: 20 },
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform?.crop, {
      width: 800,
      height: 600,
      x: 10,
      y: 20,
    })
  })

  it('rejects an invalid crop', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { crop: { height: 720 } } }],
        }),
      /transform.crop.width: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: { crop: { width: 0, height: 720 } },
            },
          ],
        }),
      /transform.crop.width: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: { crop: { width: 1280, height: -1 } },
            },
          ],
        }),
      /transform.crop.height: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: { crop: { width: 1280, height: 720, x: -1 } },
            },
          ],
        }),
      /transform.crop.x: expected a value greater than or equal to 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: { crop: { width: 1280, height: 720, y: -0.1 } },
            },
          ],
        }),
      /transform.crop.y: expected a value greater than or equal to 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: {
                crop: { width: Infinity, height: 720 },
              },
            },
          ],
        }),
      /transform.crop.width: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { crop: null } }],
        }),
      /transform.crop: expected an object/,
    )
  })

  it('parses a valid zoom', () => {
    const composition = parser.parse({
      scenes: [{ ...validScene, transform: { zoom: 1.25 } }],
    })

    assert.equal(composition.scenes[0]?.transform?.zoom, 1.25)
  })

  it('rejects an invalid zoom', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { zoom: 0 } }],
        }),
      /transform.zoom: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { zoom: -2 } }],
        }),
      /transform.zoom: expected a value greater than 0/,
    )
  })

  it('parses a valid pan', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: { pan: { x: 100, y: -50 } },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform?.pan, {
      x: 100,
      y: -50,
    })
  })

  it('rejects a non-finite pan', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { pan: { x: Infinity } } }],
        }),
      /transform.pan.x: expected a finite number/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { pan: null } }],
        }),
      /transform.pan: expected an object/,
    )
  })

  it('parses a combination of transformations', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: {
            scale: 1.2,
            zoom: 1.1,
            x: 40,
            y: -10,
            pan: { x: 10, y: 20 },
            crop: { width: 1600, height: 900, x: 8, y: 4 },
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform, {
      scale: 1.2,
      zoom: 1.1,
      x: 40,
      y: -10,
      pan: { x: 10, y: 20 },
      crop: { width: 1600, height: 900, x: 8, y: 4 },
    })
  })

  it('rejects a transform that is not an object', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: 'scale=1.2' }],
        }),
      /transform: expected an object/,
    )
  })

  it('parses animated scale', () => {
    const composition = parser.parse({
      scenes: [{ ...validScene, transform: { scale: { from: 1, to: 1.2 } } }],
    })

    assert.deepEqual(composition.scenes[0]?.transform?.scale, {
      from: 1,
      to: 1.2,
    })
  })

  it('parses animated zoom', () => {
    const composition = parser.parse({
      scenes: [{ ...validScene, transform: { zoom: { from: 1, to: 1.25 } } }],
    })

    assert.deepEqual(composition.scenes[0]?.transform?.zoom, {
      from: 1,
      to: 1.25,
    })
  })

  it('parses animated position on x and y', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: {
            x: { from: 0, to: 150 },
            y: { from: -20, to: 50 },
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform, {
      x: { from: 0, to: 150 },
      y: { from: -20, to: 50 },
    })
  })

  it('parses animated pan as from/to points', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: {
            pan: {
              from: { x: 0, y: 0 },
              to: { x: 150, y: 50 },
            },
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform?.pan, {
      from: { x: 0, y: 0 },
      to: { x: 150, y: 50 },
    })
  })

  it('defaults omitted axes on animated pan points to 0', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: {
            pan: { from: { x: -80 }, to: { y: 30 } },
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform?.pan, {
      from: { x: -80, y: 0 },
      to: { x: 0, y: 30 },
    })
  })

  it('parses animated scale with static crop', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: {
            crop: { width: 1100, height: 950 },
            scale: { from: 1, to: 1.2 },
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform, {
      crop: { width: 1100, height: 950, x: 0, y: 0 },
      scale: { from: 1, to: 1.2 },
    })
  })

  it('parses animated scale with a static offset', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: {
            scale: { from: 1, to: 1.2 },
            x: 40,
            y: -10,
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform, {
      scale: { from: 1, to: 1.2 },
      x: 40,
      y: -10,
    })
  })

  it('parses animated scale with animated pan', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: {
            scale: { from: 1, to: 1.18 },
            pan: {
              from: { x: -80, y: 20 },
              to: { x: 100, y: -30 },
            },
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform?.scale, {
      from: 1,
      to: 1.18,
    })
    assert.deepEqual(composition.scenes[0]?.transform?.pan, {
      from: { x: -80, y: 20 },
      to: { x: 100, y: -30 },
    })
  })

  it('parses animated zoom with animated pan', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: {
            zoom: { from: 1, to: 1.2 },
            pan: {
              from: { x: 0, y: 0 },
              to: { x: 80, y: 40 },
            },
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.transform?.zoom, {
      from: 1,
      to: 1.2,
    })
  })

  it('rejects incomplete or invalid animated scale', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { scale: { from: 1 } } }],
        }),
      /transform.scale: expected "from" and "to"/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { scale: { to: 1.2 } } }],
        }),
      /transform.scale: expected "from" and "to"/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: { scale: { from: '1', to: 1.2 } },
            },
          ],
        }),
      /transform.scale.from: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            { ...validScene, transform: { scale: { from: 1, to: null } } },
          ],
        }),
      /transform.scale.to: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            { ...validScene, transform: { scale: { from: 0, to: 1.2 } } },
          ],
        }),
      /transform.scale.from: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            { ...validScene, transform: { scale: { from: 1, to: -1 } } },
          ],
        }),
      /transform.scale.to: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: { scale: { from: 1, to: Infinity } },
            },
          ],
        }),
      /transform.scale.to: expected a value greater than 0/,
    )
  })

  it('rejects invalid animated pan', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: {
                pan: { from: { x: 0, y: 0 }, to: { x: '100', y: 50 } },
              },
            },
          ],
        }),
      /transform.pan.to.x: expected a finite number/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: { pan: { from: { x: 0, y: 0 } } },
            },
          ],
        }),
      /transform.pan: expected "from" and "to"/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: {
                pan: { x: 10, from: { x: 0, y: 0 }, to: { x: 1, y: 1 } },
              },
            },
          ],
        }),
      /transform.pan: expected either \{ x, y \} or \{ from, to \}, not both/,
    )
  })

  it('rejects unknown fields on transform objects', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, transform: { rotate: 15 } }],
        }),
      /transform: unexpected field "rotate"/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: { scale: { from: 1, to: 1.2, curve: 'ease-in' } },
            },
          ],
        }),
      /transform.scale: unexpected field "curve"/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              transform: {
                pan: { from: { x: 0, y: 0, z: 1 }, to: { x: 1, y: 1 } },
              },
            },
          ],
        }),
      /transform.pan.from: unexpected field "z"/,
    )
  })

  it('parses easing on animated values and defaults to linear when omitted', () => {
    const omitted = parser.parse({
      scenes: [{ ...validScene, transform: { scale: { from: 1, to: 1.2 } } }],
    })
    const linear = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: { scale: { from: 1, to: 1.2, easing: 'linear' } },
        },
      ],
    })
    const easeIn = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: { scale: { from: 1, to: 1.5, easing: 'ease-in' } },
        },
      ],
    })
    const easeOut = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: { zoom: { from: 1, to: 1.4, easing: 'ease-out' } },
        },
      ],
    })
    const easeInOut = parser.parse({
      scenes: [
        {
          ...validScene,
          transform: {
            x: { from: 0, to: 80, easing: 'ease-in-out' },
            pan: {
              from: { x: 0, y: 0 },
              to: { x: 40, y: 10 },
              easing: 'ease-out',
            },
          },
        },
      ],
    })

    assert.deepEqual(omitted.scenes[0]?.transform, {
      scale: { from: 1, to: 1.2 },
    })
    assert.deepEqual(linear.scenes[0]?.transform?.scale, {
      from: 1,
      to: 1.2,
      easing: 'linear',
    })
    assert.deepEqual(easeIn.scenes[0]?.transform?.scale, {
      from: 1,
      to: 1.5,
      easing: 'ease-in',
    })
    assert.deepEqual(easeOut.scenes[0]?.transform?.zoom, {
      from: 1,
      to: 1.4,
      easing: 'ease-out',
    })
    assert.deepEqual(easeInOut.scenes[0]?.transform, {
      x: { from: 0, to: 80, easing: 'ease-in-out' },
      pan: {
        from: { x: 0, y: 0 },
        to: { x: 40, y: 10 },
        easing: 'ease-out',
      },
    })
  })

  it('rejects invalid easing values', () => {
    const invalid = ['ease', 'bounce', 'spring', 'foo', null, 123, {}]
    for (const easing of invalid) {
      assert.throws(
        () =>
          parser.parse({
            scenes: [
              {
                ...validScene,
                transform: { scale: { from: 1, to: 2, easing } },
              },
            ],
          }),
        /transform.scale.easing: expected "linear", "ease-in", "ease-out" or "ease-in-out"/,
      )
    }
  })

  it('omits effects when the scene has none', () => {
    const composition = parser.parse({
      scenes: [validScene],
    })

    assert.equal(composition.scenes[0]?.effects, undefined)
  })

  it('parses an empty effects object', () => {
    const composition = parser.parse({
      scenes: [{ ...validScene, effects: {} }],
    })

    assert.deepEqual(composition.scenes[0]?.effects, {})
  })

  it('parses a valid effects object', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          effects: {
            opacity: 0.8,
            brightness: 0.1,
            contrast: 1.2,
            saturation: 0.8,
            grayscale: 0.5,
            sepia: 0.2,
            blur: 2,
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.effects, {
      opacity: 0.8,
      brightness: 0.1,
      contrast: 1.2,
      saturation: 0.8,
      grayscale: 0.5,
      sepia: 0.2,
      blur: 2,
    })
  })

  it('parses multiple effects without depending on key order', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          effects: {
            blur: 2,
            contrast: 1.3,
            brightness: 0.2,
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.effects, {
      blur: 2,
      contrast: 1.3,
      brightness: 0.2,
    })
  })

  it('accepts effect boundary values', () => {
    const composition = parser.parse({
      scenes: [
        {
          ...validScene,
          effects: {
            opacity: 0,
            brightness: -1,
            contrast: 0,
            saturation: 0,
            grayscale: 1,
            sepia: 1,
            blur: 64,
          },
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.effects, {
      opacity: 0,
      brightness: -1,
      contrast: 0,
      saturation: 0,
      grayscale: 1,
      sepia: 1,
      blur: 64,
    })
  })

  it('rejects an effects value that is not an object', () => {
    const invalid = [null, [], 'bright', 1, true]
    for (const effects of invalid) {
      assert.throws(
        () =>
          parser.parse({
            scenes: [{ ...validScene, effects }],
          }),
        /effects: expected an object/,
      )
    }
  })

  it('rejects unknown video effects', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              effects: { brightness: 0.2, vignette: 1 },
            },
          ],
        }),
      /Unknown video effect: vignette/,
    )
  })

  it('rejects animated effect objects', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              ...validScene,
              effects: { brightness: { from: -0.2, to: 0.2 } },
            },
          ],
        }),
      /effects.brightness: expected a value between -1 and 1/,
    )
  })

  it('rejects invalid effect values', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, effects: { opacity: 2 } }],
        }),
      /effects.opacity: expected a value between 0 and 1/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, effects: { opacity: -0.1 } }],
        }),
      /effects.opacity: expected a value between 0 and 1/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, effects: { brightness: 1.5 } }],
        }),
      /effects.brightness: expected a value between -1 and 1/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, effects: { contrast: -1 } }],
        }),
      /effects.contrast: expected a value between 0 and 4/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, effects: { saturation: -0.2 } }],
        }),
      /effects.saturation: expected a value between 0 and 3/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, effects: { grayscale: 1.2 } }],
        }),
      /effects.grayscale: expected a value between 0 and 1/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, effects: { sepia: -0.1 } }],
        }),
      /effects.sepia: expected a value between 0 and 1/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, effects: { blur: -1 } }],
        }),
      /effects.blur: expected a value between 0 and 64/,
    )
  })

  it('rejects NaN, Infinity and non-numbers on effects', () => {
    const invalid = [Number.NaN, Infinity, -Infinity, null, '0.2', {}, []]
    for (const brightness of invalid) {
      assert.throws(
        () =>
          parser.parse({
            scenes: [{ ...validScene, effects: { brightness } }],
          }),
        /effects.brightness: expected a value between -1 and 1/,
      )
    }
  })

  it('omits mediaStart and shortMedia by default', () => {
    const composition = parser.parse({
      scenes: [{ type: 'video', source: 'clip.mp4', duration: 5 }],
    })

    assert.equal(composition.scenes[0]?.mediaStart, undefined)
    assert.equal(composition.scenes[0]?.shortMedia, undefined)
  })

  it('parses mediaStart zero and a positive offset', () => {
    const zero = parser.parse({
      scenes: [
        { type: 'video', source: 'clip.mp4', duration: 5, mediaStart: 0 },
      ],
    })
    const offset = parser.parse({
      scenes: [
        { type: 'video', source: 'clip.mp4', duration: 5, mediaStart: 10 },
      ],
    })

    assert.equal(zero.scenes[0]?.mediaStart, 0)
    assert.equal(offset.scenes[0]?.mediaStart, 10)
  })

  it('rejects invalid mediaStart values', () => {
    const invalid = [-1, Number.NaN, Infinity, -Infinity, null, '10', {}]
    for (const mediaStart of invalid) {
      assert.throws(
        () =>
          parser.parse({
            scenes: [
              { type: 'video', source: 'clip.mp4', duration: 5, mediaStart },
            ],
          }),
        /mediaStart: expected a value greater than or equal to 0/,
      )
    }
  })

  it('rejects mediaStart on an image scene', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, mediaStart: 2 }],
        }),
      /mediaStart: expected to be used only on video scenes/,
    )
  })

  it('parses shortMedia policies', () => {
    for (const shortMedia of ['error', 'loop', 'freeze'] as const) {
      const composition = parser.parse({
        scenes: [
          { type: 'video', source: 'clip.mp4', duration: 5, shortMedia },
        ],
      })

      assert.equal(composition.scenes[0]?.shortMedia, shortMedia)
    }
  })

  it('rejects invalid shortMedia values', () => {
    const invalid = ['repeat', 'hold', 'something', null, 123]
    for (const shortMedia of invalid) {
      assert.throws(
        () =>
          parser.parse({
            scenes: [
              { type: 'video', source: 'clip.mp4', duration: 5, shortMedia },
            ],
          }),
        /shortMedia: expected "error", "loop" or "freeze"/,
      )
    }
  })

  it('rejects shortMedia on an image scene', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [{ ...validScene, shortMedia: 'loop' }],
        }),
      /shortMedia: expected to be used only on video scenes/,
    )
  })

  it('parses the nested text style, position and box', () => {
    const composition = parser.parse({
      scenes: [validScene],
      texts: [
        {
          content: 'Linha 1\nLinha 2',
          start: 1,
          duration: 3,
          position: { x: 960, y: 900 },
          box: { width: 1200, height: 300 },
          style: {
            font: 'Arial',
            size: 64,
            color: '#FFFFFF',
            bold: true,
            align: 'center',
            verticalAlign: 'bottom',
            lineSpacing: 1.2,
            stroke: { width: 2, color: '#000000' },
            shadow: { x: 4, y: 4, color: '#000000' },
            background: {
              color: '#000000',
              opacity: 0.5,
              padding: 16,
            },
          },
        },
      ],
    })

    assert.deepEqual(composition.texts?.[0], {
      content: 'Linha 1\nLinha 2',
      start: 1,
      duration: 3,
      x: 960,
      y: 900,
      fontSize: 64,
      color: '#FFFFFF',
      font: 'Arial',
      bold: true,
      align: 'center',
      verticalAlign: 'bottom',
      lineSpacing: 1.2,
      stroke: { width: 2, color: '#000000' },
      shadow: { x: 4, y: 4, color: '#000000' },
      background: { color: '#000000', opacity: 0.5, padding: 16 },
      box: { width: 1200, height: 300 },
    })
  })

  it('rejects invalid text style values', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [{ content: 'Hi', duration: 4, style: { align: 'banana' } }],
        }),
      /style.align: expected "left", "center" or "right"/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [
            {
              content: 'Hi',
              duration: 4,
              style: { verticalAlign: 'center' },
            },
          ],
        }),
      /style.verticalAlign: expected "top", "middle" or "bottom"/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [
            {
              content: 'Hi',
              duration: 4,
              style: { background: { color: '#000000', opacity: 2 } },
            },
          ],
        }),
      /background.opacity: expected a value between 0 and 1/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [{ content: 'Hi', duration: 4, style: { lineSpacing: 0 } }],
        }),
      /lineSpacing: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [
            {
              content: 'Hi',
              duration: 4,
              style: { stroke: { width: -1, color: '#000000' } },
            },
          ],
        }),
      /stroke.width: expected a value greater than or equal to 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [
            {
              content: 'Hi',
              duration: 4,
              style: { background: { color: '#000000', padding: -4 } },
            },
          ],
        }),
      /padding: expected a value greater than or equal to 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [{ content: 'Hi', duration: 4, box: { width: 0 } }],
        }),
      /box.width: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [
            {
              content: 'Hi',
              duration: 4,
              style: { shadow: { x: 1, y: 1, blur: 4, color: '#000000' } },
            },
          ],
        }),
      /shadow.blur: expected 0; shadow blur is not supported/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [
            {
              content: 'Hi',
              duration: 4,
              style: { letterSpacing: 2 },
            },
          ],
        }),
      /style: unexpected field "letterSpacing"/,
    )
  })

  it('parses file, asset and url sources', () => {
    const composition = parser.parse({
      scenes: [
        {
          type: 'image',
          source: { type: 'file', path: '/tmp/foto.jpg' },
          duration: 4,
        },
        {
          type: 'image',
          source: { type: 'asset', id: 'asset_123' },
          duration: 4,
        },
        {
          type: 'image',
          source: { type: 'url', url: 'https://example.com/foto.jpg' },
          duration: 4,
        },
      ],
    })

    assert.deepEqual(composition.scenes[0]?.source, {
      type: 'file',
      path: '/tmp/foto.jpg',
    })
    assert.deepEqual(composition.scenes[1]?.source, {
      type: 'asset',
      id: 'asset_123',
    })
    assert.deepEqual(composition.scenes[2]?.source, {
      type: 'url',
      url: 'https://example.com/foto.jpg',
    })
  })

  it('still parses a string source as a project filename', () => {
    const composition = parser.parse({
      scenes: [{ type: 'image', source: 'foto.jpg', duration: 4 }],
    })

    assert.equal(composition.scenes[0]?.source, 'foto.jpg')
  })

  it('rejects an unknown source object type', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [
            {
              type: 'image',
              source: { type: 's3', path: 'bucket/foto.jpg' },
              duration: 4,
            },
          ],
        }),
      /expected a source object with type "file", "asset" or "url"/,
    )
  })

  it('rejects NaN and Infinity in new text fields', () => {
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [
            { content: 'Hi', duration: 4, style: { lineSpacing: Number.NaN } },
          ],
        }),
      /lineSpacing: expected a value greater than 0/,
    )
    assert.throws(
      () =>
        parser.parse({
          scenes: [validScene],
          texts: [{ content: 'Hi', duration: 4, box: { width: Infinity } }],
        }),
      /box.width: expected a value greater than 0/,
    )
  })
})
