---
phase: 10-organizer-dashboard-timetable
plan: "04"
subsystem: ui
tags: [nextjs, react, tailwind, drizzle, scheduler, timetable, print]

requires:
  - phase: 07-scheduling-pure-logic
    provides: schedule() pure function with ScheduleResult, TimeBlock, PlatformSlot, Conflict types
  - phase: 09-public-registration
    provides: registrants and registrationEntries DB tables with status field
  - phase: 08-competition-creation
    provides: competitions table with numPlatforms field

provides:
  - Timetable page at /organizerdb/queue with server-side scheduler call
  - TimetableGrid client component with event-tinted rows and conflict cell pills
  - TimetableCell client component with stacked LAST, First / Event·bell·weightClass / Club layout
  - ConflictPanel client component with expand/collapse toggle and REST/COACH color coding
  - print.css for landscape A4, B&W, 10px font, nav hidden, conflicts above grid
  - lib/actions/dashboard.ts with getCompetitionDashboard server action

affects: [organizer-dashboard, timetable-view, print-layout]

tech-stack:
  added: []
  patterns:
    - "Server component calls scheduler with SchedulerInput, passes ScheduleResult to client components as props"
    - "Conflict lookup map built in TimetableGrid: entryId -> Conflict[] for O(1) cell rendering"
    - "Event tint applied on majority rule: only when one event > 50% of filled slots in a block"
    - "print.css imported in server page.tsx — Next.js inlines it into the page bundle"

key-files:
  created:
    - app/organizerdb/queue/page.tsx
    - app/organizerdb/queue/_components/TimetableGrid.tsx
    - app/organizerdb/queue/_components/TimetableCell.tsx
    - app/organizerdb/queue/_components/ConflictPanel.tsx
    - app/organizerdb/queue/print.css
    - lib/actions/dashboard.ts
  modified: []

key-decisions:
  - "lib/actions/dashboard.ts created as deviation (Rule 3 blocking) — plan referenced it but file did not exist"
  - "Conflict lookup built as Map<entryId, Conflict[]> in TimetableGrid rather than per-cell iteration — avoids O(n*m) per render"
  - "Event tint majority rule: majority[1] <= events.length / 2 means ties and splits get no tint (neutral)"
  - "ConflictPanel print visibility via print:block on the list div — toggle button has print:hidden"

patterns-established:
  - "TimetableGrid is 'use client' for hover state capability — receives fully pre-computed data from server"
  - "ConflictPanel uses useState(true) for expanded-by-default behavior"
  - "formatTime helper (minutes -> HH:MM string) duplicated in page.tsx and TimetableGrid.tsx intentionally — avoids cross-boundary import"

requirements-completed: [SCHED-07, SCHED-08, SCHED-09]

duration: 8min
completed: 2026-04-03
---

# Phase 10 Plan 04: Timetable Page — Summary

**Timetable page at /organizerdb/queue renders scheduler output as a time-blocked grid with event-tinted rows, stacked cell layout (LAST, First / Event·bell·class / Club), REST/COACH conflict panel, and print-optimized landscape CSS**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-03T10:21:00Z
- **Completed:** 2026-04-03T10:29:47Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Server component QueuePage reads compId + startTime from searchParams, fetches registrants via getCompetitionDashboard, builds SchedulerEntry array filtered to status='registered', calls schedule(), renders ConflictPanel + TimetableGrid with pre-computed result
- TimetableGrid builds conflict lookup map (entryId → Conflict[]), applies majority-event row tint (LC=blue-950/40, JERK=amber-950/40, SNATCH=green-950/40), renders platform columns with TimetableCell per slot
- ConflictPanel: expanded by default (useState(true)), REST conflicts in red, COACH in amber, zero-conflict state in green, toggle hidden in print, list always visible in print
- print.css: A4 landscape, 10mm margins, 10px table font, B&W backgrounds, 100% table width, fixed layout

## Task Commits

1. **Task 1: Timetable page with scheduler integration and TimetableGrid** - `619eadc` (feat)
2. **Task 2: ConflictPanel and print CSS** - `b4d2ae5` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/organizerdb/queue/page.tsx` — Server component; reads params, fetches data, calls schedule(), renders page
- `app/organizerdb/queue/_components/TimetableGrid.tsx` — Client component; conflict lookup map, event tinting, table with platform columns
- `app/organizerdb/queue/_components/TimetableCell.tsx` — Client component; stacked cell: LAST, First / Event·bell·weightClass / Club + conflict pills
- `app/organizerdb/queue/_components/ConflictPanel.tsx` — Client component; collapsible REST/COACH conflict list
- `app/organizerdb/queue/print.css` — Print media query: landscape A4, B&W, 10px, hide nav
- `lib/actions/dashboard.ts` — Server action: getCompetitionDashboard (joins registrants + entries)

## Decisions Made

- `lib/actions/dashboard.ts` created as a Rule 3 (blocking) deviation — plan referenced `getCompetitionDashboard` from this path but the file did not exist in the codebase
- Conflict lookup built as `Map<entryId, Conflict[]>` inside TimetableGrid rather than searching per-cell — avoids O(n*m) work during render
- Event tint majority threshold: `majority[1] <= events.length / 2` means tied or split blocks get no tint (neutral charcoal), per D-16 spec for mixed blocks
- `formatTime` duplicated in `page.tsx` (for estimatedFinishTime display) and `TimetableGrid.tsx` (for block start times) — both are pure helpers, cross-component import would introduce a module just for one function

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created lib/actions/dashboard.ts**
- **Found during:** Task 1 (timetable page setup)
- **Issue:** Plan's page.tsx imports `getCompetitionDashboard` from `@/lib/actions/dashboard` but that file did not exist in the project. TypeScript would fail at build.
- **Fix:** Created `lib/actions/dashboard.ts` with `getCompetitionDashboard` server action that fetches competition + registrants + entries and joins them client-side via array filter
- **Files modified:** `lib/actions/dashboard.ts` (created)
- **Verification:** `npx tsc --noEmit` passes with zero errors after creation
- **Committed in:** `619eadc` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for compilation. No scope creep — the action signature matches exactly what the plan specified in the `<interfaces>` block.

## Issues Encountered

- Worktree branch was behind main by ~80 commits and did not have lib/queue/, app/organizerdb/, or drizzle schema changes. Resolved by merging origin/main into the worktree branch before starting implementation.

## Known Stubs

None — all data is live from the database via getCompetitionDashboard and schedule().

## Next Phase Readiness

- Timetable page is functional end-to-end: organizer navigates to /organizerdb/queue?compId=xxx&startTime=540 and sees the full grid
- Phase 10 plans 01-03 (dashboard evolutions) are parallelized — this plan (04) is independent of those
- Print layout ready for venue use: Cmd+P / Ctrl+P produces landscape B&W timetable with conflicts above grid

## Self-Check: PASSED

- app/organizerdb/queue/page.tsx — FOUND
- app/organizerdb/queue/_components/TimetableGrid.tsx — FOUND
- app/organizerdb/queue/_components/TimetableCell.tsx — FOUND
- app/organizerdb/queue/_components/ConflictPanel.tsx — FOUND
- app/organizerdb/queue/print.css — FOUND
- lib/actions/dashboard.ts — FOUND
- Commit 619eadc — FOUND (feat(10-04): timetable page with scheduler integration)
- Commit b4d2ae5 — FOUND (feat(10-04): ConflictPanel and print CSS)

---
*Phase: 10-organizer-dashboard-timetable*
*Completed: 2026-04-03*
