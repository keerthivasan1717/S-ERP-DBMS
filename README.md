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

### Step 4: Run Typecheck, Lint, and Tests
```bash
npm run check
```
This runs TypeScript typechecking (`tsc`), ESLint, and the Vitest test suite.

### Step 5: Start the API Server
```bash
npm run dev:server
```
The server will start on `http://localhost:3000`. You can probe the database engines status:
```bash
curl http://localhost:3000/api/engines/status
```

### Step 6: Generate Milestone PDF Reports
```bash
npm run report -- M0
```
Generates `docs/reports/M0-foundations.pdf` using the S-ERP palette and typography, formatted for A4 with commit metadata and page numbers.

---

## 4. Demo Accounts & Credentials

*(Development and evaluation only — created in M1 seed)*

| Role | Username | Password |
|---|---|---|
| **Administrator** | `admin` | `Admin#2026` |
| **Strategic Manager** | `strategic` | `Strat#2026` |
| **Tactical Manager** | `tactical` | `Tact#2026` |
| **Operational User** | `operator` | `Oper#2026` |

---

## 5. Milestone Plan Overview

- **M0:** Foundations and report tool (TypeScript, Docker Compose, engine status endpoint, PDF report generator).
- **M1:** Schema, seed, and live ER conformance checks on both MySQL and PostgreSQL.
- **M2:** Repository database layer, session auth, and role-based access control.
- **M3:** Ledger/field-notebook app shell, theme tokens, and engine-switching login screen.
- **M4:** Organization structure and administrative modules.
- **M5:** Project management, tasks, implementation phases, and risks.
- **M6:** Sustainability dimensions, indicators, and time-series measurements.
- **M7:** Business processes, resource tracking, and strategic/tactical/operational decisions.
- **M8:** Role-tailored dashboards and report generation.
- **M9:** Hardening, query plan analysis, parity verification, and final submission package.
