# proto_plan.md — S-ERP DBMS Prototype

> **Goal:** A working base model that demonstrates the complete data model,
> dual-engine operation (SQL / MySQL + NoSQL / MongoDB), role-based access, and basic
> CRUD for every entity in the ER diagram. Not a polished product.

Ground rules from `GEMINI.md` still apply (milestone gate, PDF, both engines,
no ORM, no filler copy). This plan replaces the M0–M9 milestone list with a
shorter P0–P4 track.

---

## What "prototype" means here

| Included in prototype                       | Deferred to full product         |
|---------------------------------------------|----------------------------------|
| All 17 tables + 7 bridge tables, seeded     | Schema migrations after initial  |
| Login with engine selector, 4 roles         | Rate limiting, session expiry UI |
| Server-side role checks on every route      | —                                |
| App shell: header, sidebar, engine label    | Polished responsive layout       |
| Basic data table (sort, paginate)           | Inline filter row, column resize |
| Plain CRUD for every entity (list / create / edit / delete) | Allocation-% rule, dept-tree widget, time-series charts, report generation, advanced dashboards |
| One simple "home" page per role (counts)    | Per-role analytical dashboards   |
| Measurement entry screen for Operator       | Min/avg/max aggregation cards    |
| View-only indicator list grouped by dim.    | Monitor screen (latest vs prev)  |
| Decision CRUD (level validated per role)    | Decision ↔ Risk linking UI       |
| `npm run check` passing on both engines     | `EXPLAIN` analysis, backup script|
| Milestone PDF reports                       | Final system reference PDF (M9)  |

---

## Source of truth (unchanged)

1. ER diagram → table names, columns, PK/FK, cardinalities.
2. Use case diagram → roles and capabilities.
3. `plan.md` → data model §3, gaps §4, seed §5, roles §6, look & feel §7.
4. The research paper → vocabulary, seed categories.

---

## Prototype milestones

### P0 — Foundations and report tool ✅ (= M0, already done)

Everything from M0 is complete: repo, Docker Compose, TypeScript pipeline,
`GET /api/engines/status`, and PDF report generator. Tagged `m0`.

---

### P1 — Schema, seed, auth, and database layer

Combines full-plan milestones M1 + M2 into one.

**Schema & seed (from M1):**
- [ ] `db/mysql/schema.sql` and `db/mongodb/init.js` — all 17 tables
      from `plan.md` §3 plus the 7 bridge/gap tables from §4 (G1–G9).
- [ ] `scripts/migrate.ts` — runs the DDL against the chosen engine.
- [ ] `scripts/seed.ts` — idempotent, `--reset` flag. Seed data per §5:
      1 org, 5 depts, ~12 employees, 3 dimensions, Fig. 5 indicators,
      ~3 months of measurements (reduced from 12 for prototype speed),
      1 project with 3 phases / 5 tasks / 3 risks / 3 decisions,
      6 resources, 4 business processes, process-resource links,
      4 `app_user` rows matching the demo accounts in §6.
- [ ] `scripts/er-check.ts` — compares live schema to expected list;
      prints a pass/fail diff.

**Database adapter (from M2):**
- [ ] `server/src/db/adapter.ts` — single interface (`query`, `one`, `many`,
      `insert`, `tx`) with MySQL and MongoDB implementations (bridged via AlaSQL).
- [ ] The adapter is the *only* module that imports `mongodb` or `mysql2`.

**Auth (from M2):**
- [ ] `POST /api/auth/login` — accepts `{ engine, username, password }`.
      Verifies with `bcryptjs`. Returns a signed `httpOnly` cookie carrying
      `userId`, `role`, `engine`.
- [ ] `POST /api/auth/logout` — clears cookie.
- [ ] Middleware: `authenticate` (reject if no valid token),
      `requireRole(...roles)` (reject with 403).
- [ ] The `engine` in the token selects the pool for every subsequent request.

**Acceptance:**
- `er-check` passes on both engines.
- Row counts match between engines after seeding.
- Login works for all 4 demo accounts on both engines.
- A MySQL-session request never touches MongoDB data (and vice versa).
- `npm run check` passes.

**PDF P1:** table-by-table description, G1–G9 decisions, adapter design,
auth flow, engine differences encountered.

---

### P2 — App shell and login page

Equivalent to M3 from the full plan. No cuts — the shell is needed for
every subsequent screen.

- [ ] CSS tokens (`web/src/styles/tokens.css`), base styles, fonts
      (Source Serif 4, IBM Plex Sans, IBM Plex Mono — self-hosted or
      system fallbacks for prototype).
- [ ] Layout: header (system name + engine label), left sidebar grouped
      by role, content area.
- [ ] **Login page** per §7: left block with "S-ERP" title, right form
      with database radio selector (`SQL (MySQL)` / `NoSQL (MongoDB)`), each
      showing live status from `GET /api/engines/status`. Username,
      password, "Sign in" button, plain-text errors.
- [ ] Role-based sidebar navigation — show only links the role can access.
- [ ] Sign out → clears session → returns to login with engine selector.
- [ ] Shared components (prototype-quality, not pixel-perfect):
  - Data table: sticky header, sort by column click, simple client-side
    pagination (20 rows). *No* inline filter row yet.
  - Form grid: two-column label + field. Visible labels, no floating labels.
  - Status tag: small text with 1 px border (`Active`, `High`, etc.).
  - Confirm dialog (for deletes).
  - Empty state: one plain sentence.

