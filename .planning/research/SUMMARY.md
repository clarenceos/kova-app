# Project Research Summary

**Project:** Kova — v2.0 Competition Registration and Queue Scheduling
**Domain:** KB sport competition management — organizer registration, serial assignment, scheduling
**Researched:** 2026-04-02 (v2.0 queue system); original 2026-03-24 (recorder/judge)
**Confidence:** HIGH (QUEUE_SPEC.md is fully specified; architecture derived from direct codebase reading; pitfalls sourced from authoritative Drizzle/Turso/WebKit docs)

---

## Executive Summary

Kova v2.0 adds a complete competition management workflow — competition creation, public athlete registration, organizer dashboard, scheduling algorithm, and timetable output — onto an existing working KB sport PWA. The milestone is well-specified: QUEUE_SPEC.md locks the serial format, scheduling algorithm interface, DB table schemas, and route structure. Research confirms the recommended approach is entirely additive: three new tables, three new route groups, one pure-function scheduler, and four new npm packages. Zero modifications to the existing recorder, judge, or auth infrastructure.

The single highest-risk area is DB atomicity for registration. The Turso HTTP client does not support `db.transaction()` reliably — `db.batch()` is the correct tool for the combined registrant + entries insert, and a UNIQUE constraint on `serial` with a retry loop is mandatory to handle concurrent registrations at competition launch. Every other implementation risk (CSV BOM handling, print CSS color adjustment, scheduler boundary conditions, conditional form field cleanup) is well-understood and preventable with one-time defensive coding patterns documented in the pitfalls research.

The scheduling algorithm is the most algorithmically interesting piece but is structurally simple: a pure sort-and-assign function with two conflict types (rest gap and coach overlap). Building it as a zero-dependency pure function that receives a typed array makes it trivially testable and decoupled from the DB. The recommended build order — schema first, pure logic second, server actions third, routes last — respects the data dependency chain and ensures each layer can be validated in isolation before the next is built on top of it. No phase in this milestone requires exploratory research before implementation; QUEUE_SPEC.md and the codebase provide all needed patterns.

---

## Key Findings

### Recommended Stack

The existing stack (Next.js 16.2.1, Clerk, Turso + Drizzle, shadcn/ui, Tailwind v4, Vercel) requires no changes for v2.0. Three new npm packages and four shadcn components are the entire scope of dependency additions.

**New packages for this milestone:**
- `@paralleldrive/cuid2` ^2.2.2 — collision-resistant IDs for all new table PKs; QUEUE_SPEC explicitly mandates cuid2
- `papaparse` ^5.5.3 — client-side CSV parsing for organizer import; zero deps, 5M weekly downloads
- `countries-list` ^3.3.0 — ISO country data for registration form; ESM-only v3, static array at module level
- `@types/papaparse` — TypeScript types (PapaParse does not bundle types)

**New shadcn components (CLI install, not npm):**
- `calendar` + `popover` — date picker for competition date field
- `command` + `combobox` — searchable dropdown for 200-country list (plain `<select>` is unusable at that scale)

**Critical DB constraint:** `db.transaction()` over Turso HTTP is unreliable — each statement is a separate HTTP request and `BEGIN`/`COMMIT` fail with "no transaction is active." Use `db.batch()` for all multi-table atomic writes. This is the single most important stack constraint for this milestone.

**Schema patterns for new tables:**
- `$defaultFn(() => createId())` for cuid2 PKs
- `text({ mode: 'json' }).$type<string[]>()` for JSON array columns (`allowed_bell_weights`)
- ISO string timestamps (`text NOT NULL`) per QUEUE_SPEC — intentionally different from existing `integer timestamp` convention
- Foreign key enforcement at application layer (libSQL HTTP does not set `PRAGMA foreign_keys = ON` automatically)

### Expected Features

All features below are P1 — they form a complete organizer workflow and must ship together. The five route groups are interdependent; partial delivery is not useful to organizers.

