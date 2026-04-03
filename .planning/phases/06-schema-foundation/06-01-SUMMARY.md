---
phase: 06-schema-foundation
plan: 01
subsystem: database
tags: [drizzle, turso, sqlite, cuid2, migrations, schema]

# Dependency graph
requires:
  - phase: 05-complete-athlete-loop
    provides: scores/profiles tables, lib/db.ts singleton, Drizzle ORM patterns
provides:
  - Fixed migration journal with entries for all 4 SQL files (0000-0003)
  - competitions, registrants, registration_entries tables in lib/schema.ts
  - Migration 0003_new_scarlet_witch.sql with 3 CREATE TABLE statements
  - cuid2 ID generation via @paralleldrive/cuid2
  - db.batch() convention documented in schema.ts
affects: [07-serial-generator, 08-competition-creation, 09-public-registration, 10-organizer-dashboard]

# Tech tracking
tech-stack:
  added: ["@paralleldrive/cuid2 ^3.3.0"]
  patterns:
    - "cuid2 primary keys via $defaultFn(() => createId()) on text PK columns"
    - "text() for user-facing dates (date, registration_deadline), integer({mode:timestamp}) for system timestamps"
    - "db.batch() convention for all new multi-table writes — db.transaction() banned over Turso HTTP"
    - "UNIQUE constraint via .unique() on serial column to prevent collision"

key-files:
  created:
    - drizzle/meta/0001_snapshot.json
    - drizzle/meta/0002_snapshot.json
    - drizzle/0003_new_scarlet_witch.sql
  modified:
    - drizzle/meta/_journal.json
    - lib/schema.ts
    - package.json

key-decisions:
  - "Migration journal fixed by manually adding idx=1 and idx=2 entries for 0001_phase5_columns and 0002_profiles — do not regenerate existing migrations"
  - "created_at uses integer({ mode: timestamp }) on all new tables matching existing scores/profiles pattern (D-06)"
  - "date and registration_deadline use text type with ISO strings — user-facing dates not system timestamps (D-07)"
  - "serial column on registration_entries has UNIQUE constraint to prevent race-condition collisions (D-05)"
  - "No FK constraints at Drizzle level — matches existing pattern where scores has no FK refs"

patterns-established:
  - "cuid2 PKs: text('id').primaryKey().$defaultFn(() => createId()) on all new tables"
  - "db.batch() for multi-table writes, db.transaction() never used against Turso HTTP"

requirements-completed: [DATA-01, DATA-03]

# Metrics
duration: 3min
completed: 2026-04-02
---

# Phase 06 Plan 01: Schema Foundation Summary

**Drizzle migration journal fixed, three new tables (competitions/registrants/registration_entries) added with cuid2 PKs, UNIQUE serial constraint, and migration 0003 generated cleanly**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-02T10:31:47Z
- **Completed:** 2026-04-02T10:34:52Z
- **Tasks:** 2
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- Fixed Drizzle migration journal from 1 entry to 4 entries — 0001_phase5_columns and 0002_profiles now recognized by drizzle-kit
- Added competitions, registrants, registration_entries tables to lib/schema.ts with cuid2 PKs, correct column types (D-06/D-07), and TypeScript type exports
- Generated migration 0003_new_scarlet_witch.sql with 3 CREATE TABLE statements and UNIQUE index on registration_entries.serial
- Installed @paralleldrive/cuid2 and documented db.batch() convention in schema.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Drizzle migration journal and install cuid2** - `08b67b1` (chore)
2. **Task 2: Add three new tables to schema.ts and generate migration** - `69a7ee9` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `drizzle/meta/_journal.json` - Fixed: added entries for 0001_phase5_columns, 0002_profiles, and 0003_new_scarlet_witch
- `drizzle/meta/0001_snapshot.json` - New: schema snapshot after 0001 migration (scores + 4 new columns)
- `drizzle/meta/0002_snapshot.json` - New: schema snapshot after 0002 migration (adds profiles table)
- `drizzle/0003_new_scarlet_witch.sql` - New: generated migration with 3 CREATE TABLE statements
- `lib/schema.ts` - Modified: added createId import, 3 new tables with types, db.batch() comment
- `package.json` - Modified: added @paralleldrive/cuid2 ^3.3.0 dependency

## Decisions Made
- Used `$defaultFn(() => createId())` pattern for cuid2 PK generation — no DB-level default, app generates IDs before insert
- Created snapshot files (0001, 0002) manually from 0000_snapshot.json structure to satisfy drizzle-kit's snapshot expectations
- db.batch() convention documented with inline comment rather than separate doc file — lightweight, co-located with relevant code
- No FK constraint at Drizzle level on competition_id/registrant_id columns — matches existing zero-FK-constraint pattern in scores table

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. The journal fix (manually creating 0001 and 0002 snapshot files alongside the journal entries) allowed drizzle-kit generate to complete without errors and produce the expected 0003 migration file.

## Known Stubs

None — this plan is pure data infrastructure. No UI, no routes, no data rendering paths.

## User Setup Required

None - no external service configuration required. The generated migration (0003_new_scarlet_witch.sql) must be applied via `drizzle-kit migrate` against the Turso database when deploying.

## Next Phase Readiness
- Data layer foundation complete: journal consistent, 5 tables in schema, migration 0003 ready to apply
- Phase 07 (serial generator) can now import competitions/registrationEntries from lib/schema.ts and implement lib/queue/serial.ts
- No blockers for Phase 07-10

---
*Phase: 06-schema-foundation*
*Completed: 2026-04-02*
