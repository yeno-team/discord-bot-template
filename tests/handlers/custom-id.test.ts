import { createCustomId, parseCustomId } from '../../src/handlers';

describe('custom IDs', () => {
  it('round-trips a prefix and args', () => {
    const customId = createCustomId('ticket', 'close', '42');

    expect(customId).toBe('ticket:close:42');
    expect(parseCustomId(customId)).toEqual({ prefix: 'ticket', args: ['close', '42'] });
  });

  it('parses a prefix with no args', () => {
    expect(parseCustomId('ping-refresh')).toEqual({ prefix: 'ping-refresh', args: [] });
  });

  it('rejects an empty prefix', () => {
    expect(() => createCustomId('')).toThrow('prefix cannot be empty');
  });

  it('rejects parts containing the separator', () => {
    expect(() => createCustomId('ticket', 'a:b')).toThrow('cannot contain ":"');
  });

  it("rejects IDs longer than Discord's 100 character limit", () => {
    expect(() => createCustomId('ticket', 'x'.repeat(100))).toThrow('longer than 100');
  });
});