**Must have (table stakes — ships in v2.0):**
- Competition creation form (`/organizerdb/create`) — name, date, platform count, allowed bell weights, serial prefix auto-derived from competition name
- Public registration form (`/registration/[compId]`) — four guard states (not found, closed, deadline passed, full), per-event bell weight + duration selectors, server-side serial assignment
- Registration success page — serial table per event, "screenshot your serials" instruction
- Organizer dashboard (`/organizerdb`) — competition selector, analytics bar, sortable/filterable registrations table, remove action, CSV import, Generate Queue button with start time modal
- Timetable view (`/organizerdb/queue`) — event-tinted rows, weight class derived at render, platform columns, conflict panel (REST + COACH), print-friendly CSS

**Should have (differentiators — ships in v2.0):**
- KB sport sort order encoded by default (LC → Jerk → Snatch, 10min before 5min, Female first) — removes the organizer's primary manual step
- Weight class auto-derived from body weight at render, never stored — no staleness risk, no organizer data entry
- Biathlon/Triathlon handled natively — one form submission, multiple serials
- CSV import for pre-existing registration spreadsheets — immediately useful for competitions that began on Google Forms
- Copyable registration link surfaced on redirect after competition creation

**Defer to v1.x (post-validation with one real competition):**
- Email confirmations to athletes
- Age divisions (Junior/Open/Masters/Veterans)
- Public queue view for athletes (read-only start list)
- Clerk auth gate on organizer routes (R1 defers this intentionally; code structured for retrofit without rewrite)

**Defer to v2+:**
- Payment collection (PCI scope)
- Drag-and-drop schedule editing
- Multi-organizer access per competition

**Anti-features — do not build:**
- `weight_class` stored in DB (QUEUE_SPEC explicitly: "display only, never stored")
- Registration editing by athletes after serial assignment (breaks serial trust model)
- `db.transaction()` for multi-table writes (unreliable over Turso HTTP — use `db.batch()`)

### Architecture Approach

New routes live entirely outside `app/(app)/`, which enforces a mobile-first auth-guarded layout unsuitable for the organizer's desktop-first workflow. Organizer routes at `app/organizerdb/` and public registration at `app/registration/[compId]/` each have their own layout context. Three new tables are purely additive — no existing tables are modified. Two existing files are extended without touching existing functionality: `lib/schema.ts` (append tables) and `lib/serial.ts` (add `generateCompetitionSerial` export).

**Major components:**
1. `lib/queue/scheduler.ts` — pure function: sort entries by KB sport protocol → assign to time blocks → detect REST and COACH conflicts. Zero DB imports. Fully testable with fixture data before any UI exists.
2. `lib/queue/weightClass.ts` — pure helper: `getWeightClass(gender, bodyWeightKg) → string`. Never stored, derived at render time only.
3. `lib/actions/registration.ts` — `createRegistration` using `db.batch()` for atomic registrant + entries insert; serial assignment with retry loop on UNIQUE collision.
4. `app/registration/[compId]/page.tsx` — server component enforces all guard states; passes competition as props to `RegistrationForm` client component.
5. `app/organizerdb/queue/page.tsx` — server component reads `compId` + `startTime` query params, fetches entries, runs scheduler, renders `TimetableGrid` + `ConflictPanel`.
6. `components/registration/RegistrationForm.tsx` — client component with conditional event subfields; must manually call `unregister()` on event uncheck to prevent stale value submission.
7. `components/organizerdb/RegistrationsTable.tsx` — client component with client-side sort/filter (all data in props from server, no round-trip for sort operations).

**Architectural patterns:**
- Server Component shell + Client Island: page routes fetch data server-side, pass as props; client components own interactivity only
- `searchParams` read in `page.tsx` Server Components only — never re-read in Client Components via `useSearchParams()` without a `<Suspense>` boundary
- Server actions defined in `lib/actions/` files with `'use server'` at file level — never inline within a `'use client'` file (breaks Clerk `auth()` header forwarding)
- Queue page state held in URL (`?compId=&startTime=`) making timetable bookmarkable and printable

### Critical Pitfalls

1. **Serial number race condition under concurrent registration** — Two simultaneous registrations read the same entry count, compute the same serial, and collide at the UNIQUE constraint. At a real competition launch with 30 athletes registering simultaneously, this is near-certain without a retry wrapper. Prevention: UNIQUE constraint on `registration_entries.serial` (spec mandates this) + retry loop (max 3) that recounts and reinserts on collision. Phase 1 work.

