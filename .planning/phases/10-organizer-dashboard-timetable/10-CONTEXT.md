# Phase 10: Organizer Dashboard & Timetable - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizers can review registrations with analytics and filtering, import registrations via CSV, remove registrants, and generate a print-ready timetable with conflict warnings — completing the full competition management workflow. The current card-list page at `/organizerdb` is evolved into a full dashboard with competition dropdown selector, analytics bar, registrations table, CSV import modal, and Generate Queue flow. The timetable page at `/organizerdb/queue` displays the scheduler output with event-tinted rows (screen) and clean B&W (print).

Deliverables:
1. Dashboard page at `/organizerdb` — evolved from card list to dropdown-first dashboard
2. Analytics bar with stat cards (total, per-event, gender split, spots remaining, deadline)
3. Registrations table with client-side sort/filter and remove action
4. CSV import modal with preview, validation, and partial import
5. QR code generation for registration link (modal with download)
6. Generate Queue modal with start time input
7. Timetable page at `/organizerdb/queue` with grid, conflict panel, event tints
8. Print-friendly timetable (landscape, B&W, conflicts included)

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout & Structure
- **D-01:** Dropdown-first layout. Competition selector dropdown at top with "New Competition" button beside it. Selecting a competition loads analytics bar + registrations table + action buttons below. One competition in focus at a time.
- **D-02:** When competitions exist but none selected: dropdown shows "Select a competition" placeholder, below it a gentle message "Select a competition above to view registrations and manage your event." When no competitions exist: empty state with "Create your first competition" message and Create button.
- **D-03:** Competition selection persists via URL query param: `/organizerdb?compId=xxx`. Bookmarkable, shareable, browser back works. If `compId` is in URL on load, auto-select that competition.
- **D-04:** Competition dropdown items show: competition name (bold), date (formatted), and colored status badge (Open=green, Draft=gray, Closed=red). Most recent competitions first.

### Registration Link Sharing
- **D-05:** "Copy Registration Link" button and "QR Code" button placed side-by-side near the competition dropdown area. QR Code button opens a modal/popover with the generated QR code and a "Download QR as PNG" button for export/sharing.
- **D-06:** QR code encodes the full registration URL: `origin + '/registration/' + compId`.

### Analytics Bar
- **D-07:** Stat cards in a horizontal row. Each card is a compact box with a number and label. Cards: Total registrations, Per-event counts (LC/Jerk/Snatch), Gender split (M/F), Spots remaining (if max_registrants set), Deadline countdown (if deadline set). Cards wrap on narrower screens.

### Inline Guidance for Non-Techy Organizers
- **D-08:** Inline contextual hints (subtle gray helper text) that guide first-time organizers: "Share this link with your athletes" near Copy Link, "No registrations yet — share the registration link or import a CSV to get started" when empty, "Need at least 1 registrant to generate queue" on disabled Generate Queue button. Always-present context, not modal or dismissible.

### Registrations Table
- **D-09:** Client-side data loading. All registrants for selected competition fetched in one server action call. Sort/filter handled entirely in JavaScript. Fast interactions, no server round-trips. Sufficient for expected scale (10-200 registrants).
- **D-10:** Table columns per QUEUE_SPEC: #, Full Name, Gender, Bodyweight (kg), Country, Events (pill badges), Club, Coach, Registered At, Actions. Sortable by name, bodyweight, registered at. Filterable by event and gender.

### Remove Action
- **D-11:** Confirmation dialog before removal. Shows: "Remove [Name]? This will delete their registration and all serial numbers ([serials]). This cannot be undone." with Cancel/Remove buttons. Deletion uses `db.batch()` to delete registrant + all their entries atomically.

### CSV Import
- **D-12:** "Import CSV" button in action bar opens a modal. Modal has file picker (with drag-and-drop), preview table showing ALL rows with valid rows in green and invalid rows in red with specific error messages, summary count ("13 valid, 2 errors"), and "Import N valid rows" / Cancel buttons. Organizer can proceed with partial import or fix CSV and re-upload.
- **D-13:** CSV parsing happens entirely client-side (FileReader + manual parse or lightweight CSV library). Validated rows submitted to server action for bulk creation.

