import mysql, { Pool as MySqlPool, PoolConnection as MySqlConnection } from 'mysql2/promise';
import pg, { Pool as PgPool, PoolClient as PgClient } from 'pg';
import { MongoClient, Db } from 'mongodb';
import alasql from 'alasql';
import dotenv from 'dotenv';

dotenv.config();

export type EngineType = 'mysql' | 'mongodb' | 'postgres';

export interface DbAdapter {
  readonly engine: EngineType;
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = any>(sql: string, params?: unknown[]): Promise<T | null>;
  many<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  insert(sql: string, params?: unknown[], keyColumn?: string): Promise<number>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }>;
  tx<T>(fn: (db: DbAdapter) => Promise<T>): Promise<T>;
  getMongoDb?(): Db;
}

// Global Connection Pools
let mysqlPool: MySqlPool | null = null;
let pgPool: PgPool | null = null;
let mongoClient: MongoClient | null = null;

export function getMySqlPool(): MySqlPool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3307,
      user: process.env.MYSQL_USER || 'serp',
      password: process.env.MYSQL_PASSWORD || 'serp_password',
      database: process.env.MYSQL_DATABASE || 'serp',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });
  }
  return mysqlPool;
}

export function getPgPool(): PgPool {
  if (!pgPool) {
    pgPool = new pg.Pool({
      host: process.env.PGHOST || '127.0.0.1',
      port: Number(process.env.PGPORT) || 5434,
      user: process.env.PGUSER || 'serp',
      password: process.env.PGPASSWORD || 'serp_password',
      database: process.env.PGDATABASE || 'serp',
      max: 10,
    });
  }
  return pgPool;
}

export function getMongoClient(): MongoClient {
  if (!mongoClient) {
    const host = process.env.MONGO_HOST || '127.0.0.1';
    const port = Number(process.env.MONGO_PORT) || 27017;
    const db = process.env.MONGO_DATABASE || 'serp';
    const user = process.env.MONGO_USER || 'serp';
    const pass = process.env.MONGO_PASSWORD || 'serp_password';
    const uri = `mongodb://${user}:${pass}@${host}:${port}/${db}?authSource=admin`;
    mongoClient = new MongoClient(uri);
  }
  return mongoClient;
}

export function getMongoDb(): Db {
  const client = getMongoClient();
  return client.db(process.env.MONGO_DATABASE || 'serp');
}

/**
 * Transforms standard ? placeholders into PostgreSQL $1, $2, ... format
 */
function translatePlaceholders(sql: string): string {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

class MySqlAdapter implements DbAdapter {
  readonly engine: EngineType = 'mysql';

  constructor(private poolOrConn: MySqlPool | MySqlConnection) {}

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows]: any = await this.poolOrConn.query(sql, params);
    return rows as T[];
  }

  async one<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async many<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.query<T>(sql, params);
  }

  async insert(sql: string, params: unknown[] = []): Promise<number> {
    const [result]: any = await this.poolOrConn.query(sql, params);
    return Number(result.insertId);
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ affectedRows: number }> {
    const [result]: any = await this.poolOrConn.query(sql, params);
    return { affectedRows: Number(result.affectedRows || 0) };
  }

  async tx<T>(fn: (db: DbAdapter) => Promise<T>): Promise<T> {
    if ('getConnection' in this.poolOrConn) {
      const conn = await (this.poolOrConn as MySqlPool).getConnection();
      await conn.beginTransaction();
      const txAdapter = new MySqlAdapter(conn);
      try {
        const res = await fn(txAdapter);
        await conn.commit();
        return res;
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } else {
      return fn(this);
    }
  }
}

const ALL_COLLECTIONS = [
  'phase_report', 'decision_risk', 'process_indicator', 'organization_dimension',
  'process_resource', 'employee_project', 'indicator_measurement', 'report',
  'implementation_phase', 'risk', 'decision', 'business_process', 'resource',
  'app_user', 'sustainability_indicator', 'sustainability_dimension',
  'project_task', 'project', 'employee', 'department', 'organization'
];

