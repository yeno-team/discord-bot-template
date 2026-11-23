import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';

import {
  createCommand,
  createContextMenu,
  toCommandCollection,
  toContextMenuCollection,
} from '../../src/handlers';
import type { CommandMetadata, ContextMenuInteraction } from '../../src/types';

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

class ColorCommand {
  public static readonly data = new SlashCommandBuilder()
    .setName('color')
    .setDescription('Pick a color')
    .addStringOption((option) =>
      option.setName('name').setDescription('Color').setAutocomplete(true),
    );

  public static readonly metadata: CommandMetadata = { category: 'test' };

  public constructor(private readonly colors: readonly string[]) {}

  public async execute(): Promise<void> {
    // Not needed for this test.
  }

  public async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const typed = interaction.options.getFocused().toLowerCase();
    await interaction.respond(
      this.colors
        .filter((color) => color.startsWith(typed))
        .map((color) => ({ name: color, value: color })),
    );
  }
}

function menu(type: ApplicationCommandType.User | ApplicationCommandType.Message) {
  return class {
    public static readonly data = new ContextMenuCommandBuilder().setName('Inspect').setType(type);
    public static readonly metadata: CommandMetadata = { category: 'test' };
    public constructor(private readonly label: string) {}
    public async execute(interaction: ContextMenuInteraction): Promise<void> {
      await interaction.reply({ content: this.label });
    }
  };
}

describe('command registry', () => {
  it('creates a command with its constructor dependencies', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const command = createCommand(GreetCommand, 'Hello!');

    await command.execute({ reply } as unknown as ChatInputCommandInteraction);

    expect(command.data.name).toBe('greet');
    expect('autocomplete' in command).toBe(false);
    expect(reply).toHaveBeenCalledWith({ content: 'Hello!' });
  });

  it('keeps a command autocomplete bound to its instance', async () => {
    const respond = jest.fn().mockResolvedValue(undefined);
    const command = createCommand(ColorCommand, ['red', 'green', 'rose']);
    const interaction = {
      options: { getFocused: () => 'R' },
      respond,
    } as unknown as AutocompleteInteraction;

    await command.autocomplete?.(interaction);

    expect(respond).toHaveBeenCalledWith([
      { name: 'red', value: 'red' },
      { name: 'rose', value: 'rose' },
    ]);
  });

  it('rejects duplicate command names', () => {
    const command = createCommand(GreetCommand, 'Hello!');

    expect(() => toCommandCollection([command, command])).toThrow(
      'Duplicate slash command name: greet',
    );
  });

  it('creates a context menu with its constructor dependencies', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const created = createContextMenu(menu(ApplicationCommandType.User), 'Inspected');

    await created.execute({ reply } as unknown as ContextMenuInteraction);

    expect(reply).toHaveBeenCalledWith({ content: 'Inspected' });
  });

  it('allows a user and a message menu to share a name, but not two of one type', () => {
    const user = createContextMenu(menu(ApplicationCommandType.User), 'a');
    const message = createContextMenu(menu(ApplicationCommandType.Message), 'b');

    expect(toContextMenuCollection([user, message]).size).toBe(2);
    expect(() => toContextMenuCollection([user, user])).toThrow(
      'Duplicate context menu name: Inspect',
    );
  });
});
