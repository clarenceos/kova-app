---
quick_task: 260404-us8
type: summary
description: "Queue view enhancements (legend, insert block, save/regenerate, edit competition) and judge assignment system"
completed_date: "2026-04-04"
duration_seconds: 645
tasks_completed: 6
tasks_total: 6
files_created:
  - drizzle/0004_tranquil_hellion.sql
  - app/organizerdb/queue/_components/InsertBlockRow.tsx
  - app/organizerdb/edit/page.tsx
  - app/organizerdb/edit/_components/EditCompetitionForm.tsx
  - lib/queue/assignJudges.ts
files_modified:
  - lib/schema.ts
  - lib/actions/competitions.ts
  - lib/actions/registrations.ts
  - lib/actions/dashboard.ts (no changes needed — Drizzle select picks up new columns automatically)
  - lib/queue/types.ts
  - lib/queue/scheduler.ts
  - lib/queue/detectConflicts.ts
  - app/organizerdb/queue/page.tsx
  - app/organizerdb/queue/_components/TimetableGrid.tsx
  - app/organizerdb/queue/_components/TimetableCell.tsx
  - app/organizerdb/queue/_components/ConflictPanel.tsx
  - app/organizerdb/_components/DashboardClient.tsx
  - app/organizerdb/_components/RegistrationsTable.tsx
  - app/registration/[compId]/_components/RegistrationForm.tsx
key_decisions:
  - "JudgeConflict/JudgeCandidate types and PlatformSlot.judge field added in Task 2 (not Task 5) to unblock TimetableGrid JUDGE conflict lookup that referenced the type early"
  - "assignJudges clones internally via structuredClone — callers do not need to pre-clone"
  - "recalculate() helper in TimetableGrid encapsulates assignJudges+detectConflicts into one call after any mutation"
  - "queue/page.tsx re-runs assignJudges even on saved queue load — judge assignments stay fresh if registrants change between saves"
  - "bulkImportRegistrants in dashboard.ts does not set isJudging — defaults to 0 (CSV import path for competitors only)"
commits:
  - "d017c1d: Task 1 — schema"
  - "0a552c3: Task 2 — queue UX"
  - "80fdf50: Task 3 — edit competition page"
  - "0e64740: Task 4 — registration form isJudging"
  - "eae1e35: Task 5 — assignJudges"
  - "f81b126: Task 6 — wire judge assignment"
---

# Quick Task 260404-us8 Summary

**One-liner:** Queue save/load with JSON persistence, penalty-scored judge assignment with OWN_STUDENT/SAME_CLUB/NO_JUDGE conflicts, edit competition form, and judge-only registration path.

## Tasks Completed

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Schema: queue_json + queueSavedAt + isJudging | Done | d017c1d |
| 2 | Queue UX: legend, insert block, save/regenerate | Done | 0a552c3 |
| 3 | Edit competition page + dashboard link | Done | 80fdf50 |
| 4 | Registration form isJudging options | Done | 0e64740 |
| 5 | assignJudges pure function + conflict integration | Done | eae1e35 |
| 6 | Wire judge assignment: page, grid, cell, panel, badges | Done | f81b126 |

## Features Implemented

### Queue Persistence (Tasks 1 + 2)
- `competitions.queue_json` (TEXT nullable): stores `JSON.stringify(TimeBlock[])`
- `competitions.queue_saved_at` (INTEGER timestamp nullable): last saved
- Save Queue button: calls `saveQueue` server action, sets `isDirty=false`, updates banner
- Regenerate: calls `clearQueue` then `window.location.reload()` to re-run scheduler
- Dirty indicator: "Unsaved changes" shown after DnD swap or insert block
- Saved banner: "Showing saved queue — last saved [date]" when loading from DB

### Legend (Task 2)
- Row 1: event color swatches (LC=blue, Jerk=amber, Snatch=green, Mixed=neutral)
- Row 2: conflict pills (REST=red, COACH=amber, JUDGE=violet) with descriptions

### Insert Block (Task 2)
- `InsertBlockRow` between every `<tr>`: invisible until hover, "+" button reveals
- On click: splices empty block at position, renumbers all blocks, recalculates times + conflicts + judges

### Edit Competition (Task 3)
- `/organizerdb/edit?compId=xxx`: server component fetches competition, renders `EditCompetitionForm`
- All fields prefilled from DB; serial prefix shown read-only (not editable)
- `updateCompetition` server action validates and writes (prefix immutable)
- "Edit" link added to dashboard next to serial prefix display

### Judge Registration (Task 4)
- RegistrationForm: "I am judging only" checkbox — disables all events when checked
- RegistrationForm: "I am also available to judge" checkbox for competing athletes
- `isJudging` derived: `isJudgeOnly ? 1 : isAlsoJudging ? 2 : 0`
- `registerAthlete` server action: accepts `isJudging?`, skips events validation for `isJudging===1`, stores value on registrant row

### Judge Assignment (Tasks 5 + 6)
- `assignJudges` pure function: penalty-scored greedy assignment per block per slot
  - Hard constraints: `isJudging` must be 1 or 2, not competing this block, not double-assigned
  - `+5` OWN_STUDENT penalty (judge name matches athlete's coach field)
  - `+2` SAME_CLUB penalty (same club)
  - `NO_JUDGE_AVAILABLE` emitted when no eligible candidates remain
- `detectConflicts` updated to accept `judgeConflicts[]` and merge them
- `PlatformSlot.judge` field: `{ registrantId, firstName, lastName } | null`
- TimetableCell: "Judge: LAST, First" in muted `text-raw-steel/40`
- TimetableCell: conflict pills violet for JUDGE type
- ConflictPanel: renders JUDGE conflicts with reason-specific messages in violet
- RegistrationsTable: "Judge only" badge (violet) for `isJudging=1`, "+ Judge" for `isJudging=2`

## Deviations from Plan

### Auto-added in Task 2 (Rule 2 — missing critical functionality)
**JudgeConflict type and PlatformSlot.judge field added early**
- **Found during:** Task 2 TypeScript check after writing TimetableGrid
- **Issue:** TimetableGrid references `c.type === 'JUDGE'` in conflictsByEntry loop, which requires the type to exist for the TS compiler
- **Fix:** Added `JudgeConflict`, `JudgeCandidate` types and updated `Conflict` union + `PlatformSlot.judge` field in `lib/queue/types.ts` during Task 2 instead of Task 5. Also set `judge: null` in `scheduler.ts buildPlatformSlot`.
- **Files modified:** `lib/queue/types.ts`, `lib/queue/scheduler.ts`
- **Impact:** Task 5 type work was already done — Task 5 only needed to create `assignJudges.ts` and update `detectConflicts.ts`

## Known Stubs

None — all features are fully wired end-to-end with real DB data.

## Self-Check: PASSED

All key files verified present:
- lib/schema.ts — FOUND
- lib/queue/assignJudges.ts — FOUND
- app/organizerdb/edit/page.tsx — FOUND
- app/organizerdb/queue/_components/InsertBlockRow.tsx — FOUND
- drizzle/0004_tranquil_hellion.sql — FOUND

All 6 task commits verified:
- d017c1d: Task 1 schema
- 0a552c3: Task 2 queue UX
- 80fdf50: Task 3 edit competition
- 0e64740: Task 4 registration isJudging
- eae1e35: Task 5 assignJudges
- f81b126: Task 6 wire judge assignment
