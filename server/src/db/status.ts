import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

export interface EngineStatus {
  engine: 'mysql' | 'mongodb';
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

export async function getEnginesStatus(): Promise<DualEngineStatus> {
  const [mysqlStatus, mongoStatus] = await Promise.all([
    checkMysqlStatus(),
    checkMongoStatus(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    mysql: mysqlStatus,
    mongodb: mongoStatus,
  };
}
