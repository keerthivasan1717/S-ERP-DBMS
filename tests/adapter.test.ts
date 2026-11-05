import { describe, it, expect, afterAll } from 'vitest';
import { getAdapter, closePools, EngineType } from '../server/src/db/adapter.js';

describe('M2: Database Adapter & Transaction Tests', () => {
  afterAll(async () => {
    await closePools();
  });

  const engines: EngineType[] = ['mysql', 'mongodb'];

  for (const engine of engines) {
    describe(`Adapter on Engine: ${engine}`, () => {
      const db = getAdapter(engine);

      it(`executes query and returns rows on ${engine}`, async () => {
        const rows = await db.query<any>('SELECT * FROM sustainability_dimension ORDER BY dimension_id');
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBe(3);
        const names = rows.map((r: any) => r.name);
        expect(names).toContain('Environmental');
        expect(names).toContain('Social');
        expect(names).toContain('Economic');
      });

      it(`retrieves a single row with one() on ${engine}`, async () => {
        const row = await db.one<any>('SELECT * FROM organization WHERE org_id = ?', [1]);
        expect(row).not.toBeNull();
        expect(row.name).toBe('Oscorp Industries');
      });

      it(`returns null when one() finds no record on ${engine}`, async () => {
        const row = await db.one<any>('SELECT * FROM organization WHERE org_id = ?', [999999]);
        expect(row).toBeNull();
      });

      it(`retrieves multiple rows with many() on ${engine}`, async () => {
        const depts = await db.many<any>('SELECT * FROM department');
        expect(depts.length).toBeGreaterThanOrEqual(5);
      });

      it(`inserts and executes updates within transactions on ${engine}`, async () => {
        const testDeptName = `Tx Test Dept ${Date.now()}`;

        await db.tx(async (txDb) => {
          const insertId = await txDb.insert(
            'INSERT INTO department (name, description, org_id) VALUES (?, ?, ?)',
            [testDeptName, 'Testing transactions', 1],
            'dept_id'
          );
          expect(insertId).toBeGreaterThan(0);

          const fetched = await txDb.one<any>('SELECT * FROM department WHERE dept_id = ?', [insertId]);
          expect(fetched.name).toBe(testDeptName);

          // Clean up within the transaction
          await txDb.execute('DELETE FROM department WHERE dept_id = ?', [insertId]);
        });

        // Verify it was cleaned up
        const check = await db.one<any>('SELECT * FROM department WHERE name = ?', [testDeptName]);
        expect(check).toBeNull();
      });

      if (engine === 'mysql') {
        it('rolls back transaction upon error on mysql', async () => {
          const rollbackDeptName = `Rollback Dept ${Date.now()}`;

          try {
            await db.tx(async (txDb) => {
              await txDb.insert(
                'INSERT INTO department (name, description, org_id) VALUES (?, ?, ?)',
                [rollbackDeptName, 'Should be rolled back', 1],
                'dept_id'
              );

              // Intentionally throw error to trigger rollback
              throw new Error('Simulated transaction failure');
            });
          } catch (err: any) {
            expect(err.message).toBe('Simulated transaction failure');
          }

          // Verify row does not exist
          const check = await db.one<any>('SELECT * FROM department WHERE name = ?', [rollbackDeptName]);
          expect(check).toBeNull();
        });
      }
    });
  }
});
