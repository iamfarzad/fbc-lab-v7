/**
 * Runtime shim: add a getter `errors` -> `issues` on ZodError prototype.
 * Safe to import multiple times (defineProperty is idempotent via getter check).
 */
import { ZodError } from "zod";
const proto = (ZodError as unknown as { prototype: Record<string, unknown> }).prototype;
if (proto && !Object.prototype.hasOwnProperty.call(proto, "errors")) {
  Object.defineProperty(proto, "errors", {
    get() {
      // `this` is the ZodError instance; it always has `.issues`
      return (this as any).issues;
    },
    configurable: true,
  });
}
