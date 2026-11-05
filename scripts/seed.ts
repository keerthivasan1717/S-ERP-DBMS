import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import pg from 'pg';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { MongoAdapter } from '../server/src/db/adapter.js';
import { migrateMySQL, migratePostgres, migrateMongo } from './migrate.js';

dotenv.config();

const { Pool: PgPool } = pg;

export interface SeedOptions {
  reset?: boolean;
}

export async function seedMySQL(options: SeedOptions = {}): Promise<void> {
  if (options.reset) {
    await migrateMySQL();
  }

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3307,
    user: process.env.MYSQL_USER || 'serp',
    password: process.env.MYSQL_PASSWORD || 'serp_password',
    database: process.env.MYSQL_DATABASE || 'serp',
  });

  try {
    console.log('[MySQL] Seeding database...');

    // Clear existing data in reverse order if not already migrated
    if (!options.reset) {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      const tables = [
        'phase_report', 'decision_risk', 'process_indicator', 'organization_dimension',
        'process_resource', 'employee_project', 'indicator_measurement', 'report',
        'implementation_phase', 'risk', 'decision', 'business_process', 'resource',
        'app_user', 'sustainability_indicator', 'sustainability_dimension',
        'project_task', 'project', 'employee', 'department', 'organization'
      ];
      for (const t of tables) {
        await connection.query(`TRUNCATE TABLE ${t}`);
      }
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    await seedData(async (sql: string, params: any[] = []) => {
      const [result]: any = await connection.query(sql, params);
      return result.insertId || result.affectedRows;
    });

    console.log('[MySQL] Seeding completed.');
  } finally {
    await connection.end();
  }
}

export async function seedMongo(options: SeedOptions = {}): Promise<void> {
  if (options.reset) {
    await migrateMongo();
  }

  const host = process.env.MONGO_HOST || '127.0.0.1';
  const port = Number(process.env.MONGO_PORT) || 27017;
  const dbName = process.env.MONGO_DATABASE || 'serp';
  const user = process.env.MONGO_USER || 'serp';
  const pass = process.env.MONGO_PASSWORD || 'serp_password';
  const uri = `mongodb://${user}:${pass}@${host}:${port}/${dbName}?authSource=admin`;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    console.log('[MongoDB] Seeding database...');

    const tables = [
      'phase_report', 'decision_risk', 'process_indicator', 'organization_dimension',
      'process_resource', 'employee_project', 'indicator_measurement', 'report',
      'implementation_phase', 'risk', 'decision', 'business_process', 'resource',
      'app_user', 'sustainability_indicator', 'sustainability_dimension',
      'project_task', 'project', 'employee', 'department', 'organization'
    ];
    for (const t of tables) {
      await db.collection(t).deleteMany({});
    }

    const adapter = new MongoAdapter(db);
    await seedData(async (sql: string, params: any[] = []) => {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('INSERT')) {
        return adapter.insert(sql, params);
      }
      return adapter.execute(sql, params);
    });

    console.log('[MongoDB] Seeding completed.');
  } finally {
    await client.close();
  }
}

export async function seedPostgres(options: SeedOptions = {}): Promise<void> {
  if (options.reset) {
    await migratePostgres();
  }

  const pool = new PgPool({
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT) || 5434,
    user: process.env.PGUSER || 'serp',
    password: process.env.PGPASSWORD || 'serp_password',
    database: process.env.PGDATABASE || 'serp',
  });

  try {
    console.log('[PostgreSQL] Seeding database...');

    if (!options.reset) {
      const tables = [
        'phase_report', 'decision_risk', 'process_indicator', 'organization_dimension',
        'process_resource', 'employee_project', 'indicator_measurement', 'report',
        'implementation_phase', 'risk', 'decision', 'business_process', 'resource',
        'app_user', 'sustainability_indicator', 'sustainability_dimension',
        'project_task', 'project', 'employee', 'department', 'organization'
      ];
      await pool.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
    }

    await seedData(async (sql: string, params: any[] = []) => {
      // Convert ? to $1, $2, ...
      let paramIdx = 1;
      let pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING *';
      }
      const res = await pool.query(pgSql, params);
      if (res.rows.length > 0) {
        const firstRow = res.rows[0];
        const idKey = Object.keys(firstRow).find(k => k.endsWith('_id') || k === 'id');
        return idKey ? firstRow[idKey] : res.rowCount;
      }
      return res.rowCount;
    });

    console.log('[PostgreSQL] Seeding completed.');
  } finally {
    await pool.end();
  }
}

