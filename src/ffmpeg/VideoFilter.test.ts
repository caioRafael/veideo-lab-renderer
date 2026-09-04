import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { VideoItem } from '../interfaces/render-plan'
import type { Transform } from '../interfaces/transform'
import { VideoFilter } from './VideoFilter'

const filter = new VideoFilter(1920, 1080, 25)

function item(transform?: Transform): VideoItem {
  const videoItem: VideoItem = {
    id: 'video-0',
    source: '/tmp/a.png',
    start: 0,
    duration: 5,
    mediaType: 'image',
  }

  if (transform !== undefined) {
    videoItem.transform = transform
  }

  return videoItem
}

function filterSteps(graph: string): string[] {
  return graph.split(';')
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const progress = 'min(max(if(isnan(t),0,t)/5,0),1)'

describe('VideoFilter', () => {
  it('builds a scale, pad and fps chain', () => {
    const result = filter.scale('0:v', 'v0')

    assert.match(result, /^\[0:v\]/)
    assert.match(result, /scale=1920:1080:force_original_aspect_ratio=decrease/)
    assert.match(result, /pad=1920:1080:\(ow-iw\)\/2:\(oh-ih\)\/2/)
    assert.match(result, /fps=25/)
    assert.match(result, /format=yuv420p\[v0\]$/)
  })

  it('prepares a scene without transform using canvas normalization', () => {
    const result = filter.prepare('0:v', 'v0', item())

    assert.equal(result, filter.scale('0:v', 'v0'))
    assert.match(result, /pad=1920:1080:\(ow-iw\)\/2:\(oh-ih\)\/2/)
    assert.equal(result.includes('overlay='), false)
    assert.equal(result.includes('crop='), false)
  })

  it('applies crop before canvas normalization', () => {
    const result = filter.prepare(
      '0:v',
      'v0',
      item({ crop: { width: 1280, height: 720, x: 10, y: 20 } }),
    )
    const [chain] = filterSteps(result)

    assert.ok(chain)
    assert.match(
      chain,
      /^\[0:v\]crop=1280:720:10:20,scale=1920:1080:force_original_aspect_ratio=decrease/,
    )
    assert.match(chain, /pad=1920:1080:\(ow-iw\)\/2:\(oh-ih\)\/2/)
    assert.match(chain, /setsar=1,fps=25,format=yuv420p\[v0\]$/)
    assert.equal(chain.includes('overlay='), false)
  })

  it('applies scale after canvas fit and before overlay placement', () => {
    const steps = filterSteps(filter.prepare('0:v', 'v0', item({ scale: 1.2 })))

    assert.deepEqual(steps, [
      '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,setsar=1[v0fit]',
      '[v0fit]scale=iw*1.2:ih*1.2[v0z]',
      'color=c=black:s=1920x1080:r=25:d=5,format=yuv420p,setsar=1[v0bg]',
      '[v0bg][v0z]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:shortest=1,setsar=1,fps=25,format=yuv420p[v0]',
    ])
  })

  it('places content with x and y as a displacement from center', () => {
    const steps = filterSteps(
      filter.prepare('0:v', 'v0', item({ x: 100, y: -50 })),
    )

    assert.deepEqual(steps, [
      '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,setsar=1[v0fit]',
      'color=c=black:s=1920x1080:r=25:d=5,format=yuv420p,setsar=1[v0bg]',
      '[v0bg][v0fit]overlay=(main_w-overlay_w)/2+100:(main_h-overlay_h)/2-50:shortest=1,setsar=1,fps=25,format=yuv420p[v0]',
    ])
  })

  it('treats zoom as the same content scale filter', () => {
    const scaled = filter.prepare('0:v', 'v0', item({ scale: 1.25 }))
    const zoomed = filter.prepare('0:v', 'v0', item({ zoom: 1.25 }))

    assert.equal(scaled, zoomed)
    assert.match(scaled, /scale=iw\*1\.25:ih\*1\.25/)
  })

  it('treats pan as the same overlay offset as x and y', () => {
    const positioned = filter.prepare('0:v', 'v0', item({ x: 100, y: 50 }))
    const panned = filter.prepare('0:v', 'v0', item({ pan: { x: 100, y: 50 } }))

    assert.equal(positioned, panned)
    assert.match(
      positioned,
      /overlay=\(main_w-overlay_w\)\/2\+100:\(main_h-overlay_h\)\/2\+50:shortest=1/,
    )
  })

  it('applies crop, then fit, then scale, then position', () => {
    const steps = filterSteps(
      filter.prepare(
        '0:v',
        'v0',
        item({
          crop: { width: 1600, height: 900, x: 8, y: 4 },
          scale: 1.2,
          x: 100,
          y: 50,
        }),
      ),
    )

    assert.deepEqual(steps, [
      '[0:v]crop=1600:900:8:4,scale=1920:1080:force_original_aspect_ratio=decrease,setsar=1[v0fit]',
      '[v0fit]scale=iw*1.2:ih*1.2[v0z]',
      'color=c=black:s=1920x1080:r=25:d=5,format=yuv420p,setsar=1[v0bg]',
      '[v0bg][v0z]overlay=(main_w-overlay_w)/2+100:(main_h-overlay_h)/2+50:shortest=1,setsar=1,fps=25,format=yuv420p[v0]',
    ])
  })

  it('animates scale with a clamped lerp of t over the scene duration', () => {
    const steps = filterSteps(
      filter.prepare('0:v', 'v0', item({ scale: { from: 1, to: 1.2 } })),
    )
    const factor = `(1+(0.2)*${progress})`

    assert.equal(
      steps[0],
      '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,setsar=1[v0fit]',
    )
    assert.equal(
      steps[1],
      `[v0fit]scale=w='trunc(iw*(${factor})/2)*2':h='trunc(ih*(${factor})/2)*2':eval=frame[v0z]`,
    )
    assert.match(
      steps[3] ?? '',
      /overlay=\(main_w-overlay_w\)\/2:\(main_h-overlay_h\)\/2:shortest=1/,
    )
  })

  it('animates zoom with the same scale expression as scale', () => {
    const scaled = filter.prepare(
      '0:v',
      'v0',
      item({ scale: { from: 1, to: 1.2 } }),
    )
    const zoomed = filter.prepare(
      '0:v',
      'v0',
      item({ zoom: { from: 1, to: 1.2 } }),
    )

    assert.equal(scaled, zoomed)
  })

  it('multiplies animated scale and zoom expressions instead of lerping the product', () => {
    const graph = filter.prepare(
      '0:v',
      'v0',
      item({
        scale: { from: 1, to: 1.1 },
        zoom: { from: 1, to: 1.2 },
      }),
    )
    const factor = `(1+(0.1)*${progress})*(1+(0.2)*${progress})`

    assert.equal(
      filterSteps(graph)[1],
      `[v0fit]scale=w='trunc(iw*(${factor})/2)*2':h='trunc(ih*(${factor})/2)*2':eval=frame[v0z]`,
    )
    assert.equal(graph.includes('iw*1.32'), false)
  })

  it('animates x and y as overlay offsets from center', () => {
    const graph = filter.prepare(
      '0:v',
      'v0',
      item({
        x: { from: 0, to: 150 },
        y: { from: 0, to: 50 },
      }),
    )

    assert.match(
      graph,
      new RegExp(
        `overlay=x='\\(main_w-overlay_w\\)/2\\+\\(150\\*${escapeRegex(progress)}\\)':y='\\(main_h-overlay_h\\)/2\\+\\(50\\*${escapeRegex(progress)}\\)':shortest=1`,
      ),
    )
    assert.equal(graph.includes('scale=w='), false)
  })

  it('quotes both overlay axes when only one is animated', () => {
    const graph = filter.prepare(
      '0:v',
      'v0',
      item({ x: { from: -180, to: 180 } }),
    )

    assert.match(
      graph,
      new RegExp(
        `overlay=x='\\(main_w-overlay_w\\)/2\\+\\(-180\\+\\(360\\)\\*${escapeRegex(progress)}\\)':y='\\(main_h-overlay_h\\)/2':shortest=1`,
      ),
    )
  })

  it('animates pan from/to as the same overlay offset as x/y', () => {
    const positioned = filter.prepare(
      '0:v',
      'v0',
      item({
        x: { from: 0, to: 150 },
        y: { from: 0, to: 50 },
      }),
    )
    const panned = filter.prepare(
      '0:v',
      'v0',
      item({
        pan: {
          from: { x: 0, y: 0 },
          to: { x: 150, y: 50 },
        },
      }),
    )

    assert.equal(positioned, panned)
  })

  it('adds animated position and pan in the overlay expression', () => {
    const graph = filter.prepare(
      '0:v',
      'v0',
      item({
        x: { from: 0, to: 100 },
        y: { from: 0, to: 50 },
        pan: {
          from: { x: 0, y: 0 },
          to: { x: 50, y: 25 },
        },
      }),
    )

    assert.match(
      graph,
      new RegExp(
        `overlay=x='\\(main_w-overlay_w\\)/2\\+\\(150\\*${escapeRegex(progress)}\\)':y='\\(main_h-overlay_h\\)/2\\+\\(75\\*${escapeRegex(progress)}\\)'`,
      ),
    )
  })

  it('keeps crop static in front of an animated scale', () => {
    const steps = filterSteps(
      filter.prepare(
        '0:v',
        'v0',
        item({
          crop: { width: 1100, height: 950, x: 0, y: 0 },
          scale: { from: 1, to: 1.2 },
        }),
      ),
    )

    assert.equal(
      steps[0],
      '[0:v]crop=1100:950:0:0,scale=1920:1080:force_original_aspect_ratio=decrease,setsar=1[v0fit]',
    )
    assert.match(steps[1] ?? '', /scale=w='trunc\(iw\*/)
  })

  it('builds a concat filter from scene labels', () => {
    assert.equal(
      filter.concat(['[v0]', '[v1]', '[v2]']),
      '[v0][v1][v2]concat=n=3:v=1:a=0[vout]',
    )
  })

  it('builds an xfade between two labeled streams', () => {
    const result = filter.xfade('v0', 'v1', 'vout', 1, 4)

    assert.match(result, /\[v0\]settb=AVTB\[vouta\]/)
    assert.match(result, /\[v1\]settb=AVTB\[voutb\]/)
    assert.match(result, /xfade=transition=fade:duration=1:offset=4\[vout\]/)
  })

  it('builds fade out and fade in filters', () => {
    assert.equal(
      filter.fadeOut('v0', 'fo1', 4, 1),
      '[v0]fade=t=out:st=4:d=1:c=black[fo1]',
    )
    assert.equal(
      filter.fadeIn('v1', 'fi1', 1),
      '[v1]fade=t=in:st=0:d=1:c=black[fi1]',
    )
  })
})
