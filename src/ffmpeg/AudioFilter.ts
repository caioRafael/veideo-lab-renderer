export interface AudioFilterClip {
  start: number
  duration: number
  volume: number
}

export class AudioFilter {
  private readonly totalSeconds: number

  constructor(totalSeconds: number) {
    this.totalSeconds = totalSeconds
  }

  prepare(
    inputLabel: string,
    outputLabel: string,
    clip: AudioFilterClip,
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

  silence(inputLabel: string, outputLabel: string): string {
    return `[${inputLabel}]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[${outputLabel}]`
  }

  mix(audioLabels: string[], outputLabel: string): string {
    return `${audioLabels.join('')}amix=inputs=${audioLabels.length}:duration=first:dropout_transition=0:normalize=0[${outputLabel}]`
  }
}
