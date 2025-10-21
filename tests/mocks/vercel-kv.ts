export const kv = {
  get: async <T = unknown>(_key: string): Promise<T | null> => null,
  set: async (_key: string, _value: unknown, _opts?: unknown): Promise<void> => {},
  del: async (_key: string): Promise<void> => {},
  hset: async (_key: string, _value: Record<string, unknown>): Promise<void> => {},
  keys: async (_pattern: string): Promise<string[]> => [],
};