2. **`db.transaction()` fails silently over Turso HTTP** — The HTTP client cannot maintain stateful transactions; `BEGIN`/`COMMIT` fail with "no transaction is active." Without `db.batch()`, partial registrations create orphan registrant rows (athlete with no events) on any entry insert failure. Use `db.batch()` for all multi-table atomic writes. Never use `db.transaction()` with Turso HTTP client. Phase 1 work.

3. **Drizzle migration journal out of sync with production** — The journal currently records only one entry despite three SQL migration files existing. `drizzle-kit migrate` against production will attempt to replay already-applied migrations ("table already exists" errors). Fix: add journal entries for `0001` and `0002` before generating new migrations. This is Phase 0 pre-work — must be the first task before any schema changes.

4. **Conditional form field stale values on submit** — RHF's default `shouldUnregister: false` retains values for hidden event fields. An athlete who checks LC, enters values, then unchecks LC still submits LC data; the server creates an unintended entry with a serial. Prevention: call `unregister()` explicitly in the event toggle handler, plus server-side validation treating the events checkbox array as the source of truth. Phase 1 (Registration Form).

5. **CSV BOM corruption from Excel** — Excel UTF-8 CSVs prepend a U+FEFF BOM that corrupts the first header cell name, causing all column lookups to fail silently. Prevention: `text.replace(/^\uFEFF/, '')` before PapaParse. One line; skip it and every Excel import silently fails. Phase 3 (CSV Import).

6. **Print CSS: background colors suppressed and overflow tables clipped** — Browsers strip background colors in print by default. Event-tinted rows and conflict pills become invisible. `overflow-x-auto` tables clip at paper width. Prevention: `[print-color-adjust:exact]` on tinted elements, `print:table-fixed` on table container, `print:hidden` on nav and buttons. Apply during initial timetable build — retrofitting print onto a complex Tailwind layout is disproportionately hard. Phase 3 (Timetable).

7. **Scheduler boundary condition: `<=` vs `<` for rest conflict** — `block2 - block1 <= minRestBlocks` incorrectly flags an athlete in blocks 1 and 3 (with `minRestBlocks=2`) as a conflict. A gap of exactly 2 blocks is the minimum acceptable rest, not a violation. Use `< minRestBlocks` (strictly less than). Write unit tests for boundary conditions before wiring scheduler to any UI. Phase 1 (Pure Logic).

---

## Implications for Roadmap

Based on the data dependency chain and pitfall mapping, the build order follows: schema before anything, pure logic before server actions (to isolate testability), server actions before routes (routes are shells that call actions), competition creation before registration (registration requires a valid `compId`).

### Phase 0: Migration Pre-work
**Rationale:** The Drizzle migration journal is out of sync with production schema. This is a blocker — generating new migrations against a broken journal produces SQL that includes already-applied tables. Must be the first task before any code changes.
**Delivers:** Correct journal baseline; three new tables in `lib/schema.ts`; migration file `drizzle/0003_queue_system.sql` applied to dev DB
**Avoids:** Pitfall 8 (journal out of sync — "table already exists" on next migration run)
**Research flag:** None. Pattern fully documented in PITFALLS.md and Drizzle docs.

### Phase 1: Pure Logic Layer
**Rationale:** The scheduler and weight class helper are pure functions with no external dependencies. Building them before any UI or actions means they can be tested with fixture data immediately. The scheduler is the most algorithmically complex piece; catching boundary condition bugs early is far cheaper than finding them post-integration.
**Delivers:** `lib/queue/scheduler.ts` (full sort + assignment + conflict detection), `lib/queue/weightClass.ts`, `generateCompetitionSerial` export in `lib/serial.ts`
**Addresses:** KB sport sort order (LC → Jerk → Snatch, 10min before 5min, Female first), REST and COACH conflict types, weight class boundary tables per QUEUE_SPEC
**Avoids:** Pitfall 9 (biathlon self-conflict off-by-one: use `< minRestBlocks` not `<=`), Pitfall 10 (coach name normalization: lowercase + trim both sides)
**Research flag:** None. Algorithm fully specified in QUEUE_SPEC.md.

