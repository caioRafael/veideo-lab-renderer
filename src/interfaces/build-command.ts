export interface MediaPaths {
  images: string
  audios: string
  videos: string
  outputVideos: string
}

export interface BuildCommandOptions {
  composition: unknown
  mediaPaths: MediaPaths
}
