import path from 'node:path';

import dotenv from 'dotenv';

import { createDataSource } from './data-source';

const environment = process.env.NODE_ENV ?? 'development';
if (environment === 'development') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.development'), quiet: true });
}

export default createDataSource(process.env.DATABASE_PATH ?? './data/bot.sqlite');