const PK_MAP: Record<string, string> = {
  organization: 'org_id',
  department: 'dept_id',
  employee: 'emp_id',
  app_user: 'user_id',
  project: 'project_id',
  project_task: 'task_id',
  sustainability_dimension: 'dimension_id',
  sustainability_indicator: 'indicator_id',
  indicator_measurement: 'measurement_id',
  resource: 'resource_id',
  business_process: 'process_id',
  decision: 'decision_id',
  risk: 'risk_id',
  implementation_phase: 'phase_id',
  report: 'report_id',
};

export class MongoAdapter implements DbAdapter {
  readonly engine: EngineType = 'mongodb';
  private db: Db;

  constructor(db?: Db) {
    this.db = db || getMongoDb();
  }

  getMongoDb(): Db {
    return this.db;
  }

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const mentionedTables = ALL_COLLECTIONS.filter((t) => {
      const regex = new RegExp(`\\b${t}\\b`, 'i');
      return regex.test(sql);
    });

    const adb = new (alasql as any).Database();
    for (const t of mentionedTables) {
      const docs = await this.db.collection(t).find({}, { projection: { _id: 0 } }).toArray();
      const processed = docs.map((doc: any) => {
        const copy = { ...doc };
        if (t === 'indicator_measurement' && copy.measurement_date) {
          copy._orig_measurement_date = copy.measurement_date;
          copy.measurement_date = new Date(copy.measurement_date).getTime();
        }
        return copy;
      });
      adb.tables[t] = { data: processed };
    }

    const cleanSql = sql.replace(/\bAS\s+count\b/gi, 'AS `count`');

