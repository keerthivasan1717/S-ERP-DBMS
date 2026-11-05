# GEMINI.md — S-ERP DBMS ground rules

Read this file and `plan.md` fully before doing anything. These rules apply to every task in this repo.

## 1. What this project is

A database application for a **Sustainable Enterprise Resource Planning (S-ERP)** system, based on:

- the paper *Sustainable enterprise resource planning systems implementation: A framework development* (Chofreh, Goni, Klemeš, J. Clean. Prod. 198, 2018), and
- the S-ERP ER diagram and use case diagram supplied by the owner (`docs/source/er-usecase.png`).

The app runs on **two interchangeable database engines**: **MySQL ("SQL")** and **MongoDB ("NoSQL")**. The user picks the engine on the login page.

The paper's two paradigms drive the whole design:

- **Sustainability paradigm:** Environmental, Social, Economic.
- **Decisional paradigm:** Strategic, Tactical, Operational.

## 2. Source of truth (in this order)

1. The ER diagram image → table names, columns, PK/FK, cardinalities.
2. The use case diagram → roles and what each role can do.
3. `plan.md` → milestones, stack, defaults for anything the diagram leaves open.
4. The paper → vocabulary, seed data, and the reason behind each feature.

If these conflict or something is missing: **do not guess silently.** Apply the default in `plan.md` §4, then list it under "Deviations & decisions" in that milestone's report. If there is no default, stop and ask.

## 3. Work protocol

1. Work on **one milestone at a time**, in order (M0 → M9). Never start the next one without the owner saying `go M<n+1>`.
2. At the start of a milestone: post a short task list (Antigravity plan artifact) that maps 1:1 to the milestone's checklist in `plan.md`.
3. Work on a branch `m<n>-<slug>`. Commit in small steps with clear messages. When the milestone passes its acceptance checks, merge to `main` and tag `m<n>`.
4. **Milestone gate (mandatory, in this order):**
   1. Run all acceptance checks for the milestone, on **both** engines, and save the output.
   2. Fill `docs/reports/M<n>.md` from `docs/reports/_template.md`.
   3. Run `npm run report -- M<n>` → creates `docs/reports/M<n>-<slug>.pdf`.
   4. Open the PDF text/preview and confirm it is complete and not truncated.
   5. Reply with: milestone name, PDF path, a 5-line summary, open issues. Then **stop and wait**.
5. A milestone is not done if the PDF is missing, even if the code works.

## 4. PDF report rules (every milestone)

The PDF must describe **what was actually built**, in detail, not a marketing summary. Required sections:

1. Summary (what the milestone delivered, in plain words)
2. Scope check — each checklist item from `plan.md` marked Done / Partial / Deferred, with a reason for anything not Done
3. What was built — **every new or changed file** with a one-line purpose; new API endpoints (method, path, role, purpose); new screens
4. Database detail — tables/columns/constraints added, DDL/index excerpts, and any difference between MySQL and MongoDB
5. How it works — the main flow(s) in short numbered steps
6. Screenshots — real screenshots of the running app (saved in `docs/screens/m<n>/`), each with a caption
7. Tests and evidence — commands run and their real output, for both engines
8. Deviations & decisions — everything not taken directly from the ER diagram or `plan.md`
9. Known issues and limitations
10. How to run and verify this milestone
11. Next milestone

Footer on every page: project name, milestone, git commit hash, date. Never paste fake output or fake screenshots. If something failed, say so in the report.

## 5. Database rules

- **No heavy ORM.** Use direct driver access through `mysql2` and `mongodb` (bridged via AlaSQL for unified query execution). The queries are part of what the project demonstrates.
- Keep schema/initialization definitions that define the same model: `db/mysql/schema.sql` and `db/mongodb/init.js`. Same entities, same field names, same constraints.
- Names: `snake_case`, singular table/collection names, exactly as in the ER diagram (e.g. `project_task`, `employee_project`). Do not rename diagram columns.
- Every FK has an explicit `ON DELETE` rule and an index in MySQL, with matching referential checks in the adapter layer. Use `CHECK` constraints and collection indexes for enumerated fields so both engines behave the same.
- Parameterised queries only. Never build SQL by string concatenation with user input.
- All data access goes through the repository layer in `server/src/db/`. Route handlers never import database drivers directly.
- Any change to the model: edit **both** schema files, **both** seed files, and add a numbered migration in each `db/<engine>/migrations/`. Never edit an applied migration.
- The two databases hold **separate, independent data**. Do not build sync between them.
- Seed data is **demo data**. Label it as such in the UI and the reports. Never present invented numbers as real measurements.

## 6. Security basics

- Passwords hashed with `bcryptjs` (cost 12). Never store or log plain passwords.
- Session in an `httpOnly`, `SameSite=Lax` cookie containing a signed token with `userId`, `role`, `engine`.
- The engine in the token decides which pool every request uses. A request must never fall back to the other engine.
- Role checks happen **on the server** for every route. Hiding a button in the UI is not access control.
- Secrets only in `.env` (gitignored). Keep `.env.example` current. Demo accounts and their passwords are listed in `plan.md` §6 and nowhere else.

## 7. Look and feel — must not look AI-generated

Follow `plan.md` §7 exactly. The short version:

- No purple/blue gradients, no glassmorphism, no glowing buttons, no floating blobs, no hero sections.
- No emoji as icons. No stock "dashboard card grid with a big rounded shadow on everything".
- No UI kit or template (no Tailwind preset look, no shadcn/MUI/Ant defaults). Write the CSS by hand with CSS variables.
- No filler copy: no "Welcome back!", "Unlock insights", "Seamless", "Empower". Labels are plain nouns and verbs.
- Dense, ledger-like tables, hairline borders, small corner radius (2–3px), almost no shadows, left-aligned text.
- If a screen looks like something every AI tool generates, redesign it before showing it.

## 8. Code rules

- TypeScript everywhere (strict mode). Node 20, React 18, Vite.
- Validate every request body with `zod`.
- One responsibility per file; keep files under about 300 lines.
- Comments explain *why*, not *what*. No commented-out code left behind.
- No new dependency without a one-line reason in the report. Prefer fewer dependencies.
- Format with Prettier, lint with ESLint. `npm run check` (typecheck + lint + tests) must pass before any commit to `main`.

## 9. Machine limits (owner's laptop: 8 GB RAM, i5-8265U, no GPU, Kubuntu)

- Both database containers get `mem_limit: 512m` in `docker-compose.yml`.
- Do not keep extra browsers, watchers or dev servers running between tasks.
- Do not add heavy tooling (no Electron, no Kubernetes, no large local AI models).
- If Docker is unavailable, fall back to native MySQL and MongoDB services and document it.

## 10. Things you must never do

- Never skip the milestone gate or the PDF.
- Never start the next milestone on your own.
- Never delete data, drop a database or rewrite git history without being asked.
- Never invent tables or columns without recording them in "Deviations & decisions".
- Never claim a test passed without running it on both engines.
- Never mark the work finished while the app does not start from a clean clone using the steps in `README.md`.
