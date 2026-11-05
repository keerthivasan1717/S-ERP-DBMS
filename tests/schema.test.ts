import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { EXPECTED_TABLES } from '../scripts/er-check.js';

dotenv.config();

describe('M1: Schema, Constraints & Parity Acceptance Tests (MySQL & MongoDB)', () => {
  let mysqlConn: mysql.Connection;
  let mongoClient: MongoClient;
  let mongoDb: any;

  beforeAll(async () => {
    mysqlConn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3307,
      user: process.env.MYSQL_USER || 'serp',
      password: process.env.MYSQL_PASSWORD || 'serp_password',
      database: process.env.MYSQL_DATABASE || 'serp',
    });

    const host = process.env.MONGO_HOST || '127.0.0.1';
    const port = Number(process.env.MONGO_PORT) || 27017;
    const dbName = process.env.MONGO_DATABASE || 'serp';
    const user = process.env.MONGO_USER || 'serp';
    const pass = process.env.MONGO_PASSWORD || 'serp_password';
    const uri = `mongodb://${user}:${pass}@${host}:${port}/${dbName}?authSource=admin`;
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    mongoDb = mongoClient.db(dbName);
  });

  afterAll(async () => {
    await mysqlConn.end();
    await mongoClient.close();
  });

  describe('Row / Document Count Parity (SQL vs NoSQL)', () => {
    it('all 21 tables/collections exist and have identical entity counts on MySQL and MongoDB', async () => {
      for (const table of EXPECTED_TABLES) {
        const [myRes]: any = await mysqlConn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
        const myCount = Number(myRes[0].c);

        const mgCount = await mongoDb.collection(table).countDocuments();

        expect(myCount).toBeGreaterThanOrEqual(1);
        expect(mgCount).toBe(myCount);
      }
    });
  });

  describe('CHECK Constraints enforcement (MySQL)', () => {
    it('MySQL rejects invalid sustainability_dimension.name', async () => {
      await expect(
        mysqlConn.query(
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

    it('MySQL rejects invalid project.status', async () => {
      await expect(
        mysqlConn.query(
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

    it('MySQL rejects invalid risk.level', async () => {
      await expect(
        mysqlConn.query(
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
  });

  describe('Foreign Key Constraints & Integrity (MySQL)', () => {
    it('MySQL rejects inserting department with non-existent org_id', async () => {
      await expect(
        mysqlConn.query(
          "INSERT INTO department (name, org_id) VALUES ('Ghost Dept', 99999)"
        )
      ).rejects.toThrow();
    });

    it('MySQL blocks deleting department when employees exist (ON DELETE RESTRICT)', async () => {
      await expect(
        mysqlConn.query('DELETE FROM department WHERE dept_id = 1')
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
  });

  describe('Unique Indexes & Document Constraints (MongoDB)', () => {
    it('MongoDB rejects duplicate username on app_user collection', async () => {
      await expect(
        mongoDb.collection('app_user').insertOne({
          user_id: 9999,
          username: 'admin',
          password_hash: 'dummy',
          app_role: 'Administrator',
        })
      ).rejects.toThrow();
    });

    it('MongoDB rejects duplicate email on employee collection', async () => {
      const existing = await mongoDb.collection('employee').findOne();
      await expect(
        mongoDb.collection('employee').insertOne({
          emp_id: 9999,
          name: 'Clone Employee',
          email: existing.email,
          role: 'Engineer',
          department_id: 1,
        })
      ).rejects.toThrow();
    });
  });
});
