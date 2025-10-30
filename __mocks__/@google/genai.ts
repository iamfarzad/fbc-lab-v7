export class GoogleGenAI {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_: { apiKey: string }) {}

  // Minimal surface used in tests; extend when needed
  models() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      embedContent: async (_args?: unknown) => ({ embeddings: [{ values: [0] }] }),
    }
  }
}