**Acceptance:**
- All 4 roles sign in on both engines; header shows the engine.
- Sidebar links differ by role.
- Screenshots pass the §7 self-check (no gradient cards, no emoji icons).
- `npm run check` passes.

**PDF P2:** screenshots of login (both engine states), shell per role,
component inventory, design tokens.

---

### P3 — CRUD for all entities

This is the prototype core. It collapses M4 + M5 + M6 + M7 into a single
milestone by building *plain CRUD* for every entity without the advanced
business rules. Each entity gets: **list → create → edit → delete**.

**Administrator screens:**
- [ ] Users (`app_user`): list, create, edit, activate / deactivate.
      Reset password (set new hash). Link user to an employee (dropdown).
- [ ] Departments: list, create, edit, delete (blocked if has employees —
      plain server error, no tree widget yet).
- [ ] Employees: list, create, edit, delete.
- [ ] Organization profile: single-record edit form.
- [ ] Organization ↔ dimension links (G1): checkboxes on org edit page.

**Tactical Manager screens:**
- [ ] Projects: list, create, edit, delete.
- [ ] Project tasks: list within a project, create, edit, delete.
- [ ] Implementation phases: list within a project, create, edit, delete.
- [ ] Risks: list within a project, create, edit, delete.
- [ ] Employee-project assignments: list, assign (dropdown of employees),
      remove. *Skip* the 100 % allocation enforcement for prototype.
- [ ] Business processes: list, create, edit, delete.
      Process ↔ indicator links (G3): checkboxes.
- [ ] Resources: list, create, edit, delete.
      Process-resource links: assign resource + quantity to a process.
- [ ] Decisions: list, create, edit, delete. `decision_level` is validated
      on the server (Tactical Manager → Tactical only).
      Decision ↔ risk links (G5): checkboxes.

**Strategic Manager screens:**
- [ ] Decisions: list (filtered to Strategic level), create, edit.
- [ ] Sustainability overview: read-only table of indicators grouped by
      dimension, showing the latest measurement value per indicator.
- [ ] Reports: list (read-only view of `report` table rows).

**Operational User screens:**
- [ ] My tasks: list of `project_task` rows where the user's linked
      employee appears in `employee_project`. Read-only.
- [ ] Enter measurement: form — pick indicator (dropdown), date, value,
      source. Validates: value is a number, date is not in the future.
      Saves with `recorded_by` = current user (G9).

**Shared / all roles:**
- [ ] View indicators: table grouped by dimension. Click → detail page
      showing measurement history as a plain table (no chart yet).
- [ ] View reports: list from `report` table (no generate/download yet).

**API design rule:** one Express router per entity module under
`server/src/modules/<entity>/`. Each module has `<entity>.routes.ts` and
`<entity>.repo.ts`. Routes call repos, repos call the adapter.

**Acceptance:**
- Every CRUD operation works on both engines.
- Deleting a department with employees returns a clear 409 error.
- Decision level rules enforced on the server (wrong level → 403).
- Operational User cannot access Tactical screens (403).
- `npm run check` passes.

**PDF P3:** every screen (screenshot), every endpoint (method, path, role),
validation rules, FK delete behaviour.

---

### P4 — Simple dashboards and wrap-up

Gives each role a minimal home page with real data, then locks the
prototype. Equivalent to a stripped-down M8 + M9.

**Dashboards (one per role, plain tables / count boxes, no charts):**
- [ ] **Administrator:** user count, department count, employee count,
      active project count.
- [ ] **Strategic Manager:** three-dimension indicator count + latest
      measurement date per dimension. Decision count.
- [ ] **Tactical Manager:** project count by status, risk count by level,
      open task count.
- [ ] **Operational User:** count of assigned tasks by status,
      measurements entered this month.

**Wrap-up:**
- [ ] Full test run on both engines (all API tests).
- [ ] Final README update with prototype walkthrough.
- [ ] Any remaining lint / type errors cleaned up.

**Acceptance:**
- Each role's dashboard loads correctly on both engines.
- Dashboard numbers match direct SQL counts.
- Clean clone → running app following README steps.
- `npm run check` passes.

**PDF P4 (final prototype report):** dashboards per role, full endpoint
list, test results on both engines, known limitations, what was deferred.

---

## Mapping: prototype milestones → full-plan milestones

| Proto | Covers from full plan | What is cut / deferred                          |
|-------|----------------------|-------------------------------------------------|
| P0    | M0                   | Nothing — identical                             |
| P1    | M1 + M2              | ER diagram image export, login rate limit        |
| P2    | M3                   | Inline table filter row, confirm dialog polish   |
| P3    | M4 + M5 + M6 + M7   | Allocation-% rule, dept tree widget, time-series chart, monitor screen (latest vs prev), report generation, resource usage summary view |
| P4    | M8 + M9 (stripped)   | Per-role analytical dashboards, report PDF generation/download, `EXPLAIN` analysis, backup/restore, SQL console |

---

## After the prototype

If the prototype is accepted, the deferred items can be added incrementally
by resuming from the full `plan.md` milestone list (M4 onward), cherry-picking
the items marked "deferred" above. The schema, auth, shell, and CRUD base
built in P1–P3 remain the foundation.
