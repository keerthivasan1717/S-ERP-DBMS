import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const EXPECTED_TABLES = [
  'organization',
  'department',
  'employee',
  'app_user',
  'project',
  'project_task',
  'employee_project',
  'sustainability_dimension',
  'sustainability_indicator',
  'indicator_measurement',
  'resource',
  'business_process',
  'process_resource',
  'decision',
  'risk',
  'implementation_phase',
  'report',
  'organization_dimension',
  'process_indicator',
  'decision_risk',
  'phase_report',
];

export async function runErCheck(): Promise<boolean> {
  let allPassed = true;

  console.log('=== S-ERP Schema & Conformance Check (SQL vs NoSQL) ===\n');

  // MySQL Connection
  const mysqlConn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3307,
    user: process.env.MYSQL_USER || 'serp',
    password: process.env.MYSQL_PASSWORD || 'serp_password',
    database: process.env.MYSQL_DATABASE || 'serp',
  });

  // MongoDB Connection
  const mongoUri = `mongodb://${process.env.MONGO_USER || 'serp'}:${process.env.MONGO_PASSWORD || 'serp_password'}@${process.env.MONGO_HOST || '127.0.0.1'}:${process.env.MONGO_PORT || 27017}/${process.env.MONGO_DATABASE || 'serp'}?authSource=admin`;
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const mongoDb = mongoClient.db(process.env.MONGO_DATABASE || 'serp');

  try {
    // 1. Check MySQL Tables
    const [myTablesRes]: any = await mysqlConn.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'",
      [process.env.MYSQL_DATABASE || 'serp']
    );
    const myTables = new Set<string>(myTablesRes.map((r: any) => (r.TABLE_NAME || r.table_name).toLowerCase()));

    // 2. Check MongoDB Collections
    const mongoCollections = await mongoDb.listCollections().toArray();
    const mgCollections = new Set<string>(mongoCollections.map((c) => c.name.toLowerCase()));

    console.log(`Expected Entities Count:   ${EXPECTED_TABLES.length}`);
    console.log(`MySQL Live Tables (SQL):   ${myTables.size}`);
    console.log(`MongoDB Collections (NoSQL):${mgCollections.size}\n`);

    console.log('| Entity Name               | MySQL (SQL) | MongoDB (NoSQL) | Row / Doc Count (My / Mg) | Status |');
    console.log('|---|:---:|:---:|:---:|:---:|');

    for (const table of EXPECTED_TABLES) {
      const hasMy = myTables.has(table);
      const hasMg = mgCollections.has(table);

      let myCount = -1;
      let mgCount = -1;

      if (hasMy) {
        const [res]: any = await mysqlConn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
        myCount = Number(res[0].c);
      }
      if (hasMg) {
        mgCount = await mongoDb.collection(table).countDocuments();
      }

      const countsMatch = myCount === mgCount && myCount >= 0;
      const status = hasMy && hasMg && countsMatch ? 'PASS' : 'FAIL';
      if (status === 'FAIL') allPassed = false;

      console.log(
        `| ${table.padEnd(25)} | ${hasMy ? '✔' : '✖'} | ${hasMg ? '✔' : '✖'} | ${myCount} / ${mgCount} | ${status} |`
      );
    }

    console.log('\n------------------------------------------------------------');
    if (allPassed) {
      console.log('RESULT: ER & Conformance PASSED across SQL (MySQL) and NoSQL (MongoDB).');
    } else {
      console.error('RESULT: Conformance FAILED. Mismatches detected between engines.');
    }
    console.log('------------------------------------------------------------\n');

    return allPassed;
  } finally {
    await mysqlConn.end();
    await mongoClient.close();
  }
}

async function main(): Promise<void> {
  const passed = await runErCheck();
  if (!passed) process.exit(1);
}

if (process.argv[1]?.endsWith('er-check.ts') || process.argv[1]?.endsWith('er-check.js')) {
  main().catch((err) => {
    console.error('ER check error:', err);
    process.exit(1);
  });
}
