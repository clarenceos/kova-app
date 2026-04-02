---
phase: 07-scheduling-pure-logic
plan: 02
subsystem: testing
tags: [vitest, typescript, pure-function, scheduling, algorithm, tdd]

# Dependency graph
requires:
  - phase: 07-01
    provides: "SchedulerEntry, SchedulerInput, ScheduleResult, TimeBlock, PlatformSlot, RestConflict, CoachConflict types in lib/queue/types.ts; getWeightClass() in lib/queue/weightClass.ts"

provides:
  - "schedule() pure function in lib/queue/scheduler.ts — sorts entries by KB sport protocol, assigns to time blocks, detects REST and COACH conflicts"
  - "20 vitest unit tests in lib/queue/scheduler.test.ts covering sort order (including super-heavyweight bracket positioning), block assignment, REST conflicts, COACH conflicts, and edge cases"

affects:
  - "phase 10 timetable generation — schedule() is the algorithmic core called by the Phase 10 server action"
  - "future phases needing conflict-aware scheduling (any queue timetable UI)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "weightClassSortKey numeric helper: parseFloat + 0.5 for '+' brackets ensures super-heavyweight sorts after bounded counterpart — not alphabetical string comparison"
    - "Strict less-than REST conflict: gap < minRestBlocks (not <=) per D-09"
    - "Coach matching: toLowerCase().trim() normalization per D-01 — no fuzzy matching, exact normalized match only"

key-files:
  created:
    - lib/queue/scheduler.ts
    - lib/queue/scheduler.test.ts
  modified: []

key-decisions:
  - "weightClassSortKey(wc): '80+kg'->80.5, '95+kg'->95.5 — the +0.5 trick ensures super-heavyweight sorts after its bounded counterpart; plain localeCompare breaks this"
  - "REST conflict uses strict gap < minRestBlocks (D-09), not <=; gap == minRestBlocks is NOT a conflict"
  - "COACH conflict: student is the entry with the coach field set, coach is the entry whose full name matches; studentName and coachName both captured in conflict object"
  - "schedule() does not mutate input entries array — sorted copy via [...entries].sort()"

patterns-established:
  - "Pure function pattern: zero DB imports in lib/queue/scheduler.ts, all dependencies injected via SchedulerInput"
  - "TDD fixture helper makeEntry() with spread overrides — minimal, readable test setup for pure functions"

requirements-completed: [SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05]

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 07 Plan 02: Scheduling Pure Logic Summary

**KB sport scheduling algorithm: sort entries by LC/JERK/SNATCH, duration, gender, numeric-aware weight class (80+kg after 80kg), assign to blocks with greedy platform fill, detect REST and COACH conflicts as rich typed objects**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-02T14:43:11Z
- **Completed:** 2026-04-02T14:45:47Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Implemented `schedule()` pure function with zero DB imports — algorithmic core ready for Phase 10 timetable integration
- weightClassSortKey numeric helper correctly places '80+kg' (80.5) after '80kg' (80) and '95+kg' (95.5) after '95kg' (95) — avoiding broken alphabetical sort where '+' < digit
- 20 unit tests passing covering all KB sport sort rules, block assignment, REST conflict (strict less-than D-09), COACH conflict (case-insensitive D-01), and edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test fixtures and write failing scheduler tests** - `658cd81` (test)
2. **Task 2: Implement schedule function to pass all tests (GREEN)** - `e00687c` (feat)

_Note: TDD tasks — test commit (RED) then implementation commit (GREEN)_

## Files Created/Modified

- `lib/queue/scheduler.ts` — Pure `schedule()` function: sort comparator, block assignment, REST + COACH conflict detection; 229 lines, zero DB imports
- `lib/queue/scheduler.test.ts` — 20 vitest unit tests organized in 5 describe blocks: sort order, block assignment, REST conflict detection, COACH conflict detection, edge cases; 581 lines

## Decisions Made

- **weightClassSortKey numeric trick:** Plain `localeCompare` or string comparison is broken for super-heavyweight brackets — `'80+kg'.localeCompare('80kg')` returns -1, sorting super-heavyweight before its bounded counterpart. Resolved with `parseFloat(wc) + (wc.includes('+') ? 0.5 : 0)` — guarantees correct bracket ordering.
- **REST conflict strict less-than (D-09):** `gap < minRestBlocks` not `gap <= minRestBlocks`. A gap of exactly minRestBlocks is acceptable rest — only strictly less than fires the conflict.
- **COACH conflict semantics (D-01, D-03):** Student = entry with non-null coach field. Coach = entry whose full name (case-insensitive trimmed) matches the coach value. studentName in conflict object is the student's full name.
- **Input immutability:** `[...entries].sort()` creates a sorted copy — input array is not mutated.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `schedule()` is fully tested and ready for Phase 10's timetable generation server action
- Phase 10 caller must filter entries to status='registered' before passing to schedule() (D-04 — scheduler is unaware of entry status)
- Phase 10 will construct SchedulerEntry[] from a DB join of registrants + registration_entries tables
- Weight class is derived in scheduler.ts via getWeightClass() — Phase 10 timetable cells can also call getWeightClass() directly for display

## Known Stubs

None — all functions fully implemented with real algorithmic logic.

---
*Phase: 07-scheduling-pure-logic*
*Completed: 2026-04-02*
