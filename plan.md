# plan.md — S-ERP DBMS

Build a working database application for a Sustainable Enterprise Resource Planning (S-ERP) system, running on **MySQL** and **PostgreSQL**, with the engine chosen at login. Ground rules are in `GEMINI.md`. Read that first.

> **Assumption:** "SQL" on the login page means **MySQL 8.4**. The button is labelled `SQL (MySQL)`.

---

## 1. How the paper maps to the product

| Paper idea | Where it shows up in the app |
|---|---|
| Sustainability paradigm (environmental, social, economic) | `sustainability_dimension` table; every indicator belongs to one dimension; dashboards group by dimension |
| Sustainability indicators (paper Fig. 5, from Fernández-Sánchez & Rodríguez-López 2010) | Seed data for `sustainability_indicator` (list in §5) |
| Decisional paradigm (strategic, tactical, operational) | `decision.decision_level`; the four roles; each role's home screen |
| Project management (5 process groups, 10 knowledge areas) | `project`, `project_task`, `implementation_phase`, `risk` |
| S-ERP roadmap (pre-implementation, implementation, post-implementation) | Seed rows in `implementation_phase` for the demo project |
| Integrated database, no redundant data across business functions | One schema shared by all modules; no duplicated master data |
| Reporting is too manual (spreadsheets) | `report` table + report generation and export |
| Triple bottom line aligned with business strategy | Decisions link to processes and projects; reports show all three dimensions side by side |

Put a one-page version of this table in the M0 PDF.

---

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node 20 LTS + TypeScript (strict) | One language for the whole app |
| API | Express 4, `zod` for validation | Small and readable |
| DB drivers | `mysql2` and `pg`, **no ORM** | Raw SQL is the point of a DBMS project |
| Databases | MySQL 8.4, PostgreSQL 16, via `docker-compose.yml` (`mem_limit: 512m` each) | Reproducible; fits in 8 GB RAM |
| Frontend | React 18 + Vite + TypeScript, hand-written CSS (CSS variables) | No UI kit, so it does not look templated |
| Charts | `chart.js`, restyled to the theme | Simple, light |
| Auth | `bcryptjs`, signed token in an `httpOnly` cookie | Enough for a course/demo system |
| Tests | `vitest` + `supertest`; every API test runs against **both** engines | Proves parity |
| PDF reports | `md-to-pdf` (Markdown → PDF) with `docs/reports/report.css` | One command per milestone |

Repo layout:

```
/
├─ GEMINI.md  plan.md  README.md  docker-compose.yml  .env.example
├─ db/
│  ├─ mysql/     schema.sql  seed.sql  migrations/
│  └─ postgres/  schema.sql  seed.sql  migrations/
├─ server/src/   config/ db/ auth/ modules/ routes/ middleware/ index.ts
├─ web/src/      pages/ components/ styles/ api/ main.tsx
├─ scripts/      migrate.ts  seed.ts  report.ts  er-check.ts
├─ docs/
│  ├─ source/    DBMS_researchpaper.pdf  er-usecase.png
│  ├─ reports/   _template.md  report.css  M0.md … M9.md  M0-*.pdf …
│  └─ screens/   m0/ … m9/
└─ tests/
```

---

## 3. Data model

Implement these tables **exactly as drawn** in the ER diagram.

