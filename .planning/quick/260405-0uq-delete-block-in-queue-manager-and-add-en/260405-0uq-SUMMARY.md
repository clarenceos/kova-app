---
phase: quick
plan: 260405-0uq
subsystem: organizer-dashboard
tags: [queue, timetable, registrants, organizer-ux]
dependency_graph:
  requires: [quick-260404-us8, quick-260405-0hx]
  provides: [delete-block-from-queue, add-registrant-from-dashboard]
  affects: [TimetableGrid, DashboardClient, AddRegistrantDialog]
tech_stack:
  added: []
  patterns: [DialogTrigger self-contained pattern, structuredClone + renumber + recalculate]
key_files:
  created:
    - app/organizerdb/_components/AddRegistrantDialog.tsx
  modified:
    - app/organizerdb/queue/_components/TimetableGrid.tsx
    - app/organizerdb/_components/DashboardClient.tsx
decisions:
  - "Delete block uses same renumber+recalculate pattern as handleInsertBlock for consistency"
  - "AddRegistrantDialog uses DialogTrigger self-contained pattern (not controlled open=true like EditRegistrantDialog) — trigger button lives inside the component"
  - "allowedDurations cast with 'as' in DashboardClient — Competition schema field is text (string), not a union type; cast is safe"
  - "registerAthlete server action rejects non-open competitions — organizer Add Entry will error if competition is not open; documented as expected behaviour"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-05"
  tasks_completed: 2
  files_changed: 3
---

# Phase quick Plan 260405-0uq: Delete Block in Queue Manager and Add Entry Summary

Delete block from timetable grid with renumber+recalculate, plus self-contained AddRegistrantDialog wired into dashboard action bar.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add delete-block to TimetableGrid | b8fc57d | TimetableGrid.tsx |
| 2 | AddRegistrantDialog + DashboardClient wire-up | b22c723 | AddRegistrantDialog.tsx (new), DashboardClient.tsx |

## What Was Built

### Task 1 — Delete Block (TimetableGrid)

`handleDeleteBlock(blockIdx)` added to TimetableGrid:
1. Clones `timeBlocks` via `structuredClone`
2. Splices out the block at `blockIdx`
3. Renumbers remaining blocks sequentially (`blockNumber = i + 1`)
4. Recalculates times from first block's startTime — same `transitionDuration + blockDuration` formula as `handleInsertBlock`
5. Calls `recalculate()` to re-run `assignJudges` + `detectConflicts`
6. Sets `isDirty(true)`

Delete button placed in the block number `<td>` — `Trash2` icon from lucide-react. Hidden when `timeBlocks.length <= 1` (can't delete the last block). `print:hidden` applied. `opacity-60 hover:opacity-100 text-raw-steel hover:text-red-400` styling.

### Task 2 — Add Entry (AddRegistrantDialog + DashboardClient)

New `AddRegistrantDialog` component:
- Self-contained with `useState(false)` for `open`, uses `DialogTrigger` pattern
- Trigger: `UserPlus` icon button styled identically to CSV Template button
- Collects: Last Name, First Name, Gender, Body Weight, Country, Judging Status, Club, Coach
- Events section: LC, JERK, SNATCH checkboxes; when checked reveals bell weight select (filtered by `2x`/`1x` prefix for double/single bells respectively) and duration select/label
- Judge-only (`isJudging === '1'`) hides events section entirely
- On submit: validates required fields, builds events array, calls `registerAthlete` server action
- Error shown inline; on success calls `onAdded()` and resets form

`DashboardClient.tsx` — `AddRegistrantDialog` inserted after CSV Template button, before `GenerateQueueModal`. Props wired from `dashboardData.competition`. `onAdded` triggers `window.location.reload()`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Both features are fully wired to the database via the `registerAthlete` server action.

## Self-Check: PASSED

- FOUND: app/organizerdb/queue/_components/TimetableGrid.tsx
- FOUND: app/organizerdb/_components/AddRegistrantDialog.tsx
- FOUND: app/organizerdb/_components/DashboardClient.tsx
- FOUND commit b8fc57d: feat(quick-260405-0uq): Task 1
- FOUND commit b22c723: feat(quick-260405-0uq): Task 2