async function seedData(exec: (sql: string, params: any[]) => Promise<any>): Promise<void> {
  // 1. Organization
  const orgId = await exec(
    'INSERT INTO organization (name, description, address) VALUES (?, ?, ?)',
    ['Oscorp Industries', 'Multinational conglomerate specializing in defense, bio-chemical research, and sustainable engineering', 'Oscorp Tower, Manhattan, New York, NY 10001']
  );

  // 2. Departments
  const deptExec = await exec(
    'INSERT INTO department (name, description, parent_dept_id, org_id) VALUES (?, ?, NULL, ?)',
    ['Executive Board', 'Strategic leadership and corporate governance', orgId]
  );
  const deptOps = await exec(
    'INSERT INTO department (name, description, parent_dept_id, org_id) VALUES (?, ?, ?, ?)',
    ['Operations & Manufacturing', 'Production, plant facilities and supply chain operations', deptExec, orgId]
  );
  const deptSust = await exec(
    'INSERT INTO department (name, description, parent_dept_id, org_id) VALUES (?, ?, ?, ?)',
    ['Sustainability & Compliance', 'Environmental stewardship, ESG metrics and regulatory reporting', deptExec, orgId]
  );
  const deptHR = await exec(
    'INSERT INTO department (name, description, parent_dept_id, org_id) VALUES (?, ?, ?, ?)',
    ['Human Resources', 'People operations, workplace safety, and training', deptExec, orgId]
  );
  const deptRD = await exec(
    'INSERT INTO department (name, description, parent_dept_id, org_id) VALUES (?, ?, ?, ?)',
    ['Research & Development', 'Clean technology innovation and product lifecycle engineering', deptOps, orgId]
  );

  // 3. Employees (~12 employees: pop-culture & cinema figures under @oscorp.com)
  const empAdmin = await exec(
    'INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)',
    ['Tiger Muthuvel Pandian', 'tiger.pandian@oscorp.com', 'Director of Workplace Vigilance & System Administrator', deptExec]
  );
  const empStrat = await exec(
    'INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)',
    ['Stephen Strange', 'stephen.strange@oscorp.com', 'Chief Sustainability Officer', deptSust]
  );
  const empTact = await exec(
    'INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)',
    ['Manickam Baashha', 'manickam.baashha@oscorp.com', 'Operations & Logistics Project Director', deptOps]
  );
  const empOper = await exec(
    'INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)',
    ['John Durairaj', 'john.durairaj@oscorp.com', 'Environmental Field Specialist', deptSust]
  );

  // Remaining staff
  const emp5 = await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Bruce Banner', 'bruce.banner@oscorp.com', 'Chief Science Officer & Bio-Research', deptRD]);
  const emp6 = await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Steve Rogers', 'steve.rogers@oscorp.com', 'Field Operations Director', deptOps]);
  const emp7 = await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Tony Stark', 'tony.stark@oscorp.com', 'Chief Technology Officer & Systems Architect', deptRD]);
  const emp8 = await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['William Butcher', 'william.butcher@oscorp.com', 'Workplace Safety & Compliance Enforcer', deptHR]);
  const emp9 = await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Wei Shen', 'wei.shen@oscorp.com', 'Senior ESG Quality Auditor', deptSust]);
  const emp10 = await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Niko Bellic', 'niko.bellic@oscorp.com', 'Plant Logistics & Fleet Supervisor', deptOps]);
  const emp11 = await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Sathyamoorthy', 'sathyamoorthy@oscorp.com', 'Clean Energy Grid Specialist', deptRD]);
  const emp12 = await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Red Dragon', 'red.dragon@oscorp.com', 'Advanced Clean Propulsion Engineer', deptRD]);

  // Expanded Cinema & Marvel / DC figures at Oscorp
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Norman Osborn', 'norman.osborn@oscorp.com', 'Executive Chairman & Founder', deptExec]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Durai Singam', 'durai.singam@oscorp.com', 'Chief Regulatory & Anti-Corruption Officer', deptExec]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Matt Murdock', 'matt.murdock@oscorp.com', 'General Counsel & ESG Legal Affairs', deptExec]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Velu Nayakar', 'velu.nayakar@oscorp.com', 'Head of Port Operations & Shipping', deptOps]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Annamalai', 'annamalai@oscorp.com', 'Director of Sustainable Agro & Dairy Supply', deptOps]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Dilli', 'dilli@oscorp.com', 'Heavy Transport & Logistics Specialist', deptOps]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Kabali', 'kabali@oscorp.com', 'VP of Workforce Welfare & Community Integration', deptHR]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Leo Das', 'leo.das@oscorp.com', 'Industrial Security & Surveillance Lead', deptHR]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['John Wick', 'john.wick@oscorp.com', 'Executive Facilities Security Specialist', deptHR]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Rolex', 'rolex@oscorp.com', 'Tier-1 Supply Chain Compliance Auditor', deptSust]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Dr. Vaseegaran', 'vaseegaran@oscorp.com', 'Director of Robotics & Automation', deptRD]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Peter Parker', 'peter.parker@oscorp.com', 'Bio-Polymer Research Scientist', deptRD]);
  await exec('INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)', ['Victor Von Doom', 'victor.doom@oscorp.com', 'Principal Metallurgy & Clean Energy Consultant', deptRD]);

  // 4. App Users (4 demo accounts)
  // Password for all demo accounts: 1234
  const hashAll = bcrypt.hashSync('1234', 12);

  const userAdmin = await exec(
    'INSERT INTO app_user (username, password_hash, app_role, emp_id, is_active) VALUES (?, ?, ?, ?, ?)',
    ['admin', hashAll, 'Administrator', empAdmin, 1]
  );
  const userStrat = await exec(
    'INSERT INTO app_user (username, password_hash, app_role, emp_id, is_active) VALUES (?, ?, ?, ?, ?)',
    ['strategic', hashAll, 'Strategic Manager', empStrat, 1]
  );
  const userTact = await exec(
    'INSERT INTO app_user (username, password_hash, app_role, emp_id, is_active) VALUES (?, ?, ?, ?, ?)',
    ['tactical', hashAll, 'Tactical Manager', empTact, 1]
  );
  const userOper = await exec(
    'INSERT INTO app_user (username, password_hash, app_role, emp_id, is_active) VALUES (?, ?, ?, ?, ?)',
    ['operator', hashAll, 'Operational User', empOper, 1]
  );

  // 5. Sustainability Dimensions
  const dimEnv = await exec('INSERT INTO sustainability_dimension (name, description) VALUES (?, ?)', [
    'Environmental', 'Protection of natural eco-systems, resource conservation, emissions reduction, and waste mitigation'
  ]);
  const dimSoc = await exec('INSERT INTO sustainability_dimension (name, description) VALUES (?, ?)', [
    'Social', 'Workforce well-being, community engagement, accessibility, health, security, and human rights'
  ]);
  const dimEco = await exec('INSERT INTO sustainability_dimension (name, description) VALUES (?, ?)', [
    'Economic', 'Financial health, cost management, clean technology investment, and operational efficiency'
  ]);

  // G1: Organization focuses on Dimensions
  await exec('INSERT INTO organization_dimension (org_id, dimension_id) VALUES (?, ?)', [orgId, dimEnv]);
  await exec('INSERT INTO organization_dimension (org_id, dimension_id) VALUES (?, ?)', [orgId, dimSoc]);
  await exec('INSERT INTO organization_dimension (org_id, dimension_id) VALUES (?, ?)', [orgId, dimEco]);

  // 6. Sustainability Indicators (Fig. 5 in paper)
  // Environmental: Soil, Water, Atmosphere, Biodiversity, Resources, Energy, Landscape, Waste, Risks
  const indWater = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Water', 'Industrial freshwater withdrawal and consumption across manufacturing lines', 'm³', dimEnv, deptOps
  ]);
  const indAtm = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Atmosphere', 'Scope 1 and Scope 2 direct and indirect greenhouse gas emissions', 'tCO2e', dimEnv, deptSust
  ]);
  const indEnergy = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Energy', 'Total electricity and thermal energy consumed across operations', 'MWh', dimEnv, deptOps
  ]);
  const indWaste = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Waste', 'Solid and hazardous industrial waste redirected from landfills', 'tonnes', dimEnv, deptSust
  ]);
  const indBio = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Biodiversity', 'Local conservation and ecosystem health assessment index', 'Index (0-100)', dimEnv, deptSust
  ]);

  // Social: Culture, Accessibility, Participation, Security, Public utility, Social integration, Responsibility
  const indSec = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Security', 'Lost Time Injury Frequency Rate (LTIFR) per 100k employee hours', 'LTIFR', dimSoc, deptHR
  ]);
  const indPart = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Participation', 'Employee participation rate in ESG initiatives and safety committees', '%', dimSoc, deptHR
  ]);
  const indResp = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Responsibility', 'Tier-1 supply chain sustainability and labor standards compliance', '% audited', dimSoc, deptSust
  ]);

  // Economic: Costs, Technical requirements, Bureaucracy, Social economy, Heritage
  const indCosts = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Costs', 'Operational cost of environmental compliance and pollution abatement', 'USD k', dimEco, deptSust
  ]);
  const indTech = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Technical requirements', 'Share of production assets upgraded to high-efficiency standards', '%', dimEco, deptOps
  ]);
  const indSocEco = await exec('INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)', [
    'Social economy', 'Local and regional supplier procurement share', '%', dimEco, deptOps
  ]);

  // 7. Indicator Measurements (~3 months of measurements)
  const measurements = [
    // Water
    { ind: indWater, val: 1420.50, date: '2026-08-15', src: 'Water Meter Station A', by: userOper },
    { ind: indWater, val: 1385.20, date: '2026-09-15', src: 'Water Meter Station A', by: userOper },
    { ind: indWater, val: 1290.00, date: '2026-10-15', src: 'Water Meter Station A', by: userOper },
    // Atmosphere
    { ind: indAtm, val: 342.80, date: '2026-08-30', src: 'CEMS Flue Sensor 1', by: userOper },
    { ind: indAtm, val: 325.40, date: '2026-09-30', src: 'CEMS Flue Sensor 1', by: userOper },
    { ind: indAtm, val: 310.15, date: '2026-10-25', src: 'CEMS Flue Sensor 1', by: userOper },
    // Energy
    { ind: indEnergy, val: 890.00, date: '2026-08-31', src: 'Main Grid Inverter Meter', by: userOper },
    { ind: indEnergy, val: 865.50, date: '2026-09-30', src: 'Main Grid Inverter Meter', by: userOper },
    { ind: indEnergy, val: 830.20, date: '2026-10-28', src: 'Main Grid Inverter Meter', by: userOper },
    // Waste
    { ind: indWaste, val: 18.40, date: '2026-08-20', src: 'Facility Weighbridge Log', by: userOper },
    { ind: indWaste, val: 16.20, date: '2026-09-22', src: 'Facility Weighbridge Log', by: userOper },
    { ind: indWaste, val: 14.80, date: '2026-10-20', src: 'Facility Weighbridge Log', by: userOper },
    // Security
    { ind: indSec, val: 0.85, date: '2026-08-31', src: 'EHS Incident Database', by: userOper },
    { ind: indSec, val: 0.40, date: '2026-09-30', src: 'EHS Incident Database', by: userOper },
    { ind: indSec, val: 0.00, date: '2026-10-28', src: 'EHS Incident Database', by: userOper },
    // Costs
    { ind: indCosts, val: 145.00, date: '2026-08-31', src: 'Monthly Financial Ledger', by: userOper },
    { ind: indCosts, val: 138.50, date: '2026-09-30', src: 'Monthly Financial Ledger', by: userOper },
    { ind: indCosts, val: 125.00, date: '2026-10-28', src: 'Monthly Financial Ledger', by: userOper },
  ];

  for (const m of measurements) {
    await exec(
      'INSERT INTO indicator_measurement (indicator_id, value, measurement_date, source, recorded_by) VALUES (?, ?, ?, ?, ?)',
      [m.ind, m.val, m.date, m.src, m.by]
    );
  }

  // 8. Project: "S-ERP Rollout"
  const projId = await exec(
    'INSERT INTO project (name, description, start_date, end_date, status, department_id) VALUES (?, ?, ?, ?, ?, ?)',
    ['S-ERP Rollout', 'Enterprise-wide sustainable ERP integration incorporating environmental & social governance', '2026-01-15', '2026-12-31', 'Active', deptOps]
  );

  // 9. Implementation Phases (Pre-implementation, Implementation, Post-implementation)
  const phase1 = await exec(
    'INSERT INTO implementation_phase (name, description, start_date, end_date, project_id) VALUES (?, ?, ?, ?, ?)',
    ['Pre-implementation', 'System architecture design, stakeholder alignment, requirements gathering', '2026-01-15', '2026-04-30', projId]
  );
  const phase2 = await exec(
    'INSERT INTO implementation_phase (name, description, start_date, end_date, project_id) VALUES (?, ?, ?, ?, ?)',
    ['Implementation', 'Database setup, adapter configuration, module integration, data migration', '2026-05-01', '2026-10-31', projId]
  );
  const phase3 = await exec(
    'INSERT INTO implementation_phase (name, description, start_date, end_date, project_id) VALUES (?, ?, ?, ?, ?)',
    ['Post-implementation', 'System validation, continuous monitoring, KPI audits, staff retraining', '2026-11-01', '2026-12-31', projId]
  );

  // 10. Project Tasks (5 tasks)
  const task1 = await exec(
    'INSERT INTO project_task (project_id, name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [projId, 'Requirements & Indicator Matrix', 'Finalize sustainability indicators and data sources', 'Completed', '2026-01-20', '2026-03-15']
  );
  const task2 = await exec(
    'INSERT INTO project_task (project_id, name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [projId, 'Dual-Engine Schema Deployment', 'Configure and verify schemas on MySQL 8.4 and PostgreSQL 16', 'Completed', '2026-05-01', '2026-06-30']
  );
  const task3 = await exec(
    'INSERT INTO project_task (project_id, name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [projId, 'Decisional Paradigm Integration', 'Implement role-based authorization for Strategic, Tactical, and Operational tiers', 'Active', '2026-07-01', '2026-09-30']
  );
  const task4 = await exec(
    'INSERT INTO project_task (project_id, name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [projId, 'Field Measurement Collection Interface', 'Deploy entry screens for operator measurement logs', 'Active', '2026-09-01', '2026-10-31']
  );
  const task5 = await exec(
    'INSERT INTO project_task (project_id, name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [projId, 'Sustainability Audit & Reporting', 'Run full ESG verification report against seeded metrics', 'Planned', '2026-11-01', '2026-12-15']
  );

  // 11. Employee-Project Bridge
  await exec(
    'INSERT INTO employee_project (emp_id, project_id, role, allocation_percentage) VALUES (?, ?, ?, ?)',
    [empTact, projId, 'Project Lead', 80.00]
  );
  await exec(
    'INSERT INTO employee_project (emp_id, project_id, role, allocation_percentage) VALUES (?, ?, ?, ?)',
    [empOper, projId, 'Field Data Collector', 60.00]
  );
  await exec(
    'INSERT INTO employee_project (emp_id, project_id, role, allocation_percentage) VALUES (?, ?, ?, ?)',
    [empStrat, projId, 'Executive Sponsor', 20.00]
  );

  // Sample Project 2: Performance-enhancing project
  const projPerf = await exec(
    'INSERT INTO project (name, description, start_date, end_date, status, department_id) VALUES (?, ?, ?, ?, ?, ?)',
    ['Performance-enhancing project', 'Cross-departmental initiative optimizing production throughput, energy efficiency, and operational speed', '2026-03-01', '2026-11-30', 'Active', deptOps]
  );

  await exec(
    'INSERT INTO implementation_phase (name, description, start_date, end_date, project_id) VALUES (?, ?, ?, ?, ?)',
    ['Performance Assessment', 'Baseline throughput analysis and friction loss calculation', '2026-03-01', '2026-05-31', projPerf]
  );
  await exec(
    'INSERT INTO implementation_phase (name, description, start_date, end_date, project_id) VALUES (?, ?, ?, ?, ?)',
    ['Optimization Deployment', 'Hardware acceleration and control loop recalibration', '2026-06-01', '2026-11-30', projPerf]
  );

  await exec(
    'INSERT INTO project_task (project_id, name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [projPerf, 'Assembly Line Speed Optimization', 'Calibrate automated conveyor belts and robotic arms for 15% throughput enhancement', 'Active', '2026-03-10', '2026-08-15']
  );
  await exec(
    'INSERT INTO project_task (project_id, name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [projPerf, 'Thermal Heat Capture & Regeneration', 'Reroute furnace exhaust heat to pre-warm boiler feedwater', 'Planned', '2026-09-01', '2026-11-30']
  );

  await exec(
    'INSERT INTO employee_project (emp_id, project_id, role, allocation_percentage) VALUES (?, ?, ?, ?)',
    [empTact, projPerf, 'Operations Project Director', 40.00]
  );
  await exec(
    'INSERT INTO employee_project (emp_id, project_id, role, allocation_percentage) VALUES (?, ?, ?, ?)',
    [empOper, projPerf, 'Telemetry Field Operator', 30.00]
  );

  // 12. Resources (6 resources across Energy, Water, Material, Financial)
  const resSolar = await exec('INSERT INTO resource (type, name, description, unit) VALUES (?, ?, ?, ?)', [
    'Energy', 'On-site Solar Photovoltaic Farm', '500kW rooftop solar array feeding production cells', 'kWh'
  ]);
  const resRecWater = await exec('INSERT INTO resource (type, name, description, unit) VALUES (?, ?, ?, ?)', [
    'Water', 'Closed-loop Water Reclamation Facility', 'Industrial wastewater treatment and recycling plant', 'm³'
  ]);
  const resSteel = await exec('INSERT INTO resource (type, name, description, unit) VALUES (?, ?, ?, ?)', [
    'Material', 'Certified Low-Carbon Steel Billets', 'Recycled steel stock with verified EPD documentation', 'tonnes'
  ]);
  const resBioPoly = await exec('INSERT INTO resource (type, name, description, unit) VALUES (?, ?, ?, ?)', [
    'Material', 'Bio-based Polymer Resin', 'Plant-derived polymer for casing injection molding', 'kg'
  ]);
  const resBudget = await exec('INSERT INTO resource (type, name, description, unit) VALUES (?, ?, ?, ?)', [
    'Financial', 'Clean Technology Capital Fund', 'Dedicated CAPEX allocation for efficiency retrofits', 'USD'
  ]);
  const resGreenLoan = await exec('INSERT INTO resource (type, name, description, unit) VALUES (?, ?, ?, ?)', [
    'Financial', 'Sustainability-Linked Revolving Credit', 'Low-interest bank facility tied to carbon targets', 'USD'
  ]);

  // 13. Business Processes (4 processes)
  const procSolar = await exec('INSERT INTO business_process (name, description, department_id) VALUES (?, ?, ?)', [
    'Solar Generation & Peak Shaving', 'Optimizing on-site solar output to reduce grid peak demand', deptOps
  ]);
  const procWater = await exec('INSERT INTO business_process (name, description, department_id) VALUES (?, ?, ?)', [
    'Cooling Tower Water Recirculation', 'Closed-loop recirculation monitoring in cooling circuits', deptOps
  ]);
  const procWaste = await exec('INSERT INTO business_process (name, description, department_id) VALUES (?, ?, ?)', [
    'Scrap Segregation & Upcycling', 'Real-time classification and recovery of scrap materials', deptOps
  ]);
  const procAudit = await exec('INSERT INTO business_process (name, description, department_id) VALUES (?, ?, ?)', [
    'Supplier ESG Verification Audit', 'Bi-annual on-site and documentary audit of Tier-1 vendors', deptSust
  ]);

  // Process-Resource Links
  await exec('INSERT INTO process_resource (process_id, resource_id, quantity, unit) VALUES (?, ?, ?, ?)', [procSolar, resSolar, 12000.00, 'kWh']);
  await exec('INSERT INTO process_resource (process_id, resource_id, quantity, unit) VALUES (?, ?, ?, ?)', [procWater, resRecWater, 450.00, 'm³']);
  await exec('INSERT INTO process_resource (process_id, resource_id, quantity, unit) VALUES (?, ?, ?, ?)', [procWaste, resSteel, 25.00, 'tonnes']);
  await exec('INSERT INTO process_resource (process_id, resource_id, quantity, unit) VALUES (?, ?, ?, ?)', [procAudit, resBudget, 15000.00, 'USD']);

  // G3: Process-Indicator Links
  await exec('INSERT INTO process_indicator (process_id, indicator_id) VALUES (?, ?)', [procSolar, indEnergy]);
  await exec('INSERT INTO process_indicator (process_id, indicator_id) VALUES (?, ?)', [procWater, indWater]);
  await exec('INSERT INTO process_indicator (process_id, indicator_id) VALUES (?, ?)', [procWaste, indWaste]);
  await exec('INSERT INTO process_indicator (process_id, indicator_id) VALUES (?, ?)', [procAudit, indResp]);

  // 14. Risks (3 risks: Low, Medium, High)
  const risk1 = await exec('INSERT INTO risk (title, description, level, project_id) VALUES (?, ?, ?, ?)', [
    'Grid Interconnection Delay', 'Utility permit delay for connecting supplemental solar inverter', 'Medium', projId
  ]);
  const risk2 = await exec('INSERT INTO risk (title, description, level, project_id) VALUES (?, ?, ?, ?)', [
    'Carbon Measurement Sensor Drift', 'Optical dust sensor fouling causing inaccurate flue gas telemetry', 'High', projId
  ]);
  const risk3 = await exec('INSERT INTO risk (title, description, level, project_id) VALUES (?, ?, ?, ?)', [
    'Operator Training Lag', 'Slower initial entry rate during the first two weeks of manual logging', 'Low', projId
  ]);

  // 15. Decisions (3 decisions: Strategic, Tactical, Operational)
  const dec1 = await exec(
    'INSERT INTO decision (title, description, decision_level, date, created_by, project_id, process_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['Adopt Dual-Database Architecture', 'Standardize on MySQL and PostgreSQL interchangeability for client flexibility', 'Strategic', '2026-02-10', empStrat, projId, null]
  );
  const dec2 = await exec(
    'INSERT INTO decision (title, description, decision_level, date, created_by, project_id, process_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['Deploy Automated Purge Cycle for Flue Sensors', 'Install automated high-pressure air blowers to mitigate sensor drift', 'Tactical', '2026-06-18', empTact, projId, procSolar]
  );
  const dec3 = await exec(
    'INSERT INTO decision (title, description, decision_level, date, created_by, project_id, process_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['Shift Weekly Water Meter Readings to Monday Morning', 'Standardize calibration time for consistent weekly trend comparability', 'Operational', '2026-08-01', empOper, projId, procWater]
  );

  // G5: Decision-Risk Links
  await exec('INSERT INTO decision_risk (decision_id, risk_id) VALUES (?, ?)', [dec2, risk2]);

  // 16. Reports (2 reports)
  const rep1 = await exec('INSERT INTO report (title, type, generated_by, file_path) VALUES (?, ?, ?, ?)', [
    'Q3 Sustainability Performance Review', 'Sustainability', empStrat, '/docs/reports/generated/q3_sustainability.pdf'
  ]);
  const rep2 = await exec('INSERT INTO report (title, type, generated_by, file_path) VALUES (?, ?, ?, ?)', [
    'S-ERP Implementation Milestone Audit', 'Performance', empTact, '/docs/reports/generated/implementation_audit.pdf'
  ]);

  // G7: Phase-Report Links
  await exec('INSERT INTO phase_report (phase_id, report_id) VALUES (?, ?)', [phase1, rep2]);
  await exec('INSERT INTO phase_report (phase_id, report_id) VALUES (?, ?)', [phase2, rep1]);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const engineArg = args.find((a) => a.startsWith('--engine='));
  const engine = engineArg ? engineArg.split('=')[1] : null;

  if (engine === 'mysql') {
    await seedMySQL({ reset });
  } else if (engine === 'mongodb') {
    await seedMongo({ reset });
  } else if (engine === 'postgres') {
    await seedPostgres({ reset });
  } else {
    await seedMySQL({ reset });
    await seedMongo({ reset });
  }
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  main().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
