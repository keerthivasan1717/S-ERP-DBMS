// S-ERP MongoDB Database Initialization & Indexing Script
// Engine: NoSQL (MongoDB 6.0)

const collections = [
  'phase_report',
  'decision_risk',
  'process_indicator',
  'organization_dimension',
  'process_resource',
  'employee_project',
  'indicator_measurement',
  'report',
  'implementation_phase',
  'risk',
  'decision',
  'business_process',
  'resource',
  'app_user',
  'sustainability_indicator',
  'sustainability_dimension',
  'project_task',
  'project',
  'employee',
  'department',
  'organization'
];

db = db.getSiblingDB('serp');

collections.forEach(col => {
  if (!db.getCollectionNames().includes(col)) {
    db.createCollection(col);
  }
});

// Unique & Identity Indexes
db.app_user.createIndex({ username: 1 }, { unique: true });
db.employee.createIndex({ email: 1 }, { unique: true });
db.sustainability_dimension.createIndex({ name: 1 }, { unique: true });

// Relational Performance Indexes
db.department.createIndex({ org_id: 1 });
db.department.createIndex({ parent_dept_id: 1 });
db.employee.createIndex({ department_id: 1 });
db.project.createIndex({ department_id: 1 });
db.project_task.createIndex({ project_id: 1 });
db.employee_project.createIndex({ emp_id: 1, project_id: 1 }, { unique: true });
db.sustainability_indicator.createIndex({ dimension_id: 1 });
db.indicator_measurement.createIndex({ indicator_id: 1, measurement_date: 1 });
db.process_resource.createIndex({ process_id: 1, resource_id: 1 }, { unique: true });
db.decision.createIndex({ project_id: 1 });
db.decision.createIndex({ process_id: 1 });
db.risk.createIndex({ project_id: 1 });
db.implementation_phase.createIndex({ project_id: 1 });
db.organization_dimension.createIndex({ org_id: 1, dimension_id: 1 }, { unique: true });
db.process_indicator.createIndex({ process_id: 1, indicator_id: 1 }, { unique: true });
db.decision_risk.createIndex({ decision_id: 1, risk_id: 1 }, { unique: true });
db.phase_report.createIndex({ phase_id: 1, report_id: 1 }, { unique: true });

print('[MongoDB] Successfully initialized 21 collections and performance indexes.');
