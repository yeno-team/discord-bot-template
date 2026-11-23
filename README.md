# Discord Bot TypeScript Template

A production-oriented Discord bot starter using TypeScript, `discord.js`, TypeORM, SQLite, Jest, and plain constructor injection wired in one composition root. It supports slash commands only and contains no project-specific behavior beyond two replaceable examples.

Use GitHub's **Use this template** button or clone the repository, then rename the package and replace the example commands with your bot's features. Deployment is opt-in and cannot run from the untouched template.

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

`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `REDIS_URL` are required. `REDIS_URL` must use `redis://` or `rediss://`. `DISCORD_GUILD_ID` is required only for guild deployment. `DATABASE_PATH`, `LOG_LEVEL`, and `HEALTHCHECK_FILE` are optional. Zod validates configuration and startup fails before connecting when values are invalid. Startup fails if Redis cannot be reached after bounded retries. After the first connection, the bot keeps reconnecting with capped backoff; commands that need Redis fail immediately with an error reply during an outage and work again once Redis returns, without restarting the bot.

Never commit `.env`, `.env.development`, tokens, or application secrets. Production values should be injected by the host or GitHub Secrets.

## Architecture

```text
src/
  app/
  commands/{admin,context,general}/
  components/general/
  config/
  database/{entities,migrations,repositories}/
  events/
  handlers/
  jobs/
  redis/
  scheduler/
  services/
  types/
  utils/
  bootstrap.ts
  client.ts
  index.ts
scripts/
tests/
.github/deployment/
.github/workflows/
```

- Commands are classes with static Discord definitions. They validate Discord-specific input, call a service passed to their constructor, and format the response.
- Services, repositories, handlers, and events receive their dependencies through their constructors. Nothing looks dependencies up at runtime.
- `src/app/create-services.ts` is the composition root. It creates every long-lived object exactly once with `new`, so the TypeScript compiler checks that each class receives the dependencies it needs.
- `src/commands/index.ts`, `src/components/index.ts`, and `src/events/index.ts` list every command, component handler, and event explicitly. There is no directory scanning, decorator metadata, or DI container, so the bot runs the same way under `tsx`, `tsc`, and Jest.
- Static command definitions can be deployed without constructing commands or initializing their runtime dependencies.
- Command cooldowns use Redis atomic set-with-expiry operations, sharing cooldown state safely across bot replicas.
- The TypeORM data source explicitly disables schema synchronization. Schema changes belong in migrations.

## Adding a slash command

Create a default-exported command class under a category in `src/commands/`:

```ts
import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { ExampleService } from '../../services/example.service';
import type { CommandExecutor, CommandMetadata } from '../../types';

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

Then add it to both lists in `src/commands/index.ts`. A test fails if the two lists disagree, and the compiler rejects missing or wrong constructor arguments:

```ts
export const commandDefinitions: readonly CommandDefinition[] = [
  PingCommand,
  SetWelcomeCommand,
  ExampleCommand,
];

export function createCommands(services: AppServices): SlashCommand[] {
  return [
    createCommand(PingCommand, services.health),
    createCommand(SetWelcomeCommand, services.welcomeSettings),
    createCommand(ExampleCommand, services.examples),
  ];
}
```

Run `npm run commands:deploy:guild` after definition changes in development. Reserve `npm run commands:deploy` for production because global propagation can take longer.

### Autocomplete

Mark a string, integer, or number option with `.setAutocomplete(true)` and add an `autocomplete` method to the command class. Discord calls it as the user types, so it skips cooldowns and must answer within three seconds with at most 25 choices:

```ts
async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const typed = interaction.options.getFocused().toLowerCase();
  const matches = this.colors.filter((color) => color.startsWith(typed)).slice(0, 25);
  await interaction.respond(matches.map((color) => ({ name: color, value: color })));
}
```

If the method is missing or throws, the user sees an empty list. Autocomplete only suggests values, so `execute` must still validate whatever the user submits.

## Adding a right-click (context menu) command

Context menu commands appear under **Apps** when someone right-clicks a user or a message. Create a class like a slash command, using `ContextMenuCommandBuilder`:

```ts
import { ApplicationCommandType, ContextMenuCommandBuilder, MessageFlags } from 'discord.js';
import type { CommandMetadata, ContextMenuExecutor, ContextMenuInteraction } from '../../types';

