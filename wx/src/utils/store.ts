const memoryStore = new Map<string, unknown>()

export function setStore<T>(key: string, value: T) {
  memoryStore.set(key, value)
}

export function getStore<T>(key: string): T | undefined {
  return memoryStore.get(key) as T | undefined
}

export function removeStore(key: string) {
  memoryStore.delete(key)
}

export function clearStore() {
  memoryStore.clear()
}
