import 'reflect-metadata';

import { bootstrap, type Application } from './bootstrap';
import { ConfigError } from './config';
import { toError } from './utils/errors';

let application: Application | undefined;
let terminating = false;

async function terminate(signal: NodeJS.Signals): Promise<void> {
  if (terminating) return;
  terminating = true;
  await application?.shutdown(signal);
  process.exitCode = 0;
}

process.once('SIGINT', () => void terminate('SIGINT'));
process.once('SIGTERM', () => void terminate('SIGTERM'));

void bootstrap()
  .then((started) => {
    application = started;
  })
  .catch((thrown: unknown) => {
    const error = toError(thrown);
    const message =
      error instanceof ConfigError ? error.message : `Startup failed: ${error.message}`;
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