| Table | Columns (PK **bold**, FK in *italic*) |
|---|---|
| `organization` | **org_id**, name, description, address, created_at |
| `department` | **dept_id**, name, description, parent_dept_id (self-FK), *org_id* |
| `employee` | **emp_id**, name, email, role (job title), *department_id*, created_at |
| `project` | **project_id**, name, description, start_date, end_date, status, *department_id* |
| `project_task` | **task_id**, *project_id*, name, description, status, start_date, end_date |
| `employee_project` | **emp_id + project_id** (both FK), role, allocation_percentage |
| `sustainability_dimension` | **dimension_id**, name (Environmental / Social / Economic), description |
| `sustainability_indicator` | **indicator_id**, name, description, unit, *dimension_id* |
| `indicator_measurement` | **measurement_id**, *indicator_id*, value, measurement_date, source |
| `resource` | **resource_id**, type (Energy / Water / Material / Financial), name, description, unit |
| `business_process` | **process_id**, name, description, *department_id* |
| `process_resource` | **process_id + resource_id** (both FK), quantity, unit |
| `decision` | **decision_id**, title, description, decision_level (Strategic / Tactical / Operational), date, *created_by* (→ employee), *project_id* |
| `risk` | **risk_id**, title, description, level (Low / Medium / High), *project_id* |
| `implementation_phase` | **phase_id**, name, description, start_date, end_date, *project_id* |
| `report` | **report_id**, title, type (Sustainability / Performance), *generated_by* (→ employee), created_at, file_path |

Notes:
- `report.generated_by` is drawn as an FK in the diagram; point it at `employee(emp_id)`.
- Enumerated columns use `CHECK (col IN (...))` in **both** engines. Status columns for `project` and `project_task`: `Planned`, `Active`, `On Hold`, `Completed`.
- Use integer identity keys: `AUTO_INCREMENT` in MySQL, `GENERATED ALWAYS AS IDENTITY` in PostgreSQL.
- Dates: `DATE`. Timestamps: `DATETIME` (MySQL) / `TIMESTAMPTZ` (PostgreSQL).
- Measurement `value`: `DECIMAL(14,4)` in both.

### Engine differences to document in M1

| Topic | MySQL 8.4 | PostgreSQL 16 |
|---|---|---|
| Auto keys | `AUTO_INCREMENT` | `GENERATED ALWAYS AS IDENTITY` |
| Placeholders | `?` | `$1, $2 …` |
| Insert returning key | `insertId` | `RETURNING id` |
| Timestamps | `DATETIME` | `TIMESTAMPTZ` |
| Text compare | case-insensitive by default collation | case-sensitive (use `ILIKE` / `LOWER()`) |
| Identifier quoting | backticks | double quotes (avoid quoting by using snake_case) |

---

## 4. ER gaps and the defaults to use

The diagram has relationship lines whose keys are not drawn. Use these defaults, add them to both schemas, and list them in the M1 report under "Deviations & decisions". The owner can change any of them before M1 starts.

| # | Gap in the diagram | Default |
|---|---|---|
| G1 | Organization "focuses on" Sustainability_Dimension (no FK drawn; dimensions are only 3 shared rows) | Bridge table `organization_dimension(org_id, dimension_id)` |
| G2 | Department "belongs to" Sustainability_Indicator (no FK drawn) | Nullable `department_id` FK on `sustainability_indicator` (owning department) |
| G3 | Business_Process ↔ Sustainability_Indicator (unlabelled line) | Bridge table `process_indicator(process_id, indicator_id)` |
| G4 | Decision "makes" ↔ Business_Process (no FK drawn) | Nullable `process_id` FK on `decision` |
| G5 | Decision "associated with" Risk (many-to-many) | Bridge table `decision_risk(decision_id, risk_id)` |
| G6 | Risk "has" Implementation_Phase (both already point to `project`) | No direct link; relate them through `project` |
| G7 | Implementation_Phase "generates" Report (many-to-many) | Bridge table `phase_report(phase_id, report_id)` |
| G8 | Login/roles appear in the use case diagram but not in the ER diagram | New table `app_user(user_id, username, password_hash, app_role, emp_id nullable FK, is_active, created_at)`; `app_role` ∈ Administrator / Strategic Manager / Tactical Manager / Operational User |
| G9 | Operational users "Enter Daily Data"; the diagram does not say who entered it | Nullable `recorded_by` FK (→ `app_user`) on `indicator_measurement` |

---

## 5. Seed data (demo data, labelled as such)

