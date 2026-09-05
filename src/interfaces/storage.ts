export interface Storage {
  put(key: string, sourcePath: string): Promise<string>
  write(key: string, contents: string): Promise<string>
  read(key: string): Promise<string>
  get(key: string): Promise<string>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  list(): Promise<string[]>
}