    try {
      const rows = adb.exec(cleanSql, params) || [];
      const result = rows.map((r: any) => {
        if (r && typeof r === 'object') {
          for (const k of Object.keys(r)) {
            if (k === 'latest_measurement_date' && typeof r[k] === 'number') {
              r[k] = new Date(r[k]).toISOString().slice(0, 10);
            } else if (k === 'measurement_date' && typeof r[k] === 'number') {
              r[k] = new Date(r[k]).toISOString().slice(0, 10);
            }
          }
        }
        return r;
      });
      return result as T[];
    } catch (err: unknown) {
      console.error(`[MongoAdapter] Query error for SQL: ${sql}`, err);
      throw err;
    }
  }

  async one<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async many<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.query<T>(sql, params);
  }

  async insert(sql: string, params: unknown[] = [], keyColumn?: string): Promise<number> {
    const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES/i);
    if (!match) {
      throw new Error(`[MongoAdapter] Unable to parse INSERT statement: ${sql}`);
    }
    const table = match[1];
    const cols = match[2].split(',').map((c) => c.trim().replace(/[`"']/g, ''));
    const doc: Record<string, any> = {};
    for (let i = 0; i < cols.length; i++) {
      doc[cols[i]] = params[i] !== undefined ? params[i] : null;
    }

    const pkCol = keyColumn || PK_MAP[table];
    if (pkCol && doc[pkCol] === undefined) {
      const maxDoc = await this.db
        .collection(table)
        .find()
        .sort({ [pkCol]: -1 })
        .limit(1)
        .toArray();
      const nextId = maxDoc.length > 0 ? (Number(maxDoc[0][pkCol]) || 0) + 1 : 1;
      doc[pkCol] = nextId;
    }

    await this.db.collection(table).insertOne(doc);
    return pkCol ? Number(doc[pkCol]) : 1;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ affectedRows: number }> {
    const trimmed = sql.trim().toUpperCase();

    // Pass-through pragma
    if (trimmed.startsWith('SET ')) {
      return { affectedRows: 0 };
    }

    // Handle INSERT inside execute
    if (trimmed.startsWith('INSERT INTO')) {
      await this.insert(sql, params);
      return { affectedRows: 1 };
    }

    // TRUNCATE
    const truncMatch = sql.match(/TRUNCATE(?:\s+TABLE)?\s+([a-zA-Z0-9_]+)/i);
    if (truncMatch) {
      const table = truncMatch[1];
      const res = await this.db.collection(table).deleteMany({});
      return { affectedRows: res.deletedCount };
    }

    // DELETE
    const deleteMatch = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?/i);
    if (deleteMatch) {
      const table = deleteMatch[1];
      const whereStr = deleteMatch[2];
      if (!whereStr) {
        const res = await this.db.collection(table).deleteMany({});
        return { affectedRows: res.deletedCount };
      }
      const filter: Record<string, any> = {};
      const whereClauses = whereStr.split(/\s+AND\s+/i);
      let pIdx = 0;
      for (const clause of whereClauses) {
        const colName = clause.split('=')[0].trim().replace(/[`"']/g, '');
        filter[colName] = params[pIdx++];
      }
      const res = await this.db.collection(table).deleteMany(filter);
      return { affectedRows: res.deletedCount };
    }

    // UPDATE
    const updateMatch = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
    if (updateMatch) {
      const table = updateMatch[1];
      const setCols = updateMatch[2].split(',').map((c) => c.split('=')[0].trim().replace(/[`"']/g, ''));
      const updateDoc: Record<string, any> = {};
      for (let i = 0; i < setCols.length; i++) {
        updateDoc[setCols[i]] = params[i] !== undefined ? params[i] : null;
      }
      const whereStr = updateMatch[3];
      const filter: Record<string, any> = {};
      const whereClauses = whereStr.split(/\s+AND\s+/i);
      let pIdx = setCols.length;
      for (const clause of whereClauses) {
        const colName = clause.split('=')[0].trim().replace(/[`"']/g, '');
        filter[colName] = params[pIdx++];
      }
      const res = await this.db.collection(table).updateMany(filter, { $set: updateDoc });
      return { affectedRows: res.modifiedCount };
    }

    return { affectedRows: 0 };
  }

  async tx<T>(fn: (db: DbAdapter) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

class PgAdapter implements DbAdapter {
  readonly engine: EngineType = 'postgres';

  constructor(private poolOrClient: PgPool | PgClient) {}

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const pgSql = translatePlaceholders(sql);
    const res = await this.poolOrClient.query(pgSql, params);
    return res.rows as T[];
  }

  async one<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async many<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.query<T>(sql, params);
  }

  async insert(sql: string, params: unknown[] = [], keyColumn?: string): Promise<number> {
    let pgSql = translatePlaceholders(sql);
    if (!pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += keyColumn ? ` RETURNING ${keyColumn}` : ' RETURNING *';
    }
    const res = await this.poolOrClient.query(pgSql, params);
    if (res.rows.length === 0) return 0;
    const row = res.rows[0];
    if (keyColumn && row[keyColumn] !== undefined) {
      return Number(row[keyColumn]);
    }
    const firstKey = Object.keys(row).find((k) => k.endsWith('_id') || k === 'id') || Object.keys(row)[0];
    return Number(row[firstKey]);
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ affectedRows: number }> {
    const pgSql = translatePlaceholders(sql);
    const res = await this.poolOrClient.query(pgSql, params);
    return { affectedRows: res.rowCount || 0 };
  }

  async tx<T>(fn: (db: DbAdapter) => Promise<T>): Promise<T> {
    if ('connect' in this.poolOrClient) {
      const client = await (this.poolOrClient as PgPool).connect();
      await client.query('BEGIN');
      const txAdapter = new PgAdapter(client);
      try {
        const res = await fn(txAdapter);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      return fn(this);
    }
  }
}

export function getAdapter(engine: EngineType): DbAdapter {
  if (engine === 'mysql') {
    return new MySqlAdapter(getMySqlPool());
  }
  if (engine === 'mongodb') {
    return new MongoAdapter(getMongoDb());
  }
  if (engine === 'postgres') {
    return new PgAdapter(getPgPool());
  }
  throw new Error(`Unsupported database engine: ${engine}`);
}

export async function closePools(): Promise<void> {
  if (mysqlPool) {
    await mysqlPool.end();
    mysqlPool = null;
  }
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}
