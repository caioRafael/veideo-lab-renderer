export interface CompositionDefaults {
  output: string
  width: number
  height: number
  fps: number
  textFontSize: number
  textColor: string
}

export const COMPOSITION_DEFAULTS: CompositionDefaults = {
  output: 'output.mp4',
  width: 1920,
  height: 1080,
  fps: 25,
  textFontSize: 48,
  textColor: '#FFFFFF',
}
