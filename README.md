# Discord Bot TypeScript Template

A production-oriented Discord bot starter using TypeScript, `discord.js`, TypeORM, SQLite, Jest, and dependency injection through a small application context. It supports slash commands only and contains no project-specific behavior beyond two replaceable examples.

## Requirements

- Node.js 22 or newer
- A Discord application and bot token
- A development Discord server for fast guild-scoped command updates
- Docker Compose, which supplies the required Redis service

## Quick start

1. Copy `.env.example` to `.env.development` and replace the Discord placeholders. The resulting file is ignored by Git.
2. Install dependencies and deploy the development commands:

   ```sh
   npm install
   npm run commands:deploy:guild
   ```

3. Build and start the bot, Redis, and persistent volumes:

   ```sh
   docker compose up --build -d
   ```

SQLite is embedded in the bot rather than hosted by a separate database server. Compose mounts its file at `/app/data/bot.sqlite` using the `bot-data` volume. Redis runs as a separate service using the `redis-data` volume. Pending TypeORM migrations run before Discord connects.

For native hot-reload development, start only Redis and run the bot on the host:

```sh
npm install
docker compose up redis -d
npm run commands:deploy:guild
npm run dev
```

## Environment behavior

| Environment | Configuration source                                 | Default database    | Command deployment |
| ----------- | ---------------------------------------------------- | ------------------- | ------------------ |
| Development | `.env.development`, then existing environment values | `./data/bot.sqlite` | Guild-scoped       |
| Test        | Explicit values with injected Redis doubles          | `:memory:`          | Not used           |
| Production  | `process.env` only                                   | `./data/bot.sqlite` | Global             |

`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `REDIS_URL` are required. `REDIS_URL` must use `redis://` or `rediss://`. `DISCORD_GUILD_ID` is required only for guild deployment. `DATABASE_PATH` and `LOG_LEVEL` are optional. Zod validates configuration and startup fails before connecting when values are invalid. Startup also fails if Redis cannot be reached after bounded retries.

Never commit `.env`, `.env.development`, tokens, or application secrets. Production values should be injected by the host or GitHub Secrets.

## Architecture

```text
src/
  commands/{admin,general}/
  config/
  container/
  database/{entities,migrations,repositories}/
  events/
  handlers/
  redis/
  services/
  types/
  utils/
  bootstrap.ts
  client.ts
  index.ts
scripts/
tests/
.github/workflows/
```

- Commands are injectable classes with static Discord definitions. They validate Discord-specific input, call an injected service, and format the response.
- Handlers and events are injectable classes. The loaders resolve them through an application-scoped TSyringe child container.
- Services and repositories declare concrete dependencies in their constructors and are auto-resolved. Adding a normal stateless service requires no change to `bootstrap.ts` or a central service interface.
- `src/container` registers only infrastructure values, non-class tokens, and special lifetimes. The container is confined to bootstrap and loaders, preventing service-locator calls from application code.
- Static command definitions can be deployed without constructing commands or initializing their runtime dependencies.
- Command cooldowns use Redis atomic set-with-expiry operations, sharing cooldown state safely across bot replicas.
- The TypeORM data source explicitly disables schema synchronization. Schema changes belong in migrations.

## Adding a slash command

Create a default-exported injectable command class under a category in `src/commands/`. The recursive loader finds and resolves it automatically:

```ts
import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { injectable } from 'tsyringe';
import { ExampleService } from '../../services/example.service';
import type { CommandExecutor, CommandMetadata } from '../../types';

@injectable()
export default class ExampleCommand implements CommandExecutor {
  static readonly data = new SlashCommandBuilder()
    .setName('example')
    .setDescription('Run an example');

  static readonly metadata: CommandMetadata = {
    category: 'general',
    enabled: true,
    guildOnly: false,
    cooldownSeconds: 5,
    requiredUserPermissions: [PermissionFlagsBits.SendMessages],
  };

  constructor(private readonly examples: ExampleService) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const result = await this.examples.run();
    await interaction.reply(result);
  }
}
```

Run `npm run commands:deploy:guild` after definition changes in development. Reserve `npm run commands:deploy` for production because global propagation can take longer.

## Adding dependencies

Decorate concrete services and repositories with `@injectable()` and declare their dependencies in the constructor. TSyringe can resolve concrete classes without adding them to a central list:

```ts
@injectable()
export class ExampleService {
  constructor(private readonly settings: GuildSettingsRepository) {}
}
```

Add a container registration only when a dependency is an interface, configuration value, factory function, existing external instance, or requires a non-transient lifetime. Use a symbol in `src/container/tokens.ts` for interface and value tokens. Do not import or resolve the container from commands, services, repositories, or events.

## Database migrations

The included guild settings entity and repository are deliberately small examples.

```sh
npm run migration:create -- src/database/migrations/AddFeature
npm run migration:generate -- src/database/migrations/AddFeature
npm run migration:run
npm run migration:revert
```

TypeORM CLI commands load `.env.development` outside production and otherwise use `process.env`. Review generated migrations before committing them. Startup also applies pending migrations, keeping container deployments self-contained.

## Scripts

| Script                                    | Purpose                                     |
| ----------------------------------------- | ------------------------------------------- |
| `npm run dev`                             | Hot reload using `.env.development`         |
| `npm run build` / `npm start`             | Compile and run production JavaScript       |
| `npm test` / `npm run test:watch`         | Run Jest once or in watch mode              |
| `npm run test:coverage`                   | Generate V8 coverage in `coverage/`         |
| `npm run lint` / `npm run lint:fix`       | Check or fix ESLint findings                |
| `npm run format` / `npm run format:check` | Write or verify Prettier formatting         |
| `npm run commands:deploy:guild`           | Register commands in the development guild  |
| `npm run commands:deploy`                 | Register global production commands         |
| `npm run migration:*`                     | Create, generate, run, or revert migrations |

## Testing

Commands are instantiated directly with mocked constructor dependencies and small mocked interactions; no websocket or DI container is necessary. Services use mocked repositories and Redis connections. Container tests verify automatic resolution and application-scoped lifetimes. Database tests use in-memory SQLite with real migrations. The offline bootstrap test injects a Redis double and exercises automatic loading plus graceful Redis/database shutdown.

## Production deployment

CI checks formatting, linting, tests with coverage, and the production build. The deployment workflow runs manually or for a published GitHub Release. It repeats release checks, registers global commands, and publishes a non-root production image to GitHub Container Registry.

Create a protected GitHub environment named `production` with these secrets:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `REDIS_URL`

Configure the container host to pull the GHCR image and inject those values at runtime. Mount persistent storage at `/app/data`, or point `DATABASE_PATH` at another persistent mount. Startup applies migrations; SIGINT and SIGTERM close Discord, Redis, and SQLite cleanly. The included Compose stack provides Redis and both named volumes for a single-host deployment.

```sh
docker build -t discord-bot-template .
docker run --rm \
  -e DISCORD_TOKEN \
  -e DISCORD_CLIENT_ID \
  -e REDIS_URL \
  -v discord-bot-data:/app/data \
  discord-bot-template
```
