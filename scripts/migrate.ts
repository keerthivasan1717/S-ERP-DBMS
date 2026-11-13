import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

export async function migrateMySQL(): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), 'db/mysql/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const useSsl = process.env.MYSQL_SSL === 'true' || process.env.MYSQL_SSL === '1';
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3307,
    user: process.env.MYSQL_USER || 'serp',
    password: process.env.MYSQL_PASSWORD || 'serp_password',
    database: process.env.MYSQL_DATABASE || 'serp',
    ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    multipleStatements: true,
  });

  try {
    console.log('[MySQL] Applying schema...');
    await connection.query(sql);
    console.log('[MySQL] Schema applied successfully.');
  } finally {
    await connection.end();
  }
}

export async function migrateMongo(): Promise<void> {
  const dbName = process.env.MONGO_DATABASE || 'serp';
  const uri =
    process.env.MONGO_URI ||
    `mongodb://${process.env.MONGO_USER || 'serp'}:${process.env.MONGO_PASSWORD || 'serp_password'}@${process.env.MONGO_HOST || '127.0.0.1'}:${Number(process.env.MONGO_PORT) || 27017}/${dbName}?authSource=admin`;
  const client = new MongoClient(uri);

  try {
    console.log('[MongoDB] Initializing collections & indexes...');
    await client.connect();
    const db = client.db(dbName);
    const collections = [
      'phase_report', 'decision_risk', 'process_indicator', 'organization_dimension',
      'process_resource', 'employee_project', 'indicator_measurement', 'report',
      'implementation_phase', 'risk', 'decision', 'decision_level', 'business_process', 'resource',
      'app_user', 'sustainability_indicator', 'sustainability_dimension',
      'project_task', 'project', 'employee', 'department', 'organization'
    ];
    for (const t of collections) {
      await db.createCollection(t).catch(() => {});
    }
    await db.collection('app_user').createIndex({ username: 1 }, { unique: true }).catch(() => {});
    await db.collection('employee').createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await db.collection('decision_level').createIndex({ name: 1 }, { unique: true }).catch(() => {});
    console.log('[MongoDB] Collections & indexes initialized successfully.');
  } finally {
    await client.close();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const engineArg = args.find((a) => a.startsWith('--engine='));
  const engine = engineArg ? engineArg.split('=')[1] : null;

  if (engine === 'mysql') {
    await migrateMySQL();
  } else if (engine === 'mongodb') {
    await migrateMongo();
  } else {
    await migrateMySQL();
    await migrateMongo();
  }
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
