import { ComponentRegistry } from '../../src/handlers';
import type { ComponentHandler } from '../../src/types';

function handler(kind: ComponentHandler['kind'], prefix: string): ComponentHandler {
  return { kind, prefix, execute: jest.fn() };
}

describe('ComponentRegistry', () => {
  it('finds handlers by kind and prefix', () => {
    const button = handler('button', 'ticket');
    const modal = handler('modal', 'ticket');
    const registry = new ComponentRegistry([button, modal]);

    expect(registry.size).toBe(2);
    expect(registry.get('button', 'ticket')).toBe(button);
    expect(registry.get('modal', 'ticket')).toBe(modal);
    expect(registry.get('selectMenu', 'ticket')).toBeUndefined();
  });

  it('rejects duplicate prefixes of the same kind', () => {
    expect(
      () => new ComponentRegistry([handler('button', 'ticket'), handler('button', 'ticket')]),
    ).toThrow('Duplicate button handler prefix: ticket');
  });

  it.each(['', 'ticket:close'])('rejects the invalid prefix "%s"', (prefix) => {
    expect(() => new ComponentRegistry([handler('button', prefix)])).toThrow('Invalid button');
  });
});
