---
phase: 06-schema-foundation
plan: 02
subsystem: database
tags: [vitest, serial-number, drizzle, turso, tdd, pure-function]

# Dependency graph
requires:
  - phase: 06-schema-foundation plan 01
    provides: registration_entries table with UNIQUE serial constraint, competitions table, db singleton
provides:
  - Competition-scoped serial number generator at lib/queue/serial.ts
  - deriveSerialPrefix pure function (3+ words = first letter each, <3 words = first 3 of first word, always 3 uppercase chars)
  - generateCompetitionSerial async function (counts existing entries + 1, XXX-0000 format, MAX_RETRIES=5)
  - vitest.config.ts with @/ path alias for unit testing
  - vitest dev dependency installed
affects: [08-competition-creation, 09-public-registration, 07-scheduler]

# Tech tracking
tech-stack:
  added: ["vitest ^4.1.2"]
  patterns:
    - "vi.mock('@/lib/db') pattern for unit-testing DB-dependent modules without live connection"
    - "vitest.config.ts with resolve.alias for @/ -> project root"
    - "Pure function (deriveSerialPrefix) co-located with async DB function (generateCompetitionSerial) in same module"

key-files:
  created:
    - lib/queue/serial.ts
    - lib/queue/serial.test.ts
    - vitest.config.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Followed D-04 over QUEUE_SPEC example: Hunger Bells -> HUN (first 3 of first word), not HUB — QUEUE_SPEC example was inconsistent with spec text"
  - "vi.mock used in test file to prevent DB module load crash during unit testing of pure function"
  - "vitest.config.ts created with @/ alias — required for vitest to resolve Next.js path aliases"
  - "vitest installed as devDependency — no test runner existed in the project"

patterns-established:
  - "Unit test pure functions with vi.mock for DB imports when DB-dependent code is co-located"
  - "lib/queue/ directory for all queue-system utilities (serial, scheduler, weightClass in later phases)"

requirements-completed: [DATA-02]

# Metrics
duration: 10min
completed: 2026-04-02
---

# Phase 06 Plan 02: Serial Generator Summary

