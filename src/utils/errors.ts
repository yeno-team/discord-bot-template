export class UserFacingError extends Error {
  public constructor(
    message: string,
    public readonly ephemeral = true,
  ) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
