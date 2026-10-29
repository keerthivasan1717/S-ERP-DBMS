import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import { env } from '../config/env.js';

export interface EngineStatus {
  engine: 'mysql' | 'postgres';
  name: string;
  host: string;
  port: number;
  database: string;
  reachable: boolean;
  version: string | null;
  error?: string;
}

export interface DualEngineStatus {
  timestamp: string;
  mysql: EngineStatus;
  postgres: EngineStatus;
}

export async function checkMysqlStatus(): Promise<EngineStatus> {
  const result: EngineStatus = {
    engine: 'mysql',
    name: 'SQL (MySQL 8.4)',
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    database: env.MYSQL_DATABASE,
    reachable: false,
    version: null,
  };

  try {
    const connection = await mysql.createConnection({
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE,
      connectTimeout: 3000,
    });

    try {
      const [rows] = await connection.query('SELECT VERSION() as version');
      const row = Array.isArray(rows) ? (rows[0] as { version?: string }) : null;
      result.reachable = true;
      result.version = row?.version ?? 'Unknown MySQL version';
    } finally {
      await connection.end();
    }
  } catch (err: unknown) {
    result.reachable = false;
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

export async function checkPostgresStatus(): Promise<EngineStatus> {
  const result: EngineStatus = {
    engine: 'postgres',
    name: 'PostgreSQL 16',
    host: env.PGHOST,
    port: env.PGPORT,
    database: env.PGDATABASE,
    reachable: false,
    version: null,
  };

  const client = new PgClient({
    host: env.PGHOST,
    port: env.PGPORT,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT version()');
    result.reachable = true;
    result.version = res.rows[0]?.version ? String(res.rows[0].version) : 'Unknown PostgreSQL version';
  } catch (err: unknown) {
    result.reachable = false;
    result.error = err instanceof Error ? err.message : String(err);
  } finally {
    try {
      await client.end();
    } catch {
      // client may already be closed if connect failed
    }
  }

  return result;
}

export async function getEnginesStatus(): Promise<DualEngineStatus> {
  const [mysqlStatus, postgresStatus] = await Promise.all([
    checkMysqlStatus(),
    checkPostgresStatus(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    mysql: mysqlStatus,
    postgres: postgresStatus,
  };
}
