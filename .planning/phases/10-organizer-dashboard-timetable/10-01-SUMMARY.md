---
phase: 10-organizer-dashboard-timetable
plan: "01"
subsystem: organizer-dashboard
tags: [dashboard, server-actions, shadcn, competition-selector, analytics]
depends_on: []
provides:
  - lib/actions/dashboard.ts (getCompetitions, getCompetitionDashboard, removeRegistrant, bulkImportRegistrants)
  - app/organizerdb/page.tsx (server component, reads searchParams.compId)
  - app/organizerdb/_components/DashboardClient.tsx (orchestrator client component)
  - app/organizerdb/_components/CompetitionSelector.tsx (Popover+Command dropdown)
  - app/organizerdb/_components/AnalyticsBar.tsx (horizontal stat cards)
  - Stub components: RegistrationsTable, RemoveRegistrantDialog, CSVImportModal, QRCodeModal, GenerateQueueModal
affects:
  - Plans 02-03 (consume stub components — replace stub bodies with full implementations)
tech-stack:
  added:
    - shadcn select (components/ui/select.tsx)
    - shadcn table (components/ui/table.tsx)
    - shadcn tooltip (components/ui/tooltip.tsx)
    - shadcn separator (components/ui/separator.tsx)
  patterns:
    - 3-query pattern for dashboard data (competition + registrants + entries; grouped in JS)
    - db.batch() for atomic removeRegistrant mutation
    - db.batch() + serial for-loop for bulkImportRegistrants
    - Popover+Command for searchable dropdown with custom item rendering
    - searchParams as Promise<{compId?>} in Next.js 16 App Router
key-files:
  created:
    - lib/actions/dashboard.ts
    - app/organizerdb/_components/DashboardClient.tsx
    - app/organizerdb/_components/CompetitionSelector.tsx
    - app/organizerdb/_components/AnalyticsBar.tsx
    - app/organizerdb/_components/RegistrationsTable.tsx
    - app/organizerdb/_components/RemoveRegistrantDialog.tsx
    - app/organizerdb/_components/CSVImportModal.tsx
    - app/organizerdb/_components/QRCodeModal.tsx
    - app/organizerdb/_components/GenerateQueueModal.tsx
    - components/ui/select.tsx
    - components/ui/table.tsx
    - components/ui/tooltip.tsx
    - components/ui/separator.tsx
  modified:
    - app/organizerdb/page.tsx (full rewrite from card-list to server component)
decisions:
  - Used Popover+Command instead of shadcn Select for CompetitionSelector — Select's ItemText limits custom rendering; Popover+Command allows name + date + badge per item
  - 3 separate DB queries + JS grouping for getCompetitionDashboard — avoids verbose Drizzle join syntax, sufficient for <=200 registrants (D-09)
  - db.batch() cast via unknown for bulkImportRegistrants — Drizzle's batch() requires a tuple type; dynamically-built array must be cast since TypeScript cannot infer tuple length at compile time
metrics:
  duration: "~10 minutes"
  completed: "2026-04-03"
  tasks: 2
  files: 14
---

# Phase 10 Plan 01: Dashboard Foundation Summary

**One-liner:** Competition selector dropdown + analytics stat cards + server actions for dashboard CRUD using 3-query data pattern and db.batch() mutations.

## What Was Built

### Task 1: Dashboard server actions (`lib/actions/dashboard.ts`)

Four exported server actions:

- `getCompetitions()` — fetches all competitions sorted by `desc(createdAt)` for the selector dropdown
- `getCompetitionDashboard(compId)` — 3 queries (competition, registrants, entries) with JS grouping into `RegistrantWithEntries[]`; returns `{ competition, registrants, totalCount }` or `{ error }`
- `removeRegistrant(registrantId, competitionId)` — `db.batch([delete entries, delete registrant])` then `revalidatePath`
- `bulkImportRegistrants({ competitionId, rows })` — generates serials in for-loop before `db.batch()` (same pattern as `registerAthlete`), then revalidatePath

Exported types: `RegistrantWithEntries`, `CSVRow` — consumed by client components in Wave 2.

### Task 2: Dashboard page + components

`app/organizerdb/page.tsx` (rewritten):
- Async server component reading `await searchParams` for `compId`
- Calls `getCompetitions()` always; calls `getCompetitionDashboard(compId)` when compId present
- Passes data to `DashboardClient`; max-w-6xl container (wider than previous max-w-4xl for table layout)

