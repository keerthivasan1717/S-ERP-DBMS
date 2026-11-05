import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import pg from 'pg';
import dotenv from 'dotenv';
import { EXPECTED_TABLES } from '../scripts/er-check.js';

dotenv.config();

const { Pool: PgPool } = pg;

describe('M1: Schema, Constraints & Parity Acceptance Tests', () => {
  let mysqlConn: mysql.Connection;
  let pgPool: pg.Pool;

  beforeAll(async () => {
    mysqlConn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3307,
      user: process.env.MYSQL_USER || 'serp',
      password: process.env.MYSQL_PASSWORD || 'serp_password',
      database: process.env.MYSQL_DATABASE || 'serp',
    });

    pgPool = new PgPool({
      host: process.env.PGHOST || '127.0.0.1',
      port: Number(process.env.PGPORT) || 5434,
      user: process.env.PGUSER || 'serp',
      password: process.env.PGPASSWORD || 'serp_password',
      database: process.env.PGDATABASE || 'serp',
    });
  });

  afterAll(async () => {
    await mysqlConn.end();
    await pgPool.end();
  });

  describe('Row Count Parity', () => {
    it('all 21 tables exist and have identical row counts on MySQL and PostgreSQL', async () => {
      for (const table of EXPECTED_TABLES) {
        const [myRes]: any = await mysqlConn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
        const myCount = Number(myRes[0].c);

        const pgRes = await pgPool.query(`SELECT COUNT(*) AS c FROM "${table}"`);
        const pgCount = Number(pgRes.rows[0].c);

        expect(myCount).toBeGreaterThanOrEqual(1);
        expect(pgCount).toBe(myCount);
      }
    });
  });

  describe('CHECK Constraints enforcement (Both Engines)', () => {
    it('MySQL rejects invalid sustainability_dimension.name', async () => {
      await expect(
        mysqlConn.query(
          "INSERT INTO sustainability_dimension (name, description) VALUES ('InvalidDimension', 'test')"
        )
      ).rejects.toThrow();
    });

    it('PostgreSQL rejects invalid sustainability_dimension.name', async () => {
      await expect(
        pgPool.query(
          "INSERT INTO sustainability_dimension (name, description) VALUES ('InvalidDimension', 'test')"
        )
      ).rejects.toThrow();
    });

    it('MySQL rejects invalid resource.type', async () => {
      await expect(
        mysqlConn.query(
          "INSERT INTO resource (type, name, unit) VALUES ('Nuclear', 'Uranium', 'kg')"
        )
      ).rejects.toThrow();
    });

    it('PostgreSQL rejects invalid resource.type', async () => {
      await expect(
        pgPool.query(
          "INSERT INTO resource (type, name, unit) VALUES ('Nuclear', 'Uranium', 'kg')"
        )
      ).rejects.toThrow();
    });

    it('MySQL rejects invalid project.status', async () => {
      await expect(
        mysqlConn.query(
          "INSERT INTO project (name, start_date, status, department_id) VALUES ('P_bad', '2026-01-01', 'Cancelled', 1)"
        )
      ).rejects.toThrow();
    });

    it('PostgreSQL rejects invalid project.status', async () => {
      await expect(
        pgPool.query(
          "INSERT INTO project (name, start_date, status, department_id) VALUES ('P_bad', '2026-01-01', 'Cancelled', 1)"
        )
      ).rejects.toThrow();
    });

    it('MySQL rejects invalid decision.decision_level', async () => {
      await expect(
        mysqlConn.query(
          "INSERT INTO decision (title, decision_level, date, created_by) VALUES ('Bad Decision', 'Executive', '2026-01-01', 1)"
        )
      ).rejects.toThrow();
    });

    it('PostgreSQL rejects invalid decision.decision_level', async () => {
      await expect(
        pgPool.query(
          "INSERT INTO decision (title, decision_level, date, created_by) VALUES ('Bad Decision', 'Executive', '2026-01-01', 1)"
        )
      ).rejects.toThrow();
    });

    it('MySQL rejects invalid risk.level', async () => {
      await expect(
        mysqlConn.query(
          "INSERT INTO risk (title, level, project_id) VALUES ('Bad Risk', 'Critical', 1)"
        )
      ).rejects.toThrow();
    });

    it('PostgreSQL rejects invalid risk.level', async () => {
      await expect(
        pgPool.query(
          "INSERT INTO risk (title, level, project_id) VALUES ('Bad Risk', 'Critical', 1)"
        )
      ).rejects.toThrow();
    });

    it('MySQL rejects invalid app_user.app_role', async () => {
      await expect(
        mysqlConn.query(
          "INSERT INTO app_user (username, password_hash, app_role) VALUES ('fakeuser', 'hash', 'SuperUser')"
        )
      ).rejects.toThrow();
    });

    it('PostgreSQL rejects invalid app_user.app_role', async () => {
      await expect(
        pgPool.query(
          "INSERT INTO app_user (username, password_hash, app_role) VALUES ('fakeuser', 'hash', 'SuperUser')"
        )
      ).rejects.toThrow();
    });
  });

  describe('Foreign Key Constraints & Integrity (Both Engines)', () => {
    it('MySQL rejects inserting department with non-existent org_id', async () => {
      await expect(
        mysqlConn.query(
          "INSERT INTO department (name, org_id) VALUES ('Ghost Dept', 99999)"
        )
      ).rejects.toThrow();
    });

    it('PostgreSQL rejects inserting department with non-existent org_id', async () => {
      await expect(
        pgPool.query(
          "INSERT INTO department (name, org_id) VALUES ('Ghost Dept', 99999)"
        )
      ).rejects.toThrow();
    });

    it('MySQL blocks deleting department when employees exist (ON DELETE RESTRICT)', async () => {
      await expect(
        mysqlConn.query('DELETE FROM department WHERE dept_id = 1')
      ).rejects.toThrow();
    });

    it('PostgreSQL blocks deleting department when employees exist (ON DELETE RESTRICT)', async () => {
      await expect(
        pgPool.query('DELETE FROM department WHERE dept_id = 1')
      ).rejects.toThrow();
    });

    it('MySQL rejects duplicate employee email', async () => {
      const [res]: any = await mysqlConn.query('SELECT email FROM employee LIMIT 1');
      const existingEmail = res[0].email;
      await expect(
        mysqlConn.query(
          'INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)',
          ['Duplicate Person', existingEmail, 'Analyst', 1]
        )
      ).rejects.toThrow();
    });

    it('PostgreSQL rejects duplicate employee email', async () => {
      const res = await pgPool.query('SELECT email FROM employee LIMIT 1');
      const existingEmail = res.rows[0].email;
      await expect(
        pgPool.query(
          'INSERT INTO employee (name, email, role, department_id) VALUES ($1, $2, $3, $4)',
          ['Duplicate Person', existingEmail, 'Analyst', 1]
        )
      ).rejects.toThrow();
    });

    it('MySQL rejects duplicate composite key in employee_project', async () => {
      const [res]: any = await mysqlConn.query('SELECT emp_id, project_id FROM employee_project LIMIT 1');
      const { emp_id, project_id } = res[0];
      await expect(
        mysqlConn.query(
          'INSERT INTO employee_project (emp_id, project_id, role, allocation_percentage) VALUES (?, ?, ?, ?)',
          [emp_id, project_id, 'Duplicate Role', 20.0]
        )
      ).rejects.toThrow();
    });

    it('PostgreSQL rejects duplicate composite key in employee_project', async () => {
      const res = await pgPool.query('SELECT emp_id, project_id FROM employee_project LIMIT 1');
      const { emp_id, project_id } = res.rows[0];
      await expect(
        pgPool.query(
          'INSERT INTO employee_project (emp_id, project_id, role, allocation_percentage) VALUES ($1, $2, $3, $4)',
          [emp_id, project_id, 'Duplicate Role', 20.0]
        )
      ).rejects.toThrow();
    });
  });
});

