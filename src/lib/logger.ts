// eslint-disable-next-line no-console
export const logger = {
  debug: (...a: unknown[]) => {
    if (process.env.NODE_ENV !== "production") console.debug(...a);
  },
  info: (...a: unknown[]) => {
    if (process.env.NODE_ENV !== "production") console.info(...a);
  },
  warn: (...a: unknown[]) => console.warn(...a),
  error: (...a: unknown[]) => console.error(...a),
};
