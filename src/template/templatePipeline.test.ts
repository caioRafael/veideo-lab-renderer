import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'
import { CompositionParser } from '../composition/CompositionParser'
import { FfmpegCommandBuilder } from '../ffmpeg/FfmpegCommandBuilder'
import type { FfmpegExecutor } from '../ffmpeg/FfmpegExecutor'
import { MediaResolver } from '../media/MediaResolver'
import { buildRenderPlan } from '../renderer/buildRenderPlan'
import { Renderer } from '../renderer/Renderer'
import { loadTemplate, loadTemplateInput } from './loadTemplate'
import { TemplateResolver } from './TemplateResolver'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-tpl-pipe-'))
const mediaPaths = {
  images: path.join(tmpRoot, 'images'),
  audios: path.join(tmpRoot, 'audios'),
  videos: path.join(tmpRoot, 'videos'),
  outputVideos: path.join(tmpRoot, 'output'),
}

const repoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

before(() => {
  fs.mkdirSync(mediaPaths.images, { recursive: true })
  fs.mkdirSync(mediaPaths.audios, { recursive: true })
  fs.mkdirSync(mediaPaths.videos, { recursive: true })
  fs.writeFileSync(path.join(mediaPaths.images, 'frame.png'), 'image')
  fs.writeFileSync(path.join(mediaPaths.audios, 'track.mp3'), 'audio')
})

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('template pipeline', () => {
  it('resolves a template into a composition the parser already understands', () => {
    const resolver = new TemplateResolver()
    const composition = resolver.resolve(
      {
        name: 'pipeline',
        version: 1,
        variables: {
          title: { type: 'string', required: true },
          background: { type: 'asset', required: true },
        },
        composition: {
          output: 'pipeline.mp4',
          width: 1920,
          height: 1080,
          fps: 25,
          scenes: [{ type: 'image', source: '{{background}}', duration: 4 }],
          texts: [{ content: '{{title}}', start: 0, duration: 4 }],
        },
      },
      {
        variables: {
          title: 'From template',
          background: 'frame.png',
        },
      },
    )

    const parsedAgain = new CompositionParser().parse({
      output: 'pipeline.mp4',
      width: 1920,
      height: 1080,
      fps: 25,
      scenes: [{ type: 'image', source: 'frame.png', duration: 4 }],
      texts: [{ content: 'From template', start: 0, duration: 4 }],
    })

    assert.deepEqual(composition, parsedAgain)
  })

  it('builds a RenderPlan and FFmpeg command from a resolved template', async () => {
    const executed: string[][] = []
    const executor: FfmpegExecutor = {
      async execute(args) {
        executed.push(args)
      },
    }

    const composition = new TemplateResolver().resolve(
      {
        name: 'pipeline-render',
        version: 1,
        variables: {
          title: { type: 'string', required: true },
          background: { type: 'asset', required: true },
          audio: { type: 'asset', required: true },
        },
        composition: {
          output: 'template-pipeline.mp4',
          width: 1920,
          height: 1080,
          fps: 25,
          scenes: [{ type: 'image', source: '{{background}}', duration: 4 }],
          audio: [
            { source: '{{audio}}', role: 'focus', start: 0, duration: 4 },
          ],
          texts: [{ content: '{{title}}', start: 0, duration: 4 }],
        },
      },
      {
        variables: {
          title: 'Pipeline',
          background: 'frame.png',
          audio: 'track.mp3',
        },
      },
    )

    const mediaResolver = new MediaResolver(mediaPaths)
    const plan = buildRenderPlan(composition, mediaResolver)
    const args = new FfmpegCommandBuilder().build(plan)

    assert.equal(plan.width, 1920)
    assert.equal(plan.height, 1080)
    assert.equal(plan.fps, 25)
    assert.equal(plan.tracks[0]?.type, 'video')
    assert.ok(args.includes('-y'))

    const renderer = new Renderer({ mediaResolver, executor })
    const result = await renderer.render(composition)

    assert.equal(executed.length, 1)
    assert.equal(
      result.outputPath,
      path.join(mediaPaths.outputVideos, 'template-pipeline.mp4'),
    )
    assert.ok(result.args.includes(path.join(mediaPaths.images, 'frame.png')))
    assert.ok(result.args.includes(path.join(mediaPaths.audios, 'track.mp3')))
  })

  it('loads the quote example and produces a parser-ready composition', () => {
    const template = loadTemplate(
      path.join(repoRoot, 'templates', 'quote.json'),
    )
    const input = loadTemplateInput(
      path.join(repoRoot, 'templates', 'inputs', 'quote.json'),
    )
    const composition = new TemplateResolver().resolve(template, input)

    assert.equal(composition.output, 'template-quote.mp4')
    assert.equal(composition.scenes[0]?.source, 'flamengo.png')
    assert.equal(composition.texts?.[0]?.content, 'A bola não entra por acaso')
    assert.equal(composition.texts?.[1]?.content, 'Uma história real')
    assert.equal(composition.texts?.[0]?.fontSize, 56)
  })
})
