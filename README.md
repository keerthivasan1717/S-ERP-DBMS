# Sustainable Enterprise Resource Planning (S-ERP) DBMS

A database management application for a Sustainable Enterprise Resource Planning (S-ERP) system, implemented in strict alignment with:

1. **Research Paper:** *Sustainable enterprise resource planning systems implementation: A framework development* (Chofreh, Goni, Klemeš, *Journal of Cleaner Production* 198, 2018).
2. **ER & Use Case Specification:** Domain relational model and role-based permissions documented in `docs/source/er-usecase.png`.

The system operates across **two interchangeable, independent database engines**:
- **SQL (MySQL 8.4)**
- **PostgreSQL 16**

The active database engine is selected by the user upon signing in.

---

## 1. System Architecture & Dual Engine Design

- **Backend Runtime:** Node.js 20 LTS with TypeScript (strict mode).
- **HTTP API:** Express 4 with schema-enforced request validation via `zod`.
- **Database Drivers:** Direct connection using `mysql2` and `pg`. **No ORM** is used; raw SQL demonstrates engine parity and differences.
- **Port Mapping:**
  - MySQL 8.4: Container port `3306` mapped to host port `3307` (avoids conflict with native MySQL on port 3306).
  - PostgreSQL 16: Container port `5432` mapped to host port `5434` (avoids conflict with native PostgreSQL on port 5432).
  - Ports can be customized in `.env`.
- **Memory Limits:** Both containers are strictly capped at `512MB` RAM in `docker-compose.yml`.

---

## 2. Prerequisites

- **Node.js:** v20 LTS (`v20.19.0` or higher)
- **npm:** v9 or higher
- **Docker & Docker Compose:** Docker 24+ with compose plugin

---

## 3. Clean-Clone Setup Guide

Follow these steps from a freshly cloned repository:

### Step 1: Clone and Configure Environment
```bash
git clone <repo-url> serp-dbms
cd serp-dbms

# Copy default environment configuration
cp .env.example .env
```

Review `.env` to verify ports and database credentials.

### Step 2: Start Database Containers
```bash
docker compose up -d
```

Verify that both containers are running and healthy:
```bash
docker compose ps
```

### Step 3: Install Dependencies
```bash
# If working on an NTFS/fuseblk drive, run with --ignore-scripts:
npm install --ignore-scripts
```

### Step 4: Run Migrations and Seed Both Engines
```bash
# Apply schemas to MySQL 8.4 and PostgreSQL 16
npm run migrate

# Seed demo dataset and accounts across both engines
npm run seed

# Verify schema and row count parity
npm run er-check
```

### Step 5: Run Typecheck, Lint, and Tests
```bash
npm run check
```
Runs TypeScript typechecking (`tsc`), ESLint, and Vitest testing parity across both database engines.

### Step 6: Build and Launch the Application
```bash
# Build server and web bundle
npm run build

# Start the unified server on port 3000
npm run dev:server
```
Access the application at `http://localhost:3000`. You can select either **SQL (MySQL 8.4)** or **PostgreSQL 16** right on the sign-in screen.

---

## 4. Demo Accounts & Credentials

*(Created during database seeding with bcrypt cost 12)*

| Role | Username | Password | Permitted Actions |
|---|---|---|---|
| **Administrator** | `admin` | `Admin#2026` | Full administrative control: User management, Departments, Employees, Organization profile |
| **Strategic Manager** | `strategic` | `Strat#2026` | Strategic decisions, Triple bottom line sustainability overview, Reports archive |
| **Tactical Manager** | `tactical` | `Tact#2026` | Projects, Work tasks, Roadmap phases, Risk logs, Business processes, Resource tracking |
| **Operational User** | `operator` | `Oper#2026` | Assigned work tasks, Daily sustainability telemetry & field measurement logging |

---

## 5. Prototype Implementation (P0–P4)

The prototype delivers a fully functional base model covering:
- **P0:** Foundations, dual Docker containers, engine status endpoint.
- **P1:** Complete dual-engine schema (21 tables), database adapter with parameter translation (`?` ↔ `$1`), signed session auth, and demo seed data.
- **P2:** Field-notebook / ledger design system, tokens, engine selector login, and role-differentiated sidebar navigation.
- **P3:** Plain CRUD across all entities (Users, Departments, Employees, Organization, Projects, Tasks, Phases, Risks, Processes, Resources, Decisions, Indicators, Measurements, Reports).
- **P4:** Role-tailored home dashboards displaying live database metrics.

