import fs from 'node:fs'
import path from 'node:path'
import type { Storage } from '../interfaces/storage'

export class LocalFileStorage implements Storage {
  private readonly rootDir: string

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir)
  }

  async put(key: string, sourcePath: string): Promise<string> {
    const dest = this.resolveKey(key)
    await fs.promises.mkdir(path.dirname(dest), { recursive: true })
    await fs.promises.copyFile(sourcePath, dest)
    return dest
  }

  async write(key: string, contents: string): Promise<string> {
    const dest = this.resolveKey(key)
    await fs.promises.mkdir(path.dirname(dest), { recursive: true })
    await fs.promises.writeFile(dest, contents, 'utf8')
    return dest
  }

  async read(key: string): Promise<string> {
    const dest = this.resolveKey(key)
    if (!fs.existsSync(dest)) {
      throw new Error(`Storage key not found: ${key}`)
    }

    return fs.promises.readFile(dest, 'utf8')
  }

  async get(key: string): Promise<string> {
    const dest = this.resolveKey(key)
    if (!fs.existsSync(dest)) {
      throw new Error(`Storage key not found: ${key}`)
    }

    return dest
  }

  async delete(key: string): Promise<void> {
    const dest = this.resolveKey(key)
    await fs.promises.rm(dest, { recursive: true, force: true })
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.resolveKey(key))
  }

  async list(): Promise<string[]> {
    if (!fs.existsSync(this.rootDir)) {
      return []
    }

    const entries = await fs.promises.readdir(this.rootDir, {
      withFileTypes: true,
    })
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  }

  private resolveKey(key: string): string {
    const resolved = path.resolve(this.rootDir, key)
    const root = this.rootDir.endsWith(path.sep)
      ? this.rootDir
      : `${this.rootDir}${path.sep}`

    if (resolved !== this.rootDir && !resolved.startsWith(root)) {
      throw new Error(`Invalid storage key: ${key}`)
    }

    return resolved
  }
}
