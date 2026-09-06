import type {
  ChatInputCommandInteraction,
  PermissionResolvable,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

import type { AppContext } from './context';

export interface CommandMetadata {
  readonly category: string;
  readonly cooldownSeconds?: number;
  readonly guildOnly?: boolean;
  readonly enabled?: boolean;
  readonly requiredUserPermissions?: readonly PermissionResolvable[];
  readonly requiredBotPermissions?: readonly PermissionResolvable[];
}

export interface SlashCommand {
  readonly data: {
    readonly name: string;
    toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
  };
  readonly metadata: CommandMetadata;
  execute(interaction: ChatInputCommandInteraction, context: AppContext): Promise<void>;
}
