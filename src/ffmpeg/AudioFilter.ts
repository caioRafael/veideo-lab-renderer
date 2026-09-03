import type { AbsoluteAudio } from '../interfaces/absolute-audio'

export class AudioFilter {
  private readonly totalSeconds: number

  constructor(totalSeconds: number) {
    this.totalSeconds = totalSeconds
  }

  prepare(
    inputLabel: string,
    outputLabel: string,
    clip: AbsoluteAudio,
  ): string {
    const delayMs = Math.round(clip.start * 1000)
    return (
      `[${inputLabel}]` +
      [
        `atrim=0:${clip.duration}`,
        'asetpts=PTS-STARTPTS',
        `volume=${clip.volume}`,
        `adelay=${delayMs}|${delayMs}`,
        `apad=whole_dur=${this.totalSeconds}`,
        'aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo',
      ].join(',') +
      `[${outputLabel}]`
    )
  }
}
