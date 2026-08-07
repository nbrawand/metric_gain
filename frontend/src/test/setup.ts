import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

/**
 * jsdom in this version exposes `localStorage` as an object with no methods, so
 * anything using zustand's `persist` — the auth store and the offline sync
 * queue — throws on import. An in-memory Storage keeps those testable.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(window, name, {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  // Persisted state must not leak between tests
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// Testing Library does not auto-clean under globals:true in every version, and
// a leaked DOM makes the next test's queries match the previous test's markup.
afterEach(() => {
  cleanup();
});