export default class QuoteMenu implements ContextMenuExecutor {
  static readonly data = new ContextMenuCommandBuilder()
    .setName('Quote Message')
    .setType(ApplicationCommandType.Message);

  static readonly metadata: CommandMetadata = { category: 'general', cooldownSeconds: 5 };

  async execute(interaction: ContextMenuInteraction): Promise<void> {
    if (!interaction.isMessageContextMenuCommand()) return;
    await interaction.reply({
      content: `> ${interaction.targetMessage.content}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
```

Add it to `contextMenuDefinitions` and `createContextMenus()` in `src/commands/index.ts`, then run `npm run commands:deploy:guild`. Menus support the same metadata checks as slash commands. Discord allows at most 5 user menus and 5 message menus per bot. `src/commands/context/user-info.ts` is a working example.

## Adding buttons, select menus, and modals

Buttons, select menus, and modal submissions are routed by their custom ID. A custom ID is a prefix plus optional arguments separated by `:`, such as `ticket-close:42`. Build them with `createCustomId(prefix, ...args)`; the matching handler receives the arguments. Discord keeps nothing else about a component, so put any state the handler needs (an ID, a page number) in the arguments. Custom IDs are limited to 100 characters.

Create a handler class under `src/components/`. `kind` is `'button'`, `'selectMenu'`, or `'modal'`, and `metadata` accepts the same `guildOnly`, `cooldownSeconds`, and permission checks as commands:

```ts
import type { ButtonInteraction } from 'discord.js';
import type { TicketService } from '../../services/ticket.service';
import type { ComponentHandler, InteractionGuards } from '../../types';

export default class CloseTicketButton implements ComponentHandler<'button'> {
  static readonly prefix = 'ticket-close';

  readonly kind = 'button';
  readonly prefix = CloseTicketButton.prefix;
  readonly metadata: InteractionGuards = { guildOnly: true, cooldownSeconds: 3 };

  constructor(private readonly tickets: TicketService) {}

  async execute(interaction: ButtonInteraction, [ticketId]: readonly string[]): Promise<void> {
    await this.tickets.close(ticketId ?? '');
    await interaction.update({ content: 'Ticket closed.', components: [] });
  }
}
```

Attach it to a message with `new ButtonBuilder().setCustomId(createCustomId(CloseTicketButton.prefix, ticket.id))`, then add it to `src/components/index.ts`:

```ts
export function createComponents(services: AppServices): ComponentHandler[] {
  return [new PingRefreshButton(services.health), new CloseTicketButton(services.tickets)];
}
```

Startup fails if two handlers of the same kind share a prefix. A component whose prefix has no handler (for example, a button on an old message after you removed its handler) gets an ephemeral "no longer available" reply. The `/ping` Refresh button in `src/components/general/ping-refresh.ts` is a working example. Components do not need `commands:deploy`.

## Adding a scheduled job

Scheduled jobs run code on a cron schedule, such as a daily announcement or a weekly cleanup. Create a class under `src/jobs/`:

```ts
import type { Client } from 'discord.js';
import type { ScheduledJob } from '../types';

export class DailyReminderJob implements ScheduledJob {
  readonly name = 'daily-reminder';
  readonly schedule = '0 9 * * *'; // every day at 09:00
  readonly timezone = 'America/New_York'; // optional, defaults to UTC

  constructor(
    private readonly client: Client,
    private readonly channelId: string,
  ) {}

  async run(): Promise<void> {
    if (!this.client.isReady()) return;
    const channel = await this.client.channels.fetch(this.channelId);
    if (channel?.isSendable()) await channel.send('Daily reminder!');
  }
}
```

Then add it to `createJobs()` in `src/jobs/index.ts`. Schedules use standard cron syntax (`minute hour day month weekday`, with an optional leading seconds field); [crontab.guru](https://crontab.guru) helps write them.

- Jobs start after the bot logs in and stop on shutdown, which waits for a running job to finish.
- A job never overlaps itself: if a run is still going when the next one is due, that run is skipped.
- Each run takes a Redis lock, so only one replica runs it when you scale the bot out. Replicas need synced clocks (NTP), which servers have by default.
- An invalid pattern, an invalid timezone, or a duplicate job name fails startup. A job that throws is logged and runs again at its next scheduled time.
- Runs missed while the bot was offline are not caught up.

`src/jobs/log-status.job.ts` is a working example that logs the bot's health every hour.

## Adding dependencies

Declare a service's dependencies in its constructor:

```ts
export class ExampleService {
  constructor(private readonly settings: GuildSettingsRepository) {}
}
```

Then create it once in `src/app/create-services.ts` and add it to `AppServices`:

```ts
const guildSettings = new GuildSettingsRepository(database);

return {
  // ...existing services
  examples: new ExampleService(guildSettings),
};
```

Interfaces, configuration values, and factory functions are passed the same way; no tokens or registrations are needed. Commands, services, and events should receive what they need through their constructors rather than importing shared instances.

TypeORM entities still use decorators, but the project does not emit decorator type metadata. Always give entity columns an explicit `type`, as the included entity does.

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
| `npm run deployment:enable`               | Opt this repository into AWS deployment     |
| `npm run migration:*`                     | Create, generate, run, or revert migrations |

## Testing

Commands are instantiated directly with mocked constructor dependencies and small mocked interactions; no websocket is necessary. Services use mocked repositories and Redis connections. Composition root tests check that every deployed command definition is created and that services share one Redis connection. Database tests use in-memory SQLite with real migrations. The offline bootstrap test injects a Redis double and exercises command and event registration plus graceful Redis/database shutdown.

## Production deployment

Deployment is **disabled in this template repository**. The example workflow is stored at `.github/deployment/deploy.yml`, outside GitHub's executable `.github/workflows/` directory. Publishing or pushing changes to the public template therefore cannot deploy a bot.

After creating a separate bot repository from this template:

1. Create and configure the Discord application and AWS EC2/Systems Manager target.
2. Create a protected GitHub environment named `production` and add the secrets listed below. Environment approval rules are recommended.
3. Add a repository Actions variable named `DEPLOYMENT_ENABLED` with the value `true`.
4. Run `npm run deployment:enable`. Review and commit the generated `.github/workflows/deploy.yml` in the bot repository.
5. Push to `main`. A successful `CI` run for that push will deploy the tested commit. CI runs for pull requests, including forks with a branch named `main`, never deploy. The workflow can also be run manually from GitHub Actions.

The variable check is a second opt-in guard: even a copied workflow will skip deployment until `DEPLOYMENT_ENABLED` is explicitly set to `true`. To disable future deployments, delete or rename `.github/workflows/deploy.yml`, or change the variable to `false`.

The enabled workflow builds the exact tested commit, publishes a non-root image to GitHub Container Registry, deploys it to an EC2 instance through AWS Systems Manager, waits until Redis and the bot report healthy, and then registers global slash commands.

The Docker image sets `HEALTHCHECK_FILE`. While Discord and Redis are both ready, the bot rewrites that file every 10 seconds, and the image health check fails when the file is missing or older than 30 seconds. A release that cannot log in or reach Redis never becomes healthy, so `docker compose up --wait` fails the deployment instead of reporting success.

Create a protected GitHub environment named `production` with these secrets:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `EC2_INSTANCE_ID`
- `GHCR_USERNAME`
- `GHCR_TOKEN` with permission to read the package

The EC2 instance must be registered with Systems Manager and have an instance profile containing `AmazonSSMManagedInstanceCore`. It needs outbound HTTPS access to AWS, GitHub Container Registry, and GitHub releases; no SSH ingress is required. The deployment supports Ubuntu/Debian and Amazon Linux-family hosts. It checks for Docker Engine and Docker Compose, installs missing components, enables Docker, and then deploys [compose.production.yaml](compose.production.yaml). Existing `bot-data` and `redis-data` volumes are preserved across releases.

The deployment writes the runtime environment to `/opt/discord-bot/.env` with mode `0600`. Redis is reached on the private Compose network, so production does not require a separate `REDIS_URL` secret. Startup applies migrations; SIGINT and SIGTERM close Discord, Redis, and SQLite cleanly.

Only secret names and generic runtime defaults are committed. Discord tokens, AWS credentials, instance IDs, registry credentials, and generated production `.env` files remain in GitHub Secrets or on the target host.

```sh
docker build -t discord-bot-template .
docker run --rm \
  -e DISCORD_TOKEN \
  -e DISCORD_CLIENT_ID \
  -e REDIS_URL \
  -v discord-bot-data:/app/data \
  discord-bot-template
```

## License

Available under the [MIT License](LICENSE).
