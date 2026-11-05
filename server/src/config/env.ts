import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  SESSION_SECRET: z.string().default('serp_session_secret_at_least_32_chars_long_dev_2026'),

  // MySQL 8.4
  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().default(3307),
  MYSQL_DATABASE: z.string().default('serp'),
  MYSQL_USER: z.string().default('serp'),
  MYSQL_PASSWORD: z.string().default('serp_password'),

  // PostgreSQL 16 (optional)
  PGHOST: z.string().default('127.0.0.1'),
  PGPORT: z.coerce.number().default(5434),
  PGDATABASE: z.string().default('serp'),
  PGUSER: z.string().default('serp'),
  PGPASSWORD: z.string().default('serp_password'),

  // MongoDB 6.0
  MONGO_HOST: z.string().default('127.0.0.1'),
  MONGO_PORT: z.coerce.number().default(27017),
  MONGO_DATABASE: z.string().default('serp'),
  MONGO_USER: z.string().default('serp'),
  MONGO_PASSWORD: z.string().default('serp_password'),
});

export const env = envSchema.parse(process.env);
