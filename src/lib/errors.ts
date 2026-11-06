/** An error whose message is safe to show to the user (validation, rule checks done in the client). */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Shows our own messages as they are; anything else (network, permissions) gets the fallback. */
export function friendlyError(err: unknown, fallback: string): string {
  return err instanceof ValidationError ? err.message : fallback;
}
