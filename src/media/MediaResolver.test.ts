import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { MediaResolver } from './MediaResolver'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-media-'))
const mediaPaths = {
  images: path.join(tmpRoot, 'images'),
  audios: path.join(tmpRoot, 'audios'),
  videos: path.join(tmpRoot, 'videos'),
  outputVideos: path.join(tmpRoot, 'output'),
}

const resolver = new MediaResolver(mediaPaths)

before(() => {
  fs.mkdirSync(mediaPaths.images, { recursive: true })
  fs.mkdirSync(mediaPaths.audios, { recursive: true })
  fs.mkdirSync(mediaPaths.videos, { recursive: true })
  fs.writeFileSync(path.join(mediaPaths.images, 'frame.png'), 'image')
  fs.writeFileSync(path.join(mediaPaths.audios, 'track.mp3'), 'audio')
  fs.writeFileSync(path.join(mediaPaths.videos, 'clip.mp4'), 'video')
})

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('MediaResolver', () => {
  it('resolves an image scene source', () => {
    assert.equal(
      resolver.resolveSceneSource({
        type: 'image',
        source: 'frame.png',
        duration: 4,
      }),
      path.join(mediaPaths.images, 'frame.png'),
    )
  })

  it('resolves a video scene source', () => {
    assert.equal(
      resolver.resolveSceneSource({
        type: 'video',
        source: 'clip.mp4',
        duration: 4,
      }),
      path.join(mediaPaths.videos, 'clip.mp4'),
    )
  })

  it('resolves an audio file', () => {
    assert.equal(
      resolver.resolveAudio('track.mp3'),
      path.join(mediaPaths.audios, 'track.mp3'),
    )
  })

  it('throws when a media file does not exist', () => {
    assert.throws(() => resolver.resolveAudio('missing.mp3'), /Asset not found/)
  })

  it('resolves an absolute path without joining the input folder', () => {
    const outside = path.join(tmpRoot, 'outside.jpg')
    fs.writeFileSync(outside, 'image')

    assert.equal(
      resolver.resolveSceneSource({
        type: 'image',
        source: outside,
        duration: 4,
      }),
      path.resolve(outside),
    )
  })

  it('rejects an absolute path that is not a file', () => {
    assert.throws(
      () =>
        resolver.resolveSceneSource({
          type: 'image',
          source: tmpRoot,
          duration: 4,
        }),
      /Asset is not a file/,
    )
  })

  it('resolves the output path and creates the directory', () => {
    const outputPath = resolver.resolveOutput('result.mp4')
    assert.equal(outputPath, path.join(mediaPaths.outputVideos, 'result.mp4'))
    assert.equal(fs.existsSync(mediaPaths.outputVideos), true)
  })
})
