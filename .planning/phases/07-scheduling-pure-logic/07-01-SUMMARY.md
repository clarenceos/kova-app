---
phase: 07-scheduling-pure-logic
plan: 01
subsystem: lib/queue
tags: [pure-function, types, tdd, weight-class, scheduler]
dependency_graph:
  requires: []
  provides: [lib/queue/types.ts, lib/queue/weightClass.ts]
  affects: [07-02-PLAN.md, Phase 10 timetable rendering]
tech_stack:
  added: []
  patterns: [TDD red-green, pure function with no imports, vitest boundary testing]
key_files:
  created:
    - lib/queue/types.ts
    - lib/queue/weightClass.ts
    - lib/queue/weightClass.test.ts
  modified: []
decisions:
  - "weight_class is never stored in DB — derived at render time from getWeightClass(gender, bodyWeightKg) (confirmed v2.0 Roadmap decision)"
  - "SchedulerEntry is the flattened join type — caller constructs from DB query, scheduler receives clean typed array"
  - "Super heavyweight label derived from last bracket limit at runtime (e.g. '80+kg', '95+kg') — not hardcoded strings"
metrics:
  duration: 71s
  completed_date: "2026-04-02"
---

# Phase 07 Plan 01: Scheduler Types and Weight Class Helper Summary

**One-liner:** Scheduler type contracts (SchedulerEntry through ScheduleResult) plus getWeightClass pure function with exact KB sport bracket boundaries — both zero-dependency, fully TDD-tested.

## What Was Built

Created three files establishing the type foundation and weight class derivation for the Phase 07 scheduling system:

1. **`lib/queue/types.ts`** — 8 exported TypeScript interfaces/types: `SchedulerEntry` (flattened join of registrant + entry fields), `SchedulerInput` (with optional defaults noted), `PlatformSlot` (includes derived `weightClass`), `TimeBlock` (1-indexed blocks with platform slots), `RestConflict`, `CoachConflict`, `Conflict` (discriminated union), `ScheduleResult`

2. **`lib/queue/weightClass.ts`** — Pure function `getWeightClass(gender, bodyWeightKg)` with `FEMALE_BRACKETS` (7 brackets, super-heavyweight >80 -> '80+kg') and `MALE_BRACKETS` (7 brackets, super-heavyweight >95 -> '95+kg'). Zero imports — no DB, no schema, no external dependencies.

3. **`lib/queue/weightClass.test.ts`** — 23 vitest tests covering all bracket boundaries for both genders (exact boundary inclusive, fractional above boundary, super heavyweight, extreme values). No `vi.mock` needed — pure function.

## TDD Flow

- **RED:** Test file created, `npx vitest run lib/queue/weightClass.test.ts` exited 1 (Cannot find module './weightClass'). Committed as `test(07-01)`.
- **GREEN:** `weightClass.ts` and `types.ts` created, all 23 tests passed. Committed as `feat(07-01)`.
- **REFACTOR:** Not needed — implementation was clean on first pass.

## Commits

| Hash | Message |
|------|---------|
| cf5193b | test(07-01): add failing weight class derivation tests |
| 1aee4fe | feat(07-01): implement getWeightClass pure function + scheduler types |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files created:
- lib/queue/types.ts — FOUND
- lib/queue/weightClass.ts — FOUND
- lib/queue/weightClass.test.ts — FOUND

Commits:
- cf5193b — FOUND
- 1aee4fe — FOUND

## Self-Check: PASSED