### Generate Queue Flow
- **D-14:** "Generate Queue" button (disabled when 0 registrants) opens a modal. Modal shows: start time input (HH:MM, default 09:00), summary (registrant count, platform count), estimated finish time. Confirm redirects to `/organizerdb/queue?compId=xxx&startTime=540` (minutes since midnight).

### Timetable Grid
- **D-15:** Stacked cell layout. Each platform cell uses 2-3 lines: Line 1: "SANTOS, Maria" (bold). Line 2: "LC · 2x20 · 66kg". Line 3: "Team Kova" (club, muted if present). Conflict pill floats top-right of cell.
- **D-16:** Subtle event-tinted row backgrounds on screen: LC=blue-tinted, Jerk=amber-tinted, Snatch=green-tinted (10-15% opacity). When a block has mixed events, tint by majority or neutral.

### Conflict Panel
- **D-17:** Collapsible conflict panel sits between timetable header and grid. Expanded by default. Shows count and each conflict as a line. REST conflicts in red text, COACH conflicts in amber text. Athletes in the grid also get a small conflict pill in their cell.

### Print Layout
- **D-18:** Landscape orientation via `@page { size: landscape; }`. Black and white for print friendliness — no event tints, white background, clean table lines. Event code (LC/JK/SN) in each cell is sufficient to distinguish events.
- **D-19:** Conflict panel prints above the timetable in bold text (no colors). Navigation, buttons, and interactive elements hidden via `@media print`.
- **D-20:** Timetable header prints: competition name, date, generated timestamp. Fits A4/Letter landscape width.

### From Prior Phases (carried forward)
- `db.batch()` for all multi-table writes (Phase 6 D-08)
- Scheduler is a pure function — receives typed array, returns timeBlocks + conflicts (Phase 7)
- Rich conflict objects with all display data (Phase 7 D-05, D-06)
- No auth gate on organizer routes (QUEUE_SPEC R1, Phase 8)
- Desktop-first layout (QUEUE_SPEC R2)
- Organizer routes at `app/organizerdb/` outside `app/(app)/` (Phase 8)
- Weight class derived at render time via `getWeightClass()` (Phase 7)
- Caller filters entries to `status = 'registered'` before passing to scheduler (Phase 7 D-04)

### Claude's Discretion
- Component architecture (how to split the dashboard into components)
- Whether to use a lightweight CSV parsing library (e.g., papaparse) or manual string splitting
- QR code generation approach (canvas-based or library like `qrcode`)
- Dropdown implementation (shadcn Select, Popover+Command, or native select)
- Table component internals (whether to use a table library or hand-built)
- How to calculate estimated finish time in the Generate Queue modal (call scheduler or quick math)
- Server action shape for fetching registrants with entries (single query with join or two queries)
- How to handle the "Back to Dashboard" link from the timetable page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard & Timetable Spec
- `QUEUE_SPEC.md` §/organizerdb — Full dashboard spec: competition selector, analytics bar, registrations table, CSV import, generate queue
- `QUEUE_SPEC.md` §/organizerdb/queue — Timetable page spec: header, conflict panel, grid layout, cell content, event tinting
- `QUEUE_SPEC.md` §CSV Import Format — Column definitions, multi-event encoding, optional fields
- `QUEUE_SPEC.md` §Scheduling Algorithm — Input/output types (already implemented — reference for timetable rendering)

### Requirements
- `.planning/REQUIREMENTS.md` §v2.0 — DASH-01 through DASH-06, SCHED-07 through SCHED-09 requirements for this phase

### Scheduler & Types (already implemented)
- `lib/queue/scheduler.ts` — `schedule()` pure function. Call with `SchedulerInput`, get `ScheduleResult`.
- `lib/queue/types.ts` — `SchedulerEntry`, `SchedulerInput`, `TimeBlock`, `PlatformSlot`, `Conflict`, `RestConflict`, `CoachConflict`, `ScheduleResult` type definitions
- `lib/queue/weightClass.ts` — `getWeightClass(gender, bodyWeightKg)` for display