- 1 organization, 5 departments (one with a parent), about 12 employees.
- 3 dimensions. **Indicators from the paper's Fig. 5:**
  - Environmental: Soil, Water, Atmosphere, Biodiversity, Resources, Energy, Landscape, Waste, Risks
  - Social: Culture, Accessibility, Participation, Security, Public utility, Social integration, Responsibility
  - Economic: Costs, Technical requirements, Bureaucracy, Social economy, Heritage
- The paper gives no units. Choose sensible units (kWh, m³, tCO₂e, %, …) and generate about 12 months of demo measurements for roughly 8 indicators.
- Demo project "S-ERP Rollout" with phases **Pre-implementation → Implementation → Post-implementation**, about 8 tasks, 4 risks, 3 decisions (one per level).
- 8 resources (2 per type), 5 business processes, process-resource links.
- 2 demo reports.

---

## 6. Roles and permissions (from the use case diagram)

Shared use cases for every role: **Login** → includes **Authenticate User** → includes **Load User Role** → **Access Dashboard** → View Data.

| Capability | Administrator | Strategic Manager | Tactical Manager | Operational User |
|---|:-:|:-:|:-:|:-:|
| Manage users, departments, system configuration | ✔ | | | |
| View sustainability overview | ✔ | ✔ | ✔ | |
| Make strategic decisions | | ✔ | | |
| View reports | ✔ | ✔ | ✔ | |
| Generate reports | ✔ | ✔ | ✔ | |
| Manage projects (incl. tasks, phases, risks) | | | ✔ | |
| Manage business processes | | | ✔ | |
| Track resources | | | ✔ | |
| Monitor sustainability metrics | | | ✔ | |
| Enter daily data / update measurements | | | | ✔ |
| View own tasks | | | | ✔ |

Rules: Tactical Managers record Tactical decisions; Strategic Managers record Strategic decisions; Operational Users read tasks assigned to them via `employee_project`. Enforce all of this on the server.

Demo accounts (development only, created by the seed script):

| Username | Role | Password |
|---|---|---|
| `admin` | Administrator | `Admin#2026` |
| `strategic` | Strategic Manager | `Strat#2026` |
| `tactical` | Tactical Manager | `Tact#2026` |
| `operator` | Operational User | `Oper#2026` |

The login page must **not** print these passwords. They live only here and in the README.

---

## 7. Look and feel (must not look AI-generated)

Direction: a **ledger / field-notebook** feel. Practical, dense, quiet.

**Colour (CSS variables in `web/src/styles/tokens.css`)**

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F3F0E8` | page background |
| `--surface` | `#FBFAF6` | panels, table rows |
| `--ink` | `#1E2421` | text |
| `--ink-soft` | `#5B635E` | secondary text |
| `--line` | `#D4CFC2` | 1px borders |
| `--accent` | `#A9461F` | primary action, active nav (burnt rust) |
| `--moss` | `#4B5D3A` | positive / environmental |
| `--ochre` | `#B58A1E` | warning / economic |
| `--slate` | `#3F5B73` | social |

One accent colour only. No gradients anywhere.

**Type:** headings in a serif (`Source Serif 4`, fallback `Georgia`); body in `IBM Plex Sans`; IDs, numbers and SQL in `IBM Plex Mono`. Self-host the fonts (no CDN).

**Shape and layout**
- Corner radius 2px, 1px borders, no drop shadows (one thin shadow allowed on dropdowns only).
- Left-aligned text. Page width follows content; do not centre everything in a narrow card.
- Left sidebar navigation grouped by section, plain text labels, no icons except a small set of line icons drawn consistently (or none).
- Tables are the main element: sticky header, tabular numerals, zebra rows off, row hover = slightly darker paper, sortable columns, inline filter row.
- Forms are two-column label/field grids with visible labels; no floating labels, no placeholder-as-label.
- Buttons: rectangular, solid accent for the one primary action, outlined for the rest. No pill buttons.
- Status shown as a small text tag with a 1px border (e.g. `Active`, `High`), not a coloured pill with an icon.
- Charts: thin lines, direct labels, light grid, no 3D, no rainbow palette — use `--moss`, `--slate`, `--ochre` for the three dimensions consistently.
- Empty states say what is missing in one plain sentence. No illustrations.
- Copy is plain: "Sign in", "Departments", "Add department". Never "Welcome back!", "Unlock", "Seamless", "Insights at your fingertips".

