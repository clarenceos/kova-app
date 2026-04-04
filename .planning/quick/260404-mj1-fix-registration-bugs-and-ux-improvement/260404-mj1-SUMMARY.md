---
phase: quick
plan: 260404-mj1
subsystem: registration, organizer-dashboard, ui-components
tags: [bug-fix, ux, forms, csv, db-batch]
dependency_graph:
  requires: []
  provides: [working-multi-discipline-registration, csv-template-export, status-dropdown, visible-form-controls]
  affects: [registration-flow, organizer-dashboard]
tech_stack:
  added: []
  patterns: [db.batch-unknown-cast, csv-blob-download, select-dropdown-status]
key_files:
  created: []
  modified:
    - lib/actions/registrations.ts
    - app/organizerdb/_components/DashboardClient.tsx
    - components/ui/radio-group.tsx
    - components/ui/checkbox.tsx
decisions:
  - "Applied db.batch() unknown cast in registerAthlete to match bulkImportRegistrants pattern — dynamic spread with >1 event failed without the cast (same root cause as Phase 10-01 decision)"
  - "CSV template export uses Blob + object URL + programmatic anchor click — no server route needed, purely client-side"
  - "Status select trigger uses conditional className function rather than inline ternary chains for readability"
  - "Surgical fix for radio/checkbox visibility: replace border-input class directly in components rather than changing --input CSS variable globally"
metrics:
  duration: "~2.5 minutes"
  completed: "2026-04-04T08:20:00Z"
  tasks_completed: 2
  files_modified: 4
---

# Quick Task 260404-mj1: Fix Registration Bugs and UX Improvements Summary

**One-liner:** Fixed db.batch() tuple cast for multi-discipline registration, added CSV template download, replaced status cycling with a color-coded Select dropdown, and restored radio/checkbox border visibility on dark backgrounds.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix multi-discipline registration, CSV template export, status dropdown | 4320b73 | lib/actions/registrations.ts, app/organizerdb/_components/DashboardClient.tsx |
| 2 | Fix radio/checkbox unselected border visibility on dark backgrounds | f3a77e3 | components/ui/radio-group.tsx, components/ui/checkbox.tsx |

## What Was Done

### Task 1 — Three changes in two files

**Bug fix — Multi-discipline registration (registrations.ts):**
The `registerAthlete` server action used `db.batch()` with a bare dynamic spread `[insert_registrant, ...events.map(...)]`. Drizzle requires a tuple type for `db.batch()`, and the TypeScript spread pattern fails at runtime when the array has more than one event entry. Applied the same `as unknown as Parameters<typeof db.batch>[0]` cast that `bulkImportRegistrants` already used (Phase 10-01 decision). Athletes can now register for 2+ disciplines simultaneously.

**Feature — CSV Template Export (DashboardClient.tsx):**
Added an "CSV Template" button with a `Download` icon next to the CSV Import modal. Clicking it generates a `registration-template.csv` Blob with the correct headers (`Last Name,First Name,Gender,Body Weight (kg),Country,Events,Bell Weights,Duration,Club,Coach`) and one example row, then downloads it via a programmatic anchor click. This gives coaches a correctly-formatted starting file for bulk import.

**Feature — Status Dropdown (DashboardClient.tsx):**
Replaced the `StatusBadge` + `RefreshCw` cycle button with a shadcn `Select` component. The trigger shows the current status and is color-coded: green-tinted for `open`, red-tinted for `closed`, neutral for `draft`. Selecting a value calls `updateCompetitionStatus` server action and reloads the page. Removed `StatusBadge` component, `STATUS_CYCLE` constant, `handleStatusCycle`, and `RefreshCw` import.

### Task 2 — Radio/Checkbox Visibility

**Root cause:** The `--input` CSS variable was `#1A1A1A` — identical to the charcoal background — making `border-input` invisible. Both `RadioGroupItem` and `Checkbox` used `border-input` for their unchecked state, and `dark:bg-input/30` added extra darkness.

**Surgical fix:** Replaced `border border-input` with `border border-raw-steel/30` and `dark:bg-input/30` with `dark:bg-transparent` in both components. This matches the existing `inputClass` convention used in form inputs throughout the app. Selected state (`data-checked:border-primary data-checked:bg-primary`) is unchanged.

## Deviations from Plan

None — plan executed exactly as written. The db.batch() fix matched the plan's described root cause and recommended cast pattern precisely.

## Known Stubs

None — all changes are fully wired to real data and actions.

## Self-Check: PASSED

- lib/actions/registrations.ts: FOUND
- app/organizerdb/_components/DashboardClient.tsx: FOUND
- components/ui/radio-group.tsx: FOUND
- components/ui/checkbox.tsx: FOUND
- Commit 4320b73: FOUND
- Commit f3a77e3: FOUND
