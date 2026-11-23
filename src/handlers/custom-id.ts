export const CUSTOM_ID_SEPARATOR = ':';
export const MAX_CUSTOM_ID_LENGTH = 100;

export interface ParsedCustomId {
  readonly prefix: string;
  readonly args: readonly string[];
}

/**
 * Builds a component custom ID such as `ticket-close:123`. The prefix routes the
 * interaction to its handler; the args carry state, since Discord stores nothing else.
 */
export function createCustomId(prefix: string, ...args: readonly string[]): string {
  if (prefix.length === 0) throw new Error('Custom ID prefix cannot be empty');
  for (const part of [prefix, ...args]) {
    if (part.includes(CUSTOM_ID_SEPARATOR)) {
      throw new Error(`Custom ID parts cannot contain "${CUSTOM_ID_SEPARATOR}": ${part}`);
    }
  }

  const customId = [prefix, ...args].join(CUSTOM_ID_SEPARATOR);
  if (customId.length > MAX_CUSTOM_ID_LENGTH) {
    throw new Error(
      `Custom ID is longer than ${String(MAX_CUSTOM_ID_LENGTH)} characters: ${customId}`,
    );
  }
  return customId;
}

export function parseCustomId(customId: string): ParsedCustomId {
  const [prefix = '', ...args] = customId.split(CUSTOM_ID_SEPARATOR);
  return { prefix, args };
}
