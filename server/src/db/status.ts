import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

export interface EngineStatus {
  engine: 'mysql' | 'postgres' | 'mongodb';
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
  mongodb: EngineStatus;
  postgres?: EngineStatus;
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

export async function checkMongoStatus(): Promise<EngineStatus> {
  const result: EngineStatus = {
    engine: 'mongodb',
    name: 'NoSQL (MongoDB 6.0)',
    host: env.MONGO_HOST,
    port: env.MONGO_PORT,
    database: env.MONGO_DATABASE,
    reachable: false,
    version: null,
  };

  const uri = `mongodb://${env.MONGO_USER}:${env.MONGO_PASSWORD}@${env.MONGO_HOST}:${env.MONGO_PORT}/${env.MONGO_DATABASE}?authSource=admin`;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });

  try {
    await client.connect();
    const buildInfo = await client.db(env.MONGO_DATABASE).command({ buildInfo: 1 });
    result.reachable = true;
    result.version = `MongoDB v${buildInfo.version || '6.0'}`;
  } catch (err: unknown) {
    result.reachable = false;
    result.error = err instanceof Error ? err.message : String(err);
  } finally {
    try {
      await client.close();
    } catch {
      // client close
    }
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
  const [mysqlStatus, mongoStatus, postgresStatus] = await Promise.all([
    checkMysqlStatus(),
    checkMongoStatus(),
    checkPostgresStatus(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    mysql: mysqlStatus,
    mongodb: mongoStatus,
    postgres: postgresStatus,
  };
}
