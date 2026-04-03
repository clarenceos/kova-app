---
phase: 10-organizer-dashboard-timetable
plan: "02"
subsystem: organizer-dashboard
tags: [registrations-table, remove-registrant, sort, filter, client-components]
dependency_graph:
  requires: ["10-01"]
  provides: ["RegistrationsTable", "RemoveRegistrantDialog"]
  affects: ["app/organizerdb/_components/DashboardClient.tsx"]
tech_stack:
  added: []
  patterns: ["client-side sort with useState", "controlled Dialog open=true pattern", "useRouter.refresh() for server re-render after mutation"]
key_files:
  created: []
  modified:
    - app/organizerdb/_components/RegistrationsTable.tsx
    - app/organizerdb/_components/RemoveRegistrantDialog.tsx
decisions:
  - "SortableHeader rendered as inner function inside RegistrationsTable to capture sort state closure — avoids prop drilling"
  - "RemoveRegistrantDialog uses controlled open=true and delegates cancel/close to onRemoved callback — keeps open/close state in parent (RegistrationsTable)"
  - "Empty state check placed before filter/sort logic and before filter bar render — keeps component clean when no registrants exist"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_modified: 2
requirements:
  - DASH-03
  - DASH-04
---

# Phase 10 Plan 02: Registrations Table and Remove Dialog Summary

Replaced Plan 01 stubs with full client-side sortable/filterable registrations table and a confirmation dialog for registrant removal — uses shadcn Table/Badge/Dialog/Tooltip, calls removeRegistrant server action via db.batch(), and refreshes via router.refresh() on success.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement RegistrationsTable with sort, filter, event pills | ca130d4 | app/organizerdb/_components/RegistrationsTable.tsx |
| 2 | Implement RemoveRegistrantDialog with confirmation and server action | 7f3bf59 | app/organizerdb/_components/RemoveRegistrantDialog.tsx |

## What Was Built

### RegistrationsTable (`app/organizerdb/_components/RegistrationsTable.tsx`)

Full 194-line `'use client'` component replacing the 27-line stub:

- **10 columns per D-10:** #, Full Name (LAST, First format), Gender, Bodyweight (kg), Country, Events (badges), Club, Coach, Registered At, Actions
- **Sort state:** `useState<{ column: SortColumn; direction: SortDirection }>` defaults to `registeredAt desc`
- **Sort columns:** Full Name, Bodyweight, Registered At — clicking toggles asc/desc; clicking different column resets to asc
- **SortableHeader inner function:** captures `sortConfig` closure, renders `ArrowUpDown`/`ArrowUp`/`ArrowDown` icons from lucide-react
- **Event filter pills:** All/LC/Jerk/Snatch — active state `bg-patina-bronze/20 text-bright-bronze border-bright-bronze/30`, inactive `bg-charcoal text-raw-steel`
- **Gender filter pills:** All/M/F with same active/inactive styling
- **Events column:** one `Badge variant="outline"` per registration entry with `bg-charcoal text-parchment border-raw-steel/20`
- **Actions column:** `Trash2` button wrapped in `TooltipProvider > Tooltip > TooltipTrigger > TooltipContent` ("Remove registrant")
- **Empty state:** exact UI-SPEC text "No registrations yet — share the registration link or import a CSV to get started."
- **RemoveRegistrantDialog integration:** renders when `removingRegistrant` state is set; `onRemoved` clears state and calls `router.refresh()`

### RemoveRegistrantDialog (`app/organizerdb/_components/RemoveRegistrantDialog.tsx`)

Full 84-line `'use client'` component replacing the 18-line stub:

- **Controlled Dialog:** `open={true}`, `onOpenChange` calls `onRemoved()` on close (cancel path)
- **DialogTitle:** `"Remove {registrantName}?"` using exact prop value
- **DialogDescription:** `"This will delete their registration and all serial numbers ({serials.join(', ')}). This cannot be undone."`
- **Inline error:** `<p className="text-sm text-red-400">{error}</p>` below description when error state is set
- **Cancel button:** `Button variant="outline"`, disabled during removal
- **Remove button:** raw `<button>` with `bg-red-600 hover:bg-red-700 text-white` per UI-SPEC (not shadcn destructive variant)
- **handleRemove:** calls `removeRegistrant(registrantId, competitionId)`, shows inline error on failure (keeps dialog open), calls `onRemoved()` on success
- **Props match stub signature exactly:** `registrantName`, `serials`, `registrantId`, `competitionId`, `onRemoved`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both components are fully implemented. No hardcoded empty values or placeholder text flows to UI rendering.

## Self-Check

### Created files exist:
- No new files created (modifications only)

### Modified files exist:
- `app/organizerdb/_components/RegistrationsTable.tsx` — FOUND (194 lines, replaces 27-line stub)
- `app/organizerdb/_components/RemoveRegistrantDialog.tsx` — FOUND (84 lines, replaces 18-line stub)

### Commits exist:
- `ca130d4` feat(10-02): implement RegistrationsTable — FOUND
- `7f3bf59` feat(10-02): implement RemoveRegistrantDialog — FOUND

## Self-Check: PASSED
