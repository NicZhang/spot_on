const memoryStore = new Map();
export function setStore(key, value) {
    memoryStore.set(key, value);
}
export function getStore(key) {
    return memoryStore.get(key);
}
export function removeStore(key) {
    memoryStore.delete(key);
}
export function clearStore() {
    memoryStore.clear();
}