**Competition-scoped serial generator (deriveSerialPrefix + generateCompetitionSerial) at lib/queue/serial.ts with 10 passing vitest unit tests covering all prefix derivation cases**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-02T10:30:00Z
- **Completed:** 2026-04-02T10:41:22Z
- **Tasks:** 1
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- Created `lib/queue/serial.ts` with `deriveSerialPrefix` (pure) and `generateCompetitionSerial` (async) exports
- TDD workflow: wrote 10 failing tests first, then implemented to green
- Resolved QUEUE_SPEC inconsistency: "Hunger Bells" spec said HUB but D-04 says pad from first word -> HUN; followed D-04
- Installed vitest and created vitest.config.ts with @/ alias so Next.js path aliases resolve in test env
- lib/serial.ts confirmed untouched (per D-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create deriveSerialPrefix pure function with tests** - `b2d17de` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `lib/queue/serial.ts` - Competition-scoped serial generator with deriveSerialPrefix and generateCompetitionSerial
- `lib/queue/serial.test.ts` - 10 vitest unit tests for all prefix derivation cases
- `vitest.config.ts` - Vitest config with @/ path alias (required for @/lib/* imports in tests)
- `package.json` - Added vitest ^4.1.2 as devDependency
- `package-lock.json` - Updated lock file

## Decisions Made
- Resolved QUEUE_SPEC example inconsistency: the spec text says "pad with first 3 letters of first word if fewer than 3 words" and D-04 locks this rule. The example "Hunger Bells" -> HUB in QUEUE_SPEC contradicts this (HUB would require mixed-word padding), while "Manila Open" -> MAN confirms the first-3-of-first-word rule. D-04 takes precedence; test expects HUN for "Hunger Bells".
- Used `vi.mock` in test file to prevent lib/db.ts from crashing during test env startup (TURSO_AUTH_TOKEN is undefined at test time). This is correct practice for unit-testing pure functions co-located with DB-dependent async functions.
- Created vitest.config.ts (new file) to configure path alias — vitest does not read tsconfig.json paths automatically.
- vitest installed as devDependency since no test runner existed in project before this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed vitest dev dependency**
- **Found during:** Task 1 (TDD RED phase)
- **Issue:** No test runner in project — `npx vitest run` failed with "cannot find package vitest"
- **Fix:** `npm install --save-dev vitest`
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx vitest run lib/queue/serial.test.ts` exits 0 with 10 tests passing
- **Committed in:** b2d17de (Task 1 commit)

**2. [Rule 3 - Blocking] Created vitest.config.ts with @/ path alias**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** After vitest installed, tests failed: "Cannot find package '@/lib/db'" — vitest doesn't read tsconfig.json paths automatically
- **Fix:** Created vitest.config.ts with `resolve.alias: { "@": path.resolve(__dirname, ".") }`
- **Files modified:** vitest.config.ts (new)
- **Verification:** Tests pass after config added
- **Committed in:** b2d17de (Task 1 commit)

**3. [Rule 3 - Blocking] Added vi.mock for DB imports in test file**
- **Found during:** Task 1 (TDD GREEN phase, after vitest.config.ts added)
- **Issue:** lib/db.ts crashes at module load time when TURSO_AUTH_TOKEN env var is missing — prevents pure function from being tested
- **Fix:** Added `vi.mock("@/lib/db", () => ({ db: {} }))` and related mocks in test file header
- **Files modified:** lib/queue/serial.test.ts
- **Verification:** Tests load and pass without DB connection
- **Committed in:** b2d17de (Task 1 commit)

**4. [Rule 1 - Bug] Worktree missing Plan 01 schema changes — rebased onto local main**
- **Found during:** Task 1 setup (before any code written)
- **Issue:** Worktree was branched from origin/main before Plan 01 commits landed. lib/schema.ts didn't have competitions/registrants/registration_entries tables needed for serial.ts imports.
- **Fix:** `git rebase main` to bring worktree up to date with Plan 01 changes (commits 08b67b1, 69a7ee9, 100d800)
- **Files modified:** None (rebase brought in existing commits)
- **Verification:** lib/schema.ts shows all 3 new tables after rebase
- **Committed in:** Rebase, not a new commit

---

**Total deviations:** 4 auto-fixed (3 blocking, 1 bug/setup)
**Impact on plan:** All auto-fixes were infrastructure setup or blocking import resolution. No scope creep. The core implementation (deriveSerialPrefix, generateCompetitionSerial, tests) matched the plan exactly.

## Issues Encountered
- QUEUE_SPEC contained an inconsistent example (HUB for "Hunger Bells") contradicting its own rule. Resolved by prioritizing D-04 (locked user decision in 06-CONTEXT.md).
- Worktree (agent-adbc0ae4) was on origin/main, missing local main commits from Plan 01. Fixed with `git rebase main`.

## Known Stubs

None — this plan is pure data infrastructure (functions). No UI, no routes, no rendering paths.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `lib/queue/serial.ts` ready for import in Phase 8-9 registration server actions
- `deriveSerialPrefix` can be called during competition creation to pre-compute `serial_prefix` column value
- `generateCompetitionSerial` ready to call with `competition.serialPrefix` and `competition.id` during registration entry creation
- vitest test infrastructure now available for Phase 7 scheduler pure function tests

## Self-Check: PASSED

- lib/queue/serial.ts: FOUND
- lib/queue/serial.test.ts: FOUND
- vitest.config.ts: FOUND
- 06-02-SUMMARY.md: FOUND
- Commit b2d17de (task): FOUND
- Commit 98e612f (docs): FOUND

---
*Phase: 06-schema-foundation*
*Completed: 2026-04-02*