### Schema & Data Layer
- `lib/schema.ts` — `competitions`, `registrants`, `registrationEntries` table definitions with types
- `lib/actions/competitions.ts` — `createCompetition` server action (existing)
- `lib/actions/registrations.ts` — `registerAthlete`, `getRegistrationData` server actions (existing patterns to follow)
- `lib/db.ts` — Database client singleton

### Existing UI to Evolve
- `app/organizerdb/page.tsx` — Current card-list page (to be replaced with dashboard)
- `app/organizerdb/layout.tsx` — Existing layout (minimal, no auth)
- `app/organizerdb/_components/CopyLinkButton.tsx` — Client component for clipboard (reusable)
- `app/organizerdb/create/page.tsx` — Competition creation form (stays as-is)

### Prior Phase Context
- `.planning/phases/06-schema-foundation/06-CONTEXT.md` — Schema decisions (db.batch(), timestamps, text dates)
- `.planning/phases/07-scheduling-pure-logic/07-CONTEXT.md` — Scheduler decisions (sort order, conflict objects, REST strict less-than)
- `.planning/phases/08-competition-creation/08-CONTEXT.md` — Competition creation decisions (form layout, serial prefix)
- `.planning/phases/09-public-registration/09-CONTEXT.md` — Registration decisions (form flow, guard states, atomic creation)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/queue/scheduler.ts` — Complete scheduler with `schedule()` function. Returns `ScheduleResult` with `timeBlocks`, `conflicts`, `estimatedFinishTime`. Ready to consume.
- `lib/queue/types.ts` — All type definitions for scheduler input/output. `PlatformSlot` has all fields needed for timetable cell rendering.
- `lib/queue/weightClass.ts` — `getWeightClass(gender, bodyWeightKg)` for weight class display in timetable cells.
- `app/organizerdb/_components/CopyLinkButton.tsx` — Client component for clipboard copy. Can be reused/adapted for the new dashboard.
- `lib/actions/registrations.ts` — `registerAthlete` and `getRegistrationData` patterns for server action structure.
- `lib/actions/competitions.ts` — `createCompetition` with validation pattern. Follow same error handling for new actions.

### Established Patterns
- Server actions: `"use server"`, try/catch, return `{ data }` or `{ error: string }`
- Form components: `'use client'`, useState per field, native inputs with Kova design tokens (charcoal bg, raw-steel border, patina-bronze focus)
- `db.batch()` for multi-table writes; single `db.select()` for reads
- cuid2 PKs auto-generated; `integer("created_at", { mode: "timestamp" })` for timestamps
- shadcn/ui components: Card, Badge, RadioGroup, Checkbox, Popover, Command available

### Integration Points
- Evolve `app/organizerdb/page.tsx` from card list to dashboard (major rewrite)
- New route: `app/organizerdb/queue/page.tsx` — timetable page (server component calling scheduler)
- New server actions needed in `lib/actions/`: fetch registrants with entries, delete registrant + entries, bulk import registrants
- New client components: CompetitionSelector, AnalyticsBar, RegistrationsTable, CSVImportModal, GenerateQueueModal, QRCodeModal, TimetableGrid, ConflictPanel

</code_context>

<specifics>
## Specific Ideas

- Dashboard must feel intuitive for non-techy organizers — inline hints guide first-timers, blend in for repeat users
- QR code for registration link is important — organizers share via print/WhatsApp, not just digital links
- Timetable cell shows: LAST, First (bold) / Event · bellWeight · weightClass / Club (muted)
- Screen has event-tinted rows; print is clean B&W with event code labels as the only differentiator
- Conflicts print too — organizers need them at the venue, printed above the timetable grid
- Empty platform slots in a block should render as empty cells (no "—" filler needed, just blank)
- Generate Queue modal shows estimated finish time as a nice UX touch before committing
- CSV format from QUEUE_SPEC: Events comma-separated in one cell, Bell Weights matching event order, Duration is single value for all events in that row

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-organizer-dashboard-timetable*
*Context gathered: 2026-04-03*
