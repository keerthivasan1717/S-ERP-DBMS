-- S-ERP Database Schema for MySQL 8.4
-- Generated based on ER diagram and plan.md §3, §4

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS phase_report;
DROP TABLE IF EXISTS decision_risk;
DROP TABLE IF EXISTS process_indicator;
DROP TABLE IF EXISTS organization_dimension;
DROP TABLE IF EXISTS process_resource;
DROP TABLE IF EXISTS employee_project;
DROP TABLE IF EXISTS indicator_measurement;
DROP TABLE IF EXISTS report;
DROP TABLE IF EXISTS implementation_phase;
DROP TABLE IF EXISTS risk;
DROP TABLE IF EXISTS decision;
DROP TABLE IF EXISTS business_process;
DROP TABLE IF EXISTS resource;
DROP TABLE IF EXISTS app_user;
DROP TABLE IF EXISTS sustainability_indicator;
DROP TABLE IF EXISTS sustainability_dimension;
DROP TABLE IF EXISTS project_task;
DROP TABLE IF EXISTS project;
DROP TABLE IF EXISTS employee;
DROP TABLE IF EXISTS department;
DROP TABLE IF EXISTS organization;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Organization
CREATE TABLE organization (
  org_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  address VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Department
CREATE TABLE department (
  dept_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  parent_dept_id INT NULL,
  org_id INT NOT NULL,
  CONSTRAINT fk_dept_parent FOREIGN KEY (parent_dept_id) REFERENCES department(dept_id) ON DELETE SET NULL,
  CONSTRAINT fk_dept_org FOREIGN KEY (org_id) REFERENCES organization(org_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_dept_parent ON department(parent_dept_id);
CREATE INDEX idx_dept_org ON department(org_id);

-- 3. Employee
CREATE TABLE employee (
  emp_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(100) NOT NULL,
  department_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES department(dept_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_emp_dept ON employee(department_id);

-- 4. App User (G8)
CREATE TABLE app_user (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  app_role VARCHAR(50) NOT NULL,
  emp_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_emp FOREIGN KEY (emp_id) REFERENCES employee(emp_id) ON DELETE SET NULL,
  CONSTRAINT chk_user_role CHECK (app_role IN ('Administrator', 'Strategic Manager', 'Tactical Manager', 'Operational User'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_user_emp ON app_user(emp_id);

-- 5. Project
CREATE TABLE project (
  project_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Planned',
  department_id INT NOT NULL,
  CONSTRAINT fk_proj_dept FOREIGN KEY (department_id) REFERENCES department(dept_id) ON DELETE RESTRICT,
  CONSTRAINT chk_proj_status CHECK (status IN ('Planned', 'Active', 'On Hold', 'Completed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_proj_dept ON project(department_id);

-- 6. Project Task
CREATE TABLE project_task (
  task_id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Planned',
  start_date DATE NOT NULL,
  end_date DATE NULL,
  CONSTRAINT fk_task_proj FOREIGN KEY (project_id) REFERENCES project(project_id) ON DELETE CASCADE,
  CONSTRAINT chk_task_status CHECK (status IN ('Planned', 'Active', 'On Hold', 'Completed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_task_proj ON project_task(project_id);

-- 7. Employee Project Bridge
CREATE TABLE employee_project (
  emp_id INT NOT NULL,
  project_id INT NOT NULL,
  role VARCHAR(100) NOT NULL,
  allocation_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  PRIMARY KEY (emp_id, project_id),
  CONSTRAINT fk_ep_emp FOREIGN KEY (emp_id) REFERENCES employee(emp_id) ON DELETE CASCADE,
  CONSTRAINT fk_ep_proj FOREIGN KEY (project_id) REFERENCES project(project_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_ep_proj ON employee_project(project_id);

-- 8. Sustainability Dimension
CREATE TABLE sustainability_dimension (
  dimension_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL,
  CONSTRAINT chk_dim_name CHECK (name IN ('Environmental', 'Social', 'Economic'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Sustainability Indicator
CREATE TABLE sustainability_indicator (
  indicator_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  unit VARCHAR(50) NOT NULL,
  dimension_id INT NOT NULL,
  department_id INT NULL,
  CONSTRAINT fk_ind_dim FOREIGN KEY (dimension_id) REFERENCES sustainability_dimension(dimension_id) ON DELETE RESTRICT,
  CONSTRAINT fk_ind_dept FOREIGN KEY (department_id) REFERENCES department(dept_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_ind_dim ON sustainability_indicator(dimension_id);
CREATE INDEX idx_ind_dept ON sustainability_indicator(department_id);

-- 10. Indicator Measurement
CREATE TABLE indicator_measurement (
  measurement_id INT AUTO_INCREMENT PRIMARY KEY,
  indicator_id INT NOT NULL,
  value DECIMAL(14,4) NOT NULL,
  measurement_date DATE NOT NULL,
  source VARCHAR(255) NOT NULL,
  recorded_by INT NULL,
  CONSTRAINT fk_meas_ind FOREIGN KEY (indicator_id) REFERENCES sustainability_indicator(indicator_id) ON DELETE CASCADE,
  CONSTRAINT fk_meas_user FOREIGN KEY (recorded_by) REFERENCES app_user(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_meas_ind ON indicator_measurement(indicator_id);
CREATE INDEX idx_meas_user ON indicator_measurement(recorded_by);

-- 11. Resource
CREATE TABLE resource (
  resource_id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  unit VARCHAR(50) NOT NULL,
  CONSTRAINT chk_res_type CHECK (type IN ('Energy', 'Water', 'Material', 'Financial'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Business Process
CREATE TABLE business_process (
  process_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  department_id INT NOT NULL,
  CONSTRAINT fk_proc_dept FOREIGN KEY (department_id) REFERENCES department(dept_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_proc_dept ON business_process(department_id);

-- 13. Process Resource Bridge
CREATE TABLE process_resource (
  process_id INT NOT NULL,
  resource_id INT NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  PRIMARY KEY (process_id, resource_id),
  CONSTRAINT fk_pr_proc FOREIGN KEY (process_id) REFERENCES business_process(process_id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_res FOREIGN KEY (resource_id) REFERENCES resource(resource_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_pr_res ON process_resource(resource_id);

-- 14. Decision
CREATE TABLE decision (
  decision_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  decision_level VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  created_by INT NOT NULL,
  project_id INT NULL,
  process_id INT NULL,
  CONSTRAINT fk_dec_emp FOREIGN KEY (created_by) REFERENCES employee(emp_id) ON DELETE RESTRICT,
  CONSTRAINT fk_dec_proj FOREIGN KEY (project_id) REFERENCES project(project_id) ON DELETE SET NULL,
  CONSTRAINT fk_dec_proc FOREIGN KEY (process_id) REFERENCES business_process(process_id) ON DELETE SET NULL,
  CONSTRAINT chk_dec_level CHECK (decision_level IN ('Strategic', 'Tactical', 'Operational'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_dec_emp ON decision(created_by);
CREATE INDEX idx_dec_proj ON decision(project_id);
CREATE INDEX idx_dec_proc ON decision(process_id);

-- 15. Risk
CREATE TABLE risk (
  risk_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  level VARCHAR(50) NOT NULL,
  project_id INT NOT NULL,
  CONSTRAINT fk_risk_proj FOREIGN KEY (project_id) REFERENCES project(project_id) ON DELETE CASCADE,
  CONSTRAINT chk_risk_level CHECK (level IN ('Low', 'Medium', 'High'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_risk_proj ON risk(project_id);

-- 16. Implementation Phase
CREATE TABLE implementation_phase (
  phase_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  project_id INT NOT NULL,
  CONSTRAINT fk_phase_proj FOREIGN KEY (project_id) REFERENCES project(project_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_phase_proj ON implementation_phase(project_id);

-- 17. Report
CREATE TABLE report (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  generated_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  file_path VARCHAR(500) NULL,
  CONSTRAINT fk_rep_emp FOREIGN KEY (generated_by) REFERENCES employee(emp_id) ON DELETE RESTRICT,
  CONSTRAINT chk_rep_type CHECK (type IN ('Sustainability', 'Performance'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_rep_emp ON report(generated_by);

-- Bridge / Gap Tables (G1, G3, G5, G7)

-- G1: Organization focuses on Dimension
CREATE TABLE organization_dimension (
  org_id INT NOT NULL,
  dimension_id INT NOT NULL,
  PRIMARY KEY (org_id, dimension_id),
  CONSTRAINT fk_od_org FOREIGN KEY (org_id) REFERENCES organization(org_id) ON DELETE CASCADE,
  CONSTRAINT fk_od_dim FOREIGN KEY (dimension_id) REFERENCES sustainability_dimension(dimension_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_od_dim ON organization_dimension(dimension_id);

-- G3: Business Process ↔ Sustainability Indicator
CREATE TABLE process_indicator (
  process_id INT NOT NULL,
  indicator_id INT NOT NULL,
  PRIMARY KEY (process_id, indicator_id),
  CONSTRAINT fk_pi_proc FOREIGN KEY (process_id) REFERENCES business_process(process_id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_ind FOREIGN KEY (indicator_id) REFERENCES sustainability_indicator(indicator_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_pi_ind ON process_indicator(indicator_id);

-- G5: Decision ↔ Risk
CREATE TABLE decision_risk (
  decision_id INT NOT NULL,
  risk_id INT NOT NULL,
  PRIMARY KEY (decision_id, risk_id),
  CONSTRAINT fk_dr_dec FOREIGN KEY (decision_id) REFERENCES decision(decision_id) ON DELETE CASCADE,
  CONSTRAINT fk_dr_risk FOREIGN KEY (risk_id) REFERENCES risk(risk_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_dr_risk ON decision_risk(risk_id);

-- G7: Implementation Phase ↔ Report
CREATE TABLE phase_report (
  phase_id INT NOT NULL,
  report_id INT NOT NULL,
  PRIMARY KEY (phase_id, report_id),
  CONSTRAINT fk_pr_phase FOREIGN KEY (phase_id) REFERENCES implementation_phase(phase_id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_report FOREIGN KEY (report_id) REFERENCES report(report_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_pr_report ON phase_report(report_id);
