import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';

import { createCommand, toCommandCollection } from '../../src/handlers';
import type { CommandMetadata } from '../../src/types';

class GreetCommand {
  public static readonly data = new SlashCommandBuilder()
    .setName('greet')
    .setDescription('Greet someone');

  public static readonly metadata: CommandMetadata = { category: 'test' };

  public constructor(private readonly greeting: string) {}

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: this.greeting });
  }
}

describe('command registry', () => {
  it('creates a command with its constructor dependencies', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const command = createCommand(GreetCommand, 'Hello!');

    await command.execute({ reply } as unknown as ChatInputCommandInteraction);

    expect(command.data.name).toBe('greet');
    expect(reply).toHaveBeenCalledWith({ content: 'Hello!' });
  });

  it('rejects duplicate command names', () => {
    const command = createCommand(GreetCommand, 'Hello!');

    expect(() => toCommandCollection([command, command])).toThrow(
      'Duplicate slash command name: greet',
    );
  });
});
