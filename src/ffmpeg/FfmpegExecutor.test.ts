import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SpawnFfmpegExecutor } from './FfmpegExecutor'

describe('SpawnFfmpegExecutor', () => {
  it('resolves when the process exits with code 0', async () => {
    const executor = new SpawnFfmpegExecutor(process.execPath)
    await executor.execute(['-e', 'process.exit(0)'])
  })

  it('rejects when the process exits with a non-zero code', async () => {
    const executor = new SpawnFfmpegExecutor(process.execPath)

    await assert.rejects(
      () => executor.execute(['-e', 'process.exit(3)']),
      /exited with code 3/,
    )
  })

  it('rejects when the executable does not exist', async () => {
    const executor = new SpawnFfmpegExecutor('video-lab-missing-ffmpeg-binary')

    await assert.rejects(
      () => executor.execute([]),
      /Executable not found: video-lab-missing-ffmpeg-binary/,
    )
  })
})