`DashboardClient.tsx` — client orchestrator rendering:
1. CompetitionSelector (left) + "New Competition" link (right)
2. Empty state (no competitions): centered with "No competitions yet" heading and Create CTA
3. No-selection state: muted text "Select a competition above to view registrations and manage your event."
4. Selected state: action bar (CopyLinkButton + QRCodeModal + CSV + GenerateQueue), AnalyticsBar, RegistrationsTable

`CompetitionSelector.tsx` — Popover+Command dropdown showing name (bold 14px), date (12px raw-steel), status badge per item. On select: `router.push('/organizerdb?compId=${id}')`. Status badges honor D-04: Open=`bg-green-900/30 text-green-400`, Draft=`bg-raw-steel/20 text-raw-steel`, Closed=`bg-red-900/30 text-red-400`.

`AnalyticsBar.tsx` — flex-wrap row of `StatCard` components. Cards: Total, LC, Jerk, Snatch, Male, Female. Conditional: Spots Remaining (only if `maxRegistrants` set), Deadline countdown (only if `registrationDeadline` set). Deadline formats: "N days" / "N hours" / "Expired".

**Stub components** (Wave 2 plans replace these):
- `RegistrationsTable` — shows placeholder count or no-registrations message
- `RemoveRegistrantDialog` — returns null
- `CSVImportModal` — returns null
- `QRCodeModal` — returns null
- `GenerateQueueModal` — returns null

## Decisions Made

1. **Popover+Command over shadcn Select** — shadcn's `SelectItem` wraps children in `SelectPrimitive.ItemText` which renders as text only. Custom rendering (name + date + badge) requires Popover+Command (already available; same pattern as country combobox in Phase 9).

2. **3-query + JS grouping for dashboard data** — Drizzle libsql joins are verbose and require manual type construction. 3 flat queries + a `Map<registrantId, entries[]>` grouping loop is cleaner and fast for the expected scale (D-09: <=200 registrants).

3. **`unknown` cast for dynamic db.batch() array** — Drizzle's `db.batch()` signature requires a readonly tuple `[BatchItem, ...BatchItem[]]`. A dynamically-built `BatchItem[]` cannot satisfy this type without a cast. Used `as unknown as Parameters<typeof db.batch>[0]` which is safe since the array is guaranteed non-empty (checked above with `rows.length === 0` guard).

## Deviations from Plan

None — plan executed exactly as written. The db.batch() TypeScript cast (Rule 1 — type fix) was an implementation detail resolved during Task 1 verification, not a behavioral deviation.

## Known Stubs

The following stub components are intentional — Wave 2 plans (10-02, 10-03) will replace them:

| Stub | File | Plan |
|------|------|------|
| RegistrationsTable | `app/organizerdb/_components/RegistrationsTable.tsx` | 10-02 |
| RemoveRegistrantDialog | `app/organizerdb/_components/RemoveRegistrantDialog.tsx` | 10-02 |
| CSVImportModal | `app/organizerdb/_components/CSVImportModal.tsx` | 10-03 |
| QRCodeModal | `app/organizerdb/_components/QRCodeModal.tsx` | 10-03 |
| GenerateQueueModal | `app/organizerdb/_components/GenerateQueueModal.tsx` | 10-03 |

These stubs do not prevent the plan's goal (dashboard structure + data layer) from being achieved. Each renders `null` or a placeholder and the dashboard builds and loads correctly.

## Self-Check: PASSED

All 14 created/modified files exist on disk. Both task commits verified in git log.

| Check | Result |
|-------|--------|
| lib/actions/dashboard.ts | FOUND |
| app/organizerdb/page.tsx | FOUND |
| DashboardClient.tsx | FOUND |
| CompetitionSelector.tsx | FOUND |
| AnalyticsBar.tsx | FOUND |
| RegistrationsTable.tsx (stub) | FOUND |
| RemoveRegistrantDialog.tsx (stub) | FOUND |
| CSVImportModal.tsx (stub) | FOUND |
| QRCodeModal.tsx (stub) | FOUND |
| GenerateQueueModal.tsx (stub) | FOUND |
| select.tsx | FOUND |
| table.tsx | FOUND |
| tooltip.tsx | FOUND |
| separator.tsx | FOUND |
| Commit 7bffa1d (Task 1) | FOUND |
| Commit c36b5a8 (Task 2) | FOUND |
