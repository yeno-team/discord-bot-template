import path from 'node:path';

import { REST, Routes } from 'discord.js';

import { ConfigError, loadConfig } from '../src/config';
import { loadCommandDefinitions } from '../src/handlers';
import { toError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';

async function deploy(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logging);
  const guildScoped = process.argv.includes('--guild');

  if (guildScoped && config.discord.guildId === undefined) {
    throw new ConfigError(['DISCORD_GUILD_ID: required for guild command deployment']);
  }

  const commands = await loadCommandDefinitions(path.resolve(__dirname, '../src/commands'), logger);
  const payload = commands
    .filter((command) => command.metadata.enabled !== false)
    .map((command) => command.data.toJSON());
  const guildId = config.discord.guildId;
  const route =
    guildScoped && guildId !== undefined
      ? Routes.applicationGuildCommands(config.discord.clientId, guildId)
      : Routes.applicationCommands(config.discord.clientId);

  const rest = new REST({ version: '10' }).setToken(config.discord.token);
  await rest.put(route, { body: payload });
  logger.info(
    { commandCount: payload.length, scope: guildScoped ? 'guild' : 'global' },
    'Slash commands deployed',
  );
}

void deploy().catch((thrown: unknown) => {
  process.stderr.write(`${toError(thrown).message}\n`);
  process.exitCode = 1;
});
