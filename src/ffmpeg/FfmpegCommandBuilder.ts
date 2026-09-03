import {
  getAudioItems,
  getOverlayItems,
  getTextItems,
  getVideoTrack,
  type AudioItem,
  type OverlayItem,
  type RenderPlan,
  type TextItem,
  type VideoItem,
} from '../interfaces/render-plan'
import { AudioFilter } from './AudioFilter'
import { OverlayFilter } from './OverlayFilter'
import { TextFilter } from './TextFilter'
import { VideoFilter } from './VideoFilter'

export class FfmpegCommandBuilder {
  build(plan: RenderPlan): string[] {
    const videoItems = getVideoTrack(plan)?.items ?? []
    const overlayItems = getOverlayItems(plan)
    const textItems = getTextItems(plan)
    const audioItems = getAudioItems(plan)

    const videoFilter = new VideoFilter(plan.width, plan.height, plan.fps)
    const audioFilter = new AudioFilter(plan.duration)
    const overlayFilter = new OverlayFilter()
    const textFilter = new TextFilter()

    const args: string[] = ['-y']
    const filterParts: string[] = []
    const videoLabels: string[] = []

    for (const [index, item] of videoItems.entries()) {
      this.pushVideoInput(args, item)
      const outputLabel = `v${index}`
      filterParts.push(videoFilter.scale(`${index}:v`, outputLabel))
      videoLabels.push(`[${outputLabel}]`)
    }

    for (const item of overlayItems) {
      args.push('-loop', '1', '-t', String(plan.duration), '-i', item.source)
    }

    const audioInputOffset = videoItems.length + overlayItems.length

    if (audioItems.length === 0) {
      args.push(
        '-f',
        'lavfi',
        '-t',
        String(plan.duration),
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=44100',
      )
    } else {
      for (const item of audioItems) {
        args.push('-i', item.source)
      }
    }

    const hasVisualLayers = overlayItems.length > 0 || textItems.length > 0
    const concatLabel = hasVisualLayers ? 'vbase' : 'vout'
    filterParts.push(videoFilter.concat(videoLabels, concatLabel))

    this.pushOverlayFilters(
      filterParts,
      overlayFilter,
      overlayItems,
      videoItems.length,
      textItems.length === 0,
    )
    this.pushTextFilters(
      filterParts,
      textFilter,
      textItems,
      overlayItems.length,
    )

    this.pushAudioFilters(
      filterParts,
      audioFilter,
      audioItems,
      audioInputOffset,
    )

    args.push(
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[vout]',
      '-map',
      '[aout]',
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-t',
      String(plan.duration),
      '-pix_fmt',
      'yuv420p',
      plan.outputPath,
    )

    return args
  }

  private pushVideoInput(args: string[], item: VideoItem): void {
    if (item.mediaType === 'image') {
      args.push('-loop', '1', '-t', String(item.duration), '-i', item.source)
      return
    }

    args.push('-t', String(item.duration), '-i', item.source)
  }

  private pushOverlayFilters(
    filterParts: string[],
    overlayFilter: OverlayFilter,
    overlayItems: OverlayItem[],
    videoInputCount: number,
    isLastVisualStage: boolean,
  ): void {
    let mainLabel = 'vbase'

    for (const [index, item] of overlayItems.entries()) {
      const scaledLabel = `ov${index}`
      const isLast = isLastVisualStage && index === overlayItems.length - 1
      const outputLabel = isLast ? 'vout' : `ovl${index}`
      filterParts.push(
        overlayFilter.scale(`${videoInputCount + index}:v`, scaledLabel, item),
      )
      filterParts.push(
        overlayFilter.overlay(mainLabel, scaledLabel, outputLabel, item),
      )
      mainLabel = outputLabel
    }
  }

  private pushTextFilters(
    filterParts: string[],
    textFilter: TextFilter,
    textItems: TextItem[],
    overlayCount: number,
  ): void {
    let inputLabel = overlayCount > 0 ? `ovl${overlayCount - 1}` : 'vbase'

    for (const [index, item] of textItems.entries()) {
      const isLast = index === textItems.length - 1
      const outputLabel = isLast ? 'vout' : `txt${index}`
      filterParts.push(textFilter.apply(inputLabel, outputLabel, item))
      inputLabel = outputLabel
    }
  }

  private pushAudioFilters(
    filterParts: string[],
    audioFilter: AudioFilter,
    audioItems: AudioItem[],
    audioInputOffset: number,
  ): void {
    if (audioItems.length === 0) {
      filterParts.push(audioFilter.silence(`${audioInputOffset}:a`, 'aout'))
      return
    }

    if (audioItems.length === 1) {
      const item = audioItems[0]
      if (!item) {
        throw new Error('Expected a single audio item')
      }
      filterParts.push(
        audioFilter.prepare(`${audioInputOffset}:a`, 'aout', item),
      )
      return
    }

    const audioLabels: string[] = []
    for (const [index, item] of audioItems.entries()) {
      const outputLabel = `a${index}`
      filterParts.push(
        audioFilter.prepare(`${audioInputOffset + index}:a`, outputLabel, item),
      )
      audioLabels.push(`[${outputLabel}]`)
    }
    filterParts.push(audioFilter.mix(audioLabels, 'aout'))
  }
}