**Login page (specific)**
- Left: a plain block with the system name "S-ERP" and one line: "Sustainable Enterprise Resource Planning". Right: the form.
- Above the credentials, a labelled **Database** selector with two radio-style options laid out side by side: `SQL (MySQL)` and `PostgreSQL`. Each option shows its host:port and a live status text ("reachable" / "not reachable") from `GET /api/engines/status`.
- Username, password, one "Sign in" button. Errors in plain text under the form ("Wrong username or password", "PostgreSQL is not reachable").
- The chosen engine is shown permanently in the app header (`Engine: PostgreSQL`) so the user always knows which database they are on. Signing out returns to the selector.

**Self-check before showing any screen:** If it could be mistaken for a default AI-tool dashboard (gradient header, rounded cards with shadows, emoji icons, big stat tiles with sparkles), redo it.

---

## 8. Milestones

Every milestone ends with the **gate in `GEMINI.md` §3–4**: acceptance checks on both engines → report → PDF → stop and wait for `go M<n+1>`.

### M0 — Foundations and report tool
- [ ] Repo, TypeScript config, ESLint, Prettier, `npm run check`
- [ ] `docker-compose.yml` with MySQL 8.4 and PostgreSQL 16, memory-limited; `.env.example`
- [ ] Copy the paper and the diagram image into `docs/source/`
- [ ] `README.md` with clean-clone setup steps
- [ ] **Report tool:** `docs/reports/_template.md`, `report.css` (same fonts/colours as the app), `npm run report -- M<n>` producing the PDF with footer (project, milestone, commit hash, date)
- [ ] Minimal server that connects to both engines; `GET /api/engines/status`
- **Acceptance:** both containers healthy; status endpoint reports both reachable; `npm run report -- M0` produces a readable PDF containing the paper→product table from §1.
- **PDF M0:** setup, stack decisions, repo layout, the §1 table, how to run.

### M1 — Schema, seed and ER conformance (both engines)
- [ ] `db/mysql/schema.sql` and `db/postgres/schema.sql` per §3 and §4
- [ ] `scripts/migrate.ts`, `scripts/seed.ts` (idempotent, `--reset` flag)
- [ ] Seed per §5 on both engines
- [ ] `scripts/er-check.ts`: reads the live schema of each engine and compares tables, columns, PKs, FKs to an expected list built from §3/§4; prints a diff
- [ ] Export an ER diagram image generated from the real schema into `docs/screens/m1/`
- **Acceptance:** `er-check` passes on both engines; row counts match between engines; all CHECK and FK constraints reject bad data (tests).
- **PDF M1:** full table-by-table description, every constraint, the G1–G9 decisions, the MySQL vs PostgreSQL differences actually encountered, row counts.

### M2 — Database layer, auth and roles
- [ ] `server/src/db/` adapter: one interface (`query`, `one`, `many`, `insert`, `tx`) with a MySQL and a PostgreSQL implementation; placeholder translation; per-engine pools
- [ ] Login endpoint takes `{engine, username, password}`; cookie token carries the engine
- [ ] Middleware: authenticate, load role, require role; consistent error format
- [ ] Rate limit on login
- **Acceptance:** same API test suite passes on both engines; a MySQL session can never read PostgreSQL data; wrong role gets 403; tests cover all four roles.
- **PDF M2:** adapter design with code excerpts, auth flow (Authenticate → Load User Role), endpoint list, security notes.

