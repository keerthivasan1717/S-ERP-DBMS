import mysql from 'mysql2/promise';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool: PgPool } = pg;

export const EXPECTED_TABLES = [
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

  console.log('=== S-ERP ER & Schema Conformance Check (MySQL vs PostgreSQL) ===\n');

  // MySQL Connection
  const mysqlConn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3307,
    user: process.env.MYSQL_USER || 'serp',
    password: process.env.MYSQL_PASSWORD || 'serp_password',
    database: process.env.MYSQL_DATABASE || 'serp',
  });

  // PostgreSQL Connection
  const pgPool = new PgPool({
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT) || 5434,
    user: process.env.PGUSER || 'serp',
    password: process.env.PGPASSWORD || 'serp_password',
    database: process.env.PGDATABASE || 'serp',
  });

  try {
    // 1. Check MySQL Tables
    const [myTablesRes]: any = await mysqlConn.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'",
      [process.env.MYSQL_DATABASE || 'serp']
    );
    const myTables = new Set<string>(
      myTablesRes.map((r: any) => (r.TABLE_NAME || r.table_name).toLowerCase())
    );

    // 2. Check PostgreSQL Tables
    const pgTablesRes = await pgPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );
    const pgTables = new Set<string>(
      pgTablesRes.rows.map((r: any) => r.table_name.toLowerCase())
    );

    console.log(`Expected Entities Count:   ${EXPECTED_TABLES.length}`);
    console.log(`MySQL Live Tables (SQL):   ${myTables.size}`);
    console.log(`PostgreSQL Live Tables:    ${pgTables.size}\n`);

    console.log(
      '| Entity Name               | MySQL | PostgreSQL | Row Count (My / Pg) | Status |'
    );
    console.log('|---------------------------|:-----:|:----------:|:-------------------:|:------:|');

    for (const table of EXPECTED_TABLES) {
      const hasMy = myTables.has(table);
      const hasPg = pgTables.has(table);

      let myCount = -1;
      let pgCount = -1;

      if (hasMy) {
        const [res]: any = await mysqlConn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
        myCount = Number(res[0].c);
      }
      if (hasPg) {
        const res = await pgPool.query(`SELECT COUNT(*) AS c FROM "${table}"`);
        pgCount = Number(res.rows[0].c);
      }

      const countsMatch = myCount === pgCount && myCount >= 0;
      const status = hasMy && hasPg && countsMatch ? 'PASS' : 'FAIL';
      if (status === 'FAIL') allPassed = false;

      console.log(
        `| ${table.padEnd(25)} |   ${hasMy ? '✔' : '✖'}   |     ${hasPg ? '✔' : '✖'}    |     ${String(myCount).padStart(3)} / ${String(pgCount).padEnd(3)}     |  ${status}  |`
      );
    }

    // Check FK and PK parity summary
    const [myFksRes]: any = await mysqlConn.query(
      `SELECT COUNT(*) as c FROM information_schema.table_constraints 
       WHERE table_schema = ? AND constraint_type = 'FOREIGN KEY'`,
      [process.env.MYSQL_DATABASE || 'serp']
    );
    const pgFksRes = await pgPool.query(
      `SELECT COUNT(*) as c FROM information_schema.table_constraints 
       WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'`
    );

    const myFkCount = Number(myFksRes[0].c);
    const pgFkCount = Number(pgFksRes.rows[0].c);

    console.log(`\nForeign Key Constraints:   MySQL: ${myFkCount} | PostgreSQL: ${pgFkCount}`);

    console.log('\n------------------------------------------------------------');
    if (allPassed) {
      console.log('RESULT: ER & Conformance PASSED across MySQL 8.4 and PostgreSQL 16.');
    } else {
      console.error('RESULT: Conformance FAILED. Mismatches detected between engines.');
    }
    console.log('------------------------------------------------------------\n');

    return allPassed;
  } finally {
    await mysqlConn.end();
    await pgPool.end();
  }
}

if (process.argv[1]?.endsWith('er-check.ts') || process.argv[1]?.endsWith('er-check.js')) {
  runErCheck()
    .then((passed) => {
      process.exit(passed ? 0 : 1);
    })
    .catch((err) => {
      console.error('ER check execution error:', err);
      process.exit(1);
    });
}
