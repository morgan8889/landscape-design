// Vitest global setup file
// Node.js 25 introduces a built-in localStorage that fails when --localstorage-file
// is not a valid path. This setup replaces it with an in-memory implementation
// so browser-environment tests work correctly without a real DOM.

class InMemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key)
      ? this.store[key]
      : null;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
}

// Only override if the global localStorage is broken (Node.js 25 built-in)
if (
  typeof localStorage === "undefined" ||
  typeof localStorage.setItem !== "function"
) {
  Object.defineProperty(globalThis, "localStorage", {
    value: new InMemoryStorage(),
    writable: true,
    configurable: true,
  });
}
