import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { config } from '../config';
import * as schema from './schema';

const queryClient = postgres(config.DATABASE_URL);

export const db = drizzle(queryClient, { schema });
