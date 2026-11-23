import { MessageFlags, type UserContextMenuCommandInteraction } from 'discord.js';

import UserInfoMenu from '../../src/commands/context/user-info';

describe('User Info menu', () => {
  it('replies privately with the target user details', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const interaction = {
      isUserContextMenuCommand: () => true,
      targetUser: { tag: 'kitten', id: '42', createdAt: new Date(1_000_000_000) },
      reply,
    } as unknown as UserContextMenuCommandInteraction;

    await new UserInfoMenu().execute(interaction);

    expect(reply).toHaveBeenCalledWith({
      content: '**kitten**\nID: `42`\nAccount created <t:1000000:R>',
      flags: MessageFlags.Ephemeral,
    });
  });
});
