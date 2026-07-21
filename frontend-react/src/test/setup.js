// vitest's jsdom environment only copies a fixed key list onto the test
// global (see vitest's populateGlobal/getWindowKeys) and never includes
// localStorage/sessionStorage, since jsdom implements them as prototype
// getters rather than own properties. Without this, window.localStorage
// is undefined in every test even though jsdom's real Window instance has
// a working implementation. Polyfill with the same in-memory semantics.
function createStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
}

if (typeof window !== 'undefined' && !window.localStorage) {
  window.localStorage = createStorage();
}
if (typeof window !== 'undefined' && !window.sessionStorage) {
  window.sessionStorage = createStorage();
}