### M3 — App shell and login page
- [ ] Tokens, base CSS, fonts, layout (header with engine label, sidebar by role, content area)
- [ ] Login page per §7 with engine selector and live status
- [ ] Role-based navigation; sign out; session expiry handling
- [ ] Shared components: data table (sort, filter, paginate), form grid, tag, confirm dialog, empty state
- **Acceptance:** all four roles can sign in on both engines; header shows the engine; nav differs by role; screenshots reviewed against the §7 self-check.
- **PDF M3:** screenshots of login (both engine states), shell per role, component inventory, design tokens.

### M4 — Organisation structure (Administrator)
- [ ] CRUD: users (`app_user`), departments (with parent), employees, organization profile
- [ ] Link users to employees; activate/deactivate users; reset password
- [ ] Organization ↔ dimension links (G1)
- **Acceptance:** CRUD works on both engines; deleting a department with employees is blocked with a clear message; department tree renders.
- **PDF M4:** screens, endpoints, validation rules, FK behaviour.

### M5 — Projects (Tactical Manager)
- [ ] CRUD: projects, tasks, implementation phases, risks
- [ ] Assign employees to projects with role and allocation %; reject total allocation above 100% per employee
- [ ] Project detail page: phases, tasks, team, risks together
- **Acceptance:** allocation rule enforced; project status flow works; Operational User sees only own tasks.
- **PDF M5:** screens, endpoints, the allocation rule and its SQL.

### M6 — Sustainability indicators and measurements
- [ ] CRUD for indicators (grouped by dimension), measurements, process–indicator links (G3)
- [ ] Operational User: fast "enter measurement" screen (date, value, source)
- [ ] Indicator detail with a time-series chart and min/avg/max
- [ ] Monitor screen for Tactical Managers: latest value vs previous period per indicator
- **Acceptance:** measurement entry validated (number, date not in future); charts match raw rows; same figures on both engines.
- **PDF M6:** screens, the aggregation queries for each engine, sample charts.

### M7 — Processes, resources and decisions
- [ ] CRUD: business processes, resources, process–resource quantities
- [ ] Decisions with level, linked project/process/risks (G4, G5); level rules per role
- [ ] Resource usage summary by type and by process
- **Acceptance:** composite-key rows can't duplicate; decision level rules enforced; usage totals correct.
- **PDF M7:** screens, join queries, decision workflow.

### M8 — Dashboards and reports
- [ ] Home dashboard per role (Strategic: three-dimension overview; Tactical: projects, risks, metrics; Operational: my tasks, data due; Administrator: users, departments, system counts)
- [ ] Report generation for `Sustainability` and `Performance` types; store the file, a `report` row and phase links (G7)
- [ ] Report list, download, regenerate
- **Acceptance:** each role sees only its dashboard; generated report numbers equal direct SQL totals on both engines.
- **PDF M8:** dashboards per role, report contents, the SQL behind each figure.

### M9 — Hardening and final package
- [ ] Parity test run: full suite on both engines, results table
- [ ] Indexes reviewed with `EXPLAIN` on the 5 heaviest queries, per engine (document findings)
- [ ] Backup/restore script for both engines
- [ ] Final README, demo walkthrough, known limitations (the paper itself notes the framework is conceptual and unevaluated)
- [ ] Optional if time allows: read-only SQL console for the Administrator that shows the engine and the query plan
- **Acceptance:** clean clone → running app in under 15 minutes following the README; all tests green on both engines.
- **PDF M9 (final):** complete system description, schema reference, API reference, role matrix, test results, performance notes, limitations, future work.

---

## 9. Definition of done (every milestone)

1. Acceptance checks pass on MySQL **and** PostgreSQL, with output saved.
2. `npm run check` passes.
3. Real screenshots captured for every new screen.
4. Report filled in honestly, PDF generated and opened.
5. Branch merged, tag `m<n>` created.
6. Assistant stops and waits for `go M<n+1>`.

## 10. First instruction to give Antigravity

> Read `GEMINI.md` and `plan.md` completely. Confirm you understand the milestone gate. Then start **M0 only**. Post your task list first.
