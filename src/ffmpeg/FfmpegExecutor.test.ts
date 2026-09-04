import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { RenderCancelledError } from '../renderer/RenderCancelledError'
import { SpawnFfmpegExecutor } from './FfmpegExecutor'
import { FfmpegProcessError } from './FfmpegProcessError'

describe('SpawnFfmpegExecutor', () => {
  it('resolves when the process exits with code 0', async () => {
    const executor = new SpawnFfmpegExecutor(process.execPath)
    await executor.execute(['-e', 'process.exit(0)'])
  })

  it('rejects when the process exits with a non-zero code', async () => {
    const executor = new SpawnFfmpegExecutor(process.execPath)

    await assert.rejects(
      () => executor.execute(['-e', 'process.exit(3)']),
      (error: unknown) => {
        assert.ok(error instanceof FfmpegProcessError)
        assert.equal(error.exitCode, 3)
        assert.match(error.message, /exit code 3/)
        return true
      },
    )
  })

  it('preserves stderr on failure', async () => {
    const executor = new SpawnFfmpegExecutor(process.execPath)

    await assert.rejects(
      () =>
        executor.execute([
          '-e',
          'console.error("filter graph exploded"); process.exit(2)',
        ]),
      (error: unknown) => {
        assert.ok(error instanceof FfmpegProcessError)
        assert.match(error.stderr, /filter graph exploded/)
        assert.match(error.message, /filter graph exploded/)
        return true
      },
    )
  })

  it('rejects when the executable does not exist', async () => {
    const executor = new SpawnFfmpegExecutor('video-lab-missing-ffmpeg-binary')

    await assert.rejects(
      () => executor.execute([]),
      /Executable not found: video-lab-missing-ffmpeg-binary/,
    )
  })

  it('rejects when aborted before the process starts', async () => {
    const executor = new SpawnFfmpegExecutor(process.execPath)
    const controller = new AbortController()
    controller.abort()

    await assert.rejects(
      () =>
        executor.execute(['-e', 'process.exit(0)'], {
          signal: controller.signal,
        }),
      (error: unknown) => error instanceof RenderCancelledError,
    )
  })

  it('rejects and stops the process when aborted during execution', async () => {
    const executor = new SpawnFfmpegExecutor(process.execPath)
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 40)

    await assert.rejects(
      () =>
        executor.execute(['-e', 'setTimeout(() => {}, 10000)'], {
          signal: controller.signal,
        }),
      (error: unknown) => error instanceof RenderCancelledError,
    )
  })
})
