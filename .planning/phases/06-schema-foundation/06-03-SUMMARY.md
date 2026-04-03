---
phase: 06-schema-foundation
plan: 03
subsystem: database
tags: [vitest, drizzle-orm, serial-numbers, unit-testing, race-condition]

# Dependency graph
requires:
  - phase: 06-02
    provides: generateCompetitionSerial function and serial.ts file with dead retry loop
provides:
  - generateCompetitionSerial with working retry loop that checks serial existence before returning
  - 13 passing unit tests covering both deriveSerialPrefix and generateCompetitionSerial including collision path
  - vitest 4.1.2 installed and functional in node_modules
affects: [07-scheduling-algorithm, any feature using generateCompetitionSerial]

# Tech tracking
tech-stack:
  added: [vitest 4.1.2 (materialized from lockfile via npm install)]
  patterns:
    - vi.fn().mockReturnValue() for default mock values with mockReset()+mockReturnValue() in beforeEach for per-test control
    - mockImplementation() with call counter for simulating sequential DB call results in retry scenarios

key-files:
  created: []
  modified:
    - lib/queue/serial.ts
    - lib/queue/serial.test.ts

key-decisions:
  - "Used mockWhere.mockImplementation() with a call counter to simulate the 4-call sequence (count query, existence check, count retry, existence check retry) without a live DB"
  - "Removed _returnValue property pattern from mock in favor of standard vi.fn().mockReturnValue() — cleaner and uses vitest's built-in API"

patterns-established:
  - "Serial collision retry: count query -> candidate serial -> existence check -> conditional return (not unconditional)"
  - "Test mock structure: single vi.fn() for the where() call, reset in beforeEach, mockImplementation for complex sequential scenarios"

requirements-completed: [DATA-02]

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 06 Plan 03: Gap Closure Summary

**Fixed dead retry loop in generateCompetitionSerial by adding existence check before return; installed vitest 4.1.2; 13 tests passing including collision/retry path**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-02T11:01:42Z
- **Completed:** 2026-04-02T11:04:23Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Fixed `generateCompetitionSerial` — was unconditionally returning serial on first loop iteration (dead retry loop). Now checks if candidate serial exists in DB before returning, retries with incremented sequence number on collision.
- Installed vitest 4.1.2 from lockfile (`npm install`) — was in package.json but not materialized in node_modules.
- Added 3 new tests for `generateCompetitionSerial` covering: base case (0 entries), collision/retry path (TST-0001 taken → returns TST-0002), format validation. All 13 tests pass.

## Task Commits

1. **Task 1: Install vitest and fix generateCompetitionSerial retry loop** - `9fd95a7` (fix)
2. **Task 2: Add tests for generateCompetitionSerial retry behavior** - `2124ea2` (test)

## Files Created/Modified

- `lib/queue/serial.ts` - Fixed: added second `await db.select` to check serial existence before returning; `return serial` now conditional on `existing.count === 0`
- `lib/queue/serial.test.ts` - Updated: enhanced mocks with `vi.fn().mockReturnValue()` pattern; added `generateCompetitionSerial` import; added 3 new tests in new describe block

## Decisions Made

- Used `mockWhere.mockImplementation()` with a call counter for the collision test — needed to return different values for 4 sequential `.where()` calls (count-query, existence-check, count-retry, existence-check-retry).
- Changed from `_returnValue` property pattern to standard `vi.fn().mockReturnValue()` — the plan's proposed mock used a non-standard `_returnValue` property that didn't interact correctly with `mockImplementation`; vitest's built-in `mockReturnValue` is the correct approach.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced non-standard _returnValue mock pattern with vi.fn().mockReturnValue()**
- **Found during:** Task 2 (adding generateCompetitionSerial tests)
- **Issue:** Plan proposed `mockWhere._returnValue = [{ count: 0 }]` in beforeEach and a complex nested mock that called `mockWhere(...wArgs)` then returned `mockWhere._returnValue`. When `mockImplementation` was set in the retry test, it changed what `mockWhere()` returns but the `where` function used `_returnValue` directly — causing the collision test to always return `TST-0001` instead of `TST-0002`.
- **Fix:** Simplified mock: `where: (...wArgs) => mockWhere(...wArgs)` with `mockWhere = vi.fn().mockReturnValue([{ count: 0 }])`. In beforeEach: `mockWhere.mockReset(); mockWhere.mockReturnValue([{ count: 0 }])`. Retry test uses `mockWhere.mockImplementation()` which correctly overrides the return behavior.
- **Files modified:** lib/queue/serial.test.ts
- **Verification:** `npx vitest run lib/queue/serial.test.ts` exits 0 with 13 tests passing including the collision test returning `TST-0002`
- **Committed in:** 2124ea2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in plan's mock implementation)
**Impact on plan:** Auto-fix necessary for correctness. No scope creep — same tests, same behavior verified.

## Issues Encountered

- Plan's proposed mock structure used `_returnValue` as a custom property on the vi.fn() mock, which is not how vitest mocks work. The `mockImplementation()` call takes over what the function returns, making `_returnValue` stale. Fixed by using standard `mockReturnValue()` API.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DATA-02 fully satisfied: serial numbers in XXX-0000 format with UNIQUE constraint (schema) AND working retry loop (code) preventing collision
- vitest infrastructure is functional — ready for Phase 7 scheduler pure-function tests
- `generateCompetitionSerial` is safe to call from registration server action in future phases

---
*Phase: 06-schema-foundation*
*Completed: 2026-04-02*

## Self-Check: PASSED

- FOUND: lib/queue/serial.ts
- FOUND: lib/queue/serial.test.ts
- FOUND: 06-03-SUMMARY.md
- FOUND: commit 9fd95a7
- FOUND: commit 2124ea2
- Tests: 13 passed (0 failed)