### Phase 2: Server Actions
**Rationale:** Server actions are the data write layer. Building before UI means routes can be wired immediately and tested end-to-end. The `createRegistration` action's atomicity requirements must be designed in here — not retrofitted after discovering orphan rows.
**Delivers:** `lib/actions/competitions.ts` (`createCompetition`, `removeRegistrant`, `importCSV`), `lib/actions/registration.ts` (`createRegistration` using `db.batch()` + serial UNIQUE + retry loop)
**Uses:** cuid2 for IDs, Drizzle batch API, serial helper from Phase 1
**Avoids:** Pitfall 7 (serial race condition — UNIQUE constraint + retry), Pitfall 15 (orphan registrant — `db.batch()` atomicity, never `db.transaction()`)
**Research flag:** None. `db.batch()` vs `db.transaction()` decision is settled.

### Phase 3: Competition Creation Route
**Rationale:** A competition record must exist before registration or dashboard can be meaningfully tested. This is the entry point for the entire data dependency chain.
**Delivers:** `app/organizerdb/create/page.tsx`, `components/organizerdb/CompetitionForm.tsx` with bell weight checkbox matrix, serial prefix display
**Addresses:** Competition creation with all fields per QUEUE_SPEC; redirect to dashboard with copyable registration link
**Research flag:** None. Standard server component + client form pattern.

### Phase 4: Public Registration Flow
**Rationale:** Most complex client component — conditional event subfields, country combobox, four guard states. Depends on schema (Phase 0), serial helper (Phase 1), and `createRegistration` action (Phase 2). Building after competition creation means there is a competition to register for during testing.
**Delivers:** `app/registration/[compId]/page.tsx`, `app/registration/[compId]/success/page.tsx`, `components/registration/RegistrationForm.tsx`
**Uses:** shadcn Combobox + `countries-list`, conditional `unregister()` on event toggle, server-side guard state enforcement
**Avoids:** Pitfall 12 (stale conditional form values — unregister on uncheck + server-side source-of-truth validation)
**Research flag:** None. Well-specified. Combobox + countries-list pattern fully documented in STACK.md.

### Phase 5: Organizer Dashboard
**Rationale:** Orchestrates all organizer-facing data. Depends on competitions (Phase 3) and registration data (Phase 4). CSV import belongs here — same DB rows as self-registration form.
**Delivers:** `app/organizerdb/page.tsx`, `CompetitionSelector`, `AnalyticsBar`, `RegistrationsTable` (sortable/filterable + remove), `CsvImport`, `GenerateQueueModal` with start time input
**Uses:** PapaParse client-side parse + server action, `revalidatePath` after mutations
**Avoids:** Pitfall 11 (CSV BOM — strip U+FEFF before PapaParse call; validate expected headers before processing rows)
**Research flag:** None. All patterns established.

### Phase 6: Timetable and Queue View
**Rationale:** Final deliverable. Depends on all previous phases. Print CSS must be applied during initial build — retrofitting print onto a complex layout is the documented pitfall.
**Delivers:** `app/organizerdb/queue/page.tsx`, `components/queue/TimetableGrid.tsx`, `components/queue/ConflictPanel.tsx`
**Implements:** Server component reads `searchParams`, runs pure scheduler, passes `timeBlocks` + `conflicts` to render components. `print:hidden` on nav/buttons, `[print-color-adjust:exact]` on event-tinted rows and conflict pills, `print:table-fixed` on table container.
**Avoids:** Pitfall 13 (print CSS — apply during initial build), Pitfall 14 (searchParams in layout vs page — read only in `page.tsx` server component)
**Research flag:** None. Architecture pattern fully specified.

### Phase Ordering Rationale

- Schema before everything: no UI, action, or test can exist without DB types
- Pure logic before server actions: scheduler can be unit-tested the moment schema types exist; boundary condition bugs found early are cheap
- Server actions before routes: routes are shells that call actions; wiring order ensures testability
- Competition creation before registration: `/registration/[compId]` requires a valid `compId`
- Dashboard before timetable: queue page renders data populated by dashboard workflows

### Research Flags

