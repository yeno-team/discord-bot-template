import type { ComponentHandler, ComponentKind } from '../types';
import { CUSTOM_ID_SEPARATOR } from './custom-id';

/** Looks up component handlers by kind and custom ID prefix. */
export class ComponentRegistry {
  private readonly handlers = new Map<string, ComponentHandler>();

  public constructor(handlers: readonly ComponentHandler[]) {
    for (const handler of handlers) {
      if (handler.prefix.length === 0 || handler.prefix.includes(CUSTOM_ID_SEPARATOR)) {
        throw new Error(
          `Invalid ${handler.kind} prefix "${handler.prefix}": it must be non-empty and cannot contain "${CUSTOM_ID_SEPARATOR}"`,
        );
      }
      const key = ComponentRegistry.key(handler.kind, handler.prefix);
      if (this.handlers.has(key)) {
        throw new Error(`Duplicate ${handler.kind} handler prefix: ${handler.prefix}`);
      }
      this.handlers.set(key, handler);
    }
  }

  public get size(): number {
    return this.handlers.size;
  }

  public get(kind: ComponentKind, prefix: string): ComponentHandler | undefined {
    return this.handlers.get(ComponentRegistry.key(kind, prefix));
  }

  private static key(kind: ComponentKind, prefix: string): string {
    return `${kind}${CUSTOM_ID_SEPARATOR}${prefix}`;
  }
}
