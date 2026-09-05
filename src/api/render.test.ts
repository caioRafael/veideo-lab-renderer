import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import {
  parseComposition as parseFromIndex,
  render as renderFromIndex,
} from '../index'
import { parseComposition, render } from './render'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-api-'))
const framePath = path.join(tmpRoot, 'frame.png')
const audioPath = path.join(tmpRoot, 'track.mp3')

before(() => {
  fs.writeFileSync(framePath, 'image')
  fs.writeFileSync(audioPath, 'audio')
})

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('render', () => {
  it('parses an in-memory composition and renders without a JSON file', async () => {
    const output = path.join(tmpRoot, 'result.mp4')

    const result = await render(
      {
        composition: {
          width: 1920,
          height: 1080,
          fps: 25,
          scenes: [{ type: 'image', source: 'background', duration: 4 }],
          audio: [{ source: 'music', role: 'focus', start: 0, duration: 4 }],
        },
        assets: {
          background: framePath,
          music: audioPath,
        },
        output,
      },
      {
        executor: {
          async execute() {},
        },
      },
    )

    assert.equal(result.outputPath, path.resolve(output))
    assert.equal(result.duration, 4)
    assert.equal(result.metrics.sceneCount, 1)
    assert.equal(result.metrics.audioCount, 1)
    assert.equal(result.metrics.videoDuration, 4)
  })

  it('accepts output as an object path', async () => {
    const output = path.join(tmpRoot, 'named', 'video.mp4')

    const result = await render(
      {
        composition: {
          scenes: [
            {
              type: 'image',
              source: { type: 'asset', id: 'hero' },
              duration: 2,
            },
          ],
        },
        assets: { hero: framePath },
        output: { path: output },
      },
      {
        executor: {
          async execute() {},
        },
      },
    )

    assert.equal(result.outputPath, path.resolve(output))
    assert.equal(result.duration, 2)
  })

  it('rejects an invalid in-memory composition before rendering', async () => {
    await assert.rejects(
      () =>
        render({
          composition: { scenes: [] },
          output: path.join(tmpRoot, 'invalid.mp4'),
        }),
      /expected a non-empty scenes array/,
    )
  })

  it('rejects a missing asset id', async () => {
    await assert.rejects(
      () =>
        render({
          composition: {
            scenes: [
              {
                type: 'image',
                source: { type: 'asset', id: 'missing' },
                duration: 2,
              },
            ],
          },
          output: path.join(tmpRoot, 'missing.mp4'),
        }),
      /Asset "missing" was not found/,
    )
  })

  it('rejects a relative source that was not provided in assets', async () => {
    await assert.rejects(
      () =>
        render({
          composition: {
            scenes: [{ type: 'image', source: 'frame.png', duration: 2 }],
          },
          output: path.join(tmpRoot, 'unresolved.mp4'),
        }),
      /Provide it in assets/,
    )
  })
})

describe('parseComposition', () => {
  it('parses a raw object without reading a file', () => {
    const composition = parseComposition({
      scenes: [{ type: 'image', source: 'frame.png', duration: 4 }],
    })

    assert.equal(composition.output, 'output.mp4')
    assert.equal(composition.width, 1920)
    assert.equal(composition.scenes[0]?.source, 'frame.png')
  })
})

describe('package entry', () => {
  it('exports render and parseComposition from the public module', () => {
    assert.equal(typeof renderFromIndex, 'function')
    assert.equal(typeof parseFromIndex, 'function')
  })
})
