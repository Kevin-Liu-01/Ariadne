/** Exhaustiveness guard for discriminated unions. Adding a case without handling it fails the type check. */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
