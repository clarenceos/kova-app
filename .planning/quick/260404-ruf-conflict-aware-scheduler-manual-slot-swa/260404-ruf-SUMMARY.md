---
phase: quick
plan: 260404-ruf
subsystem: scheduling
tags: [scheduler, conflict-detection, drag-and-drop, timetable, coach-avoidance]
dependency_graph:
  requires: []
  provides:
    - detectConflicts standalone pure function
    - conflict-aware 1-lookahead block assignment
    - drag-and-drop slot swap with live conflict recalculation
    - coach name display on timetable cells
  affects:
    - lib/queue/scheduler.ts
    - app/organizerdb/queue/
tech_stack:
  added: []
  patterns:
    - 1-lookahead adjacent swap for conflict-aware block assignment
    - pure function extraction for cross-boundary reuse (server fn -> client component)
    - structuredClone for immutable state update of nested arrays
    - HTML5 drag-and-drop API with React synthetic events
key_files:
  created:
    - lib/queue/detectConflicts.ts
  modified:
    - lib/queue/scheduler.ts
    - lib/queue/scheduler.test.ts
    - app/organizerdb/queue/_components/TimetableGrid.tsx
    - app/organizerdb/queue/_components/TimetableCell.tsx
    - app/organizerdb/queue/page.tsx
decisions:
  - "detectConflicts extracted as pure function with no server imports — safe to import from 'use client' components without bundler errors"
  - "1-lookahead swap (adjacent only) chosen over deep search to minimize sort order disruption and keep O(n) block fill"
  - "structuredClone used for immutable DnD swap state update — TimeBlock contains nested arrays of PlatformSlot objects"
  - "TimetableGrid renders ConflictPanel internally so conflicts update live after swaps without lifting state to page.tsx"
  - "DnD swaps are client-side only — page refresh resets to auto-scheduled arrangement; no server action for persisting swaps"
metrics:
  duration_seconds: 455
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_modified: 6
---

# Phase quick Plan 260404-ruf: Conflict-Aware Scheduler with Manual Slot Swap Summary

**One-liner:** 1-lookahead COACH-conflict-avoiding scheduler, extracted detectConflicts pure function, HTML5 DnD slot swap with live conflict recalculation, and coach name on athlete cells.

## What Was Built

### Task 1: Extract detectConflicts and conflict-aware block assignment

**lib/queue/detectConflicts.ts** — New standalone pure function containing the REST and COACH conflict detection logic extracted from scheduler.ts Phase C. Has zero server imports, making it safe to call directly from `'use client'` components (TimetableGrid) without bundler errors.

**lib/queue/scheduler.ts** — Phase B replaced with a 1-lookahead conflict-aware block assignment algorithm:
- Converts the sorted entry array to a mutable queue
- For each slot in a block, before placing the next entry, checks if it would create a COACH conflict with entries already placed in that block
- If conflict detected and the next queue entry would NOT conflict: swap the two (adjacent swap only) then place the swapped-in entry
- If no valid swap (end of queue, or next entry also conflicts): force-place the original entry (conflict gets flagged by detectConflicts)
- Phase C replaced with `detectConflicts(timeBlocks, minRestBlocks)` call

**lib/queue/scheduler.test.ts** — 4 new tests added in `describe("conflict-aware scheduling")`:
1. Scheduler separates coach and student when valid swap exists (Regine/Ana/Jun scenario)
2. 1-platform scenario trivially separates coach+student into different blocks (no conflict)
3. Force-place when swap candidate also conflicts (3-platform, 2 students of same coach)
4. `detectConflicts` standalone returns same results as `schedule()` for identical block layout

All 20 existing tests continue to pass (total: 24 tests in the file, 104 across worktrees).

### Task 2: DnD swap UI, coach name, live conflicts

**TimetableCell.tsx** — Line 3 now shows club and/or coach:
- `"Manila KB · (Regine Sulit)"` when both present
- `"Manila KB"` when coach is null
- `"(Regine Sulit)"` when club is null but coach set
- Line hidden when both null

**TimetableGrid.tsx** — Rewritten as stateful component:
- Props changed from `{ timeBlocks, numPlatforms, conflicts }` to `{ initialTimeBlocks, numPlatforms, initialConflicts, minRestBlocks }`
- `useState(initialTimeBlocks)` and `useState(initialConflicts)` for mutable local state
- ConflictPanel rendered inside TimetableGrid (above the table) so it updates live after swaps
- HTML5 drag-and-drop on every `<td>`: `draggable={slot != null}`, `onDragStart/Over/Enter/Leave/Drop/End`
- On drop: `structuredClone(timeBlocks)` → swap two `PlatformSlot | null` entries → `setTimeBlocks` → `detectConflicts(newBlocks, minRestBlocks)` → `setConflicts`
- Empty cells are valid drop targets (moves athlete to empty slot, leaves null at source)
- Visual feedback: source cell `opacity-50`, hover target `border-2 border-dashed border-parchment/40`
- `cursor-grab` class on draggable cells

**page.tsx** — Removed ConflictPanel import/render, updated TimetableGrid props to `initialTimeBlocks/initialConflicts/minRestBlocks`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | bcfc138 | feat(quick-260404-ruf): extract detectConflicts and add 1-lookahead conflict-aware scheduler |
| 2 | 0d6f3fa | feat(quick-260404-ruf): DnD slot swap, coach name on cells, live conflict recalculation |

## Verification

- `npx vitest run lib/queue/scheduler.test.ts` — 104 tests pass (5 test files across worktrees, 24 in this file)
- `npx next build` — succeeded, no type errors, all 22 routes compiled

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Notable implementation details vs plan description:**

- **Task 1 "force-place when no valid swap" test:** The plan described a "1 platform, 2 entries" scenario. With 1 platform, coach and student land in separate blocks naturally (no conflict needed). The test was written to verify this correct 1-platform behavior, while the existing "COACH conflict detection" test already covers the 2-platform/2-entry force-place case (no swap candidate). Added a 3-platform test to cover the case where the immediate next entry also conflicts, verifying only 1 conflict is flagged (not 2) after the successful swap for the third student.

## Known Stubs

None. All data is wired from the scheduler result through to the UI. Coach name displayed when present in DB data.

## Self-Check

- FOUND: lib/queue/detectConflicts.ts
- FOUND: lib/queue/scheduler.ts
- FOUND: app/organizerdb/queue/_components/TimetableGrid.tsx
- FOUND: commit bcfc138
- FOUND: commit 0d6f3fa

## Self-Check: PASSED
