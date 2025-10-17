import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment-specific .env file if NODE_ENV is set
// Otherwise fall back to .env (for backward compatibility with Digital Ocean)
let envFile = '.env';
if (process.env.NODE_ENV === 'development') {
  envFile = '.env.development';
} else if (process.env.NODE_ENV === 'production') {
  envFile = '.env.production';
}

const envPath = path.resolve(process.cwd(), envFile);

// If the specific env file doesn't exist, fall back to .env
if (!fs.existsSync(envPath) && envFile !== '.env') {
  dotenv.config();
} else {
  dotenv.config({ path: envPath });
}

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error('Missing environment variables');
}

export const config = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  GUILD_ID,
};