**No phase in this milestone requires `/gsd:research-phase` during planning.** QUEUE_SPEC.md is fully specified. Architecture is derived from direct codebase reading. All stack patterns are documented with exact code examples. Proceed directly to execution.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack unchanged and already working. New packages sourced from official docs and project spec. `db.batch()` vs `db.transaction()` confirmed by Drizzle docs and Turso MVCC documentation. Version compatibility verified. |
| Features | HIGH | QUEUE_SPEC.md is the authoritative source with complete feature definitions. Competitor analysis (Competition Corner, OpenLifter, ManageMyComp) confirms table stakes. Anti-features clearly justified by scope impact. |
| Architecture | HIGH | Derived from direct codebase reading of all relevant files + QUEUE_SPEC.md. Component boundaries, data flow, and build order are unambiguous. All patterns have code examples. |
| Pitfalls | HIGH | Sourced from Drizzle GitHub issues, Turso MVCC blog, WebKit bug tracker, MDN, Next.js 16 local docs. The `db.batch()` transaction pitfall is especially well-documented. Each pitfall has concrete prevention code. |

**Overall confidence:** HIGH

### Gaps to Address

- **`db.batch()` serial retry under real concurrent load:** Research confirms the approach is correct, but no load test has run. Validate with `ab -c 20 -n 100` against the registration endpoint before sharing any public registration link with athletes.
- **Drizzle journal fix is a pre-work blocker:** The journal inconsistency is documented and the fix procedure is clear (PITFALLS.md Pitfall 8). Must be verified in development before `drizzle-kit generate` is run. Skipping this corrupts the migration history.
- **iOS canvas.captureStream() on iOS 18.4+:** Unresolved from original recorder research. Does not affect v2.0 (no recorder changes in this milestone) but remains open for the existing recorder feature.

---

## Sources

### Primary (HIGH confidence)
- `QUEUE_SPEC.md` — full requirements brief; locked conventions for serial format, scheduling algorithm, table schemas — HIGH confidence (project document)
- `.planning/PROJECT.md` — milestone context and out-of-scope constraints — HIGH confidence (project document)
- Direct codebase reading: `lib/schema.ts`, `lib/db.ts`, `lib/serial.ts`, `lib/actions/entries.ts`, `lib/actions/scores.ts`, `app/(app)/layout.tsx`, `components/ui/GlobalHeader.tsx`, `components/ui/BottomNav.tsx`, `drizzle.config.ts`
- [Drizzle ORM Batch API](https://orm.drizzle.team/docs/batch-api) — atomic batch semantics over libSQL HTTP — HIGH confidence
- [Drizzle ORM SQLite column types](https://orm.drizzle.team/docs/column-types/sqlite) — `text({ mode: 'json' }).$type<T>()` pattern — HIGH confidence
- [@paralleldrive/cuid2 GitHub](https://github.com/paralleldrive/cuid2) — `createId()` API, `$defaultFn` Drizzle pattern — HIGH confidence
- [PapaParse official docs](https://www.papaparse.com/) — browser API, header mode, BOM handling — HIGH confidence
- [countries-list GitHub](https://github.com/annexare/Countries) — v3.3.0 ESM exports, `countries` object structure — HIGH confidence
- [shadcn/ui Combobox docs](https://ui.shadcn.com/docs/components/radix/combobox) — Command + Popover internals — HIGH confidence
- [shadcn/ui Calendar docs](https://ui.shadcn.com/docs/components/radix/calendar) — react-day-picker v9 — HIGH confidence

### Secondary (MEDIUM confidence)
- [Competition Corner Features](https://about.competitioncorner.net/features) — registrations table, heat schedule print, one-click start list — MEDIUM confidence (direct fetch)
- [OpenLifter](https://www.openlifter.com/en/) — start list, flight order, printable results — MEDIUM confidence
- [WebKit Blog: Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) — WebM MediaRecorder added — HIGH confidence (relevant to recorder, not v2.0)
- [Tailwind CSS print styles](https://www.jacobparis.com/content/css-print-styles) — `print:hidden`, `print-color-adjust` utilities — MEDIUM confidence

### Tertiary (LOW confidence)
- [G2: Athletic Competition Management Software](https://www.g2.com/categories/athletic-competition-management) — category overview only; no specific claims relied upon
- Community reports re: WebKit bug #252465 persisting through iOS 18.4.1 — anecdotal, needs real-device verification for recorder feature (not v2.0 scope)

---

*Research completed: 2026-04-02 (v2.0 queue system)*
*Ready for roadmap: yes*
