---
phase: 08-competition-creation
plan: "02"
subsystem: ui
tags: [form, server-component, shadcn, drizzle, competitions, registration]

# Dependency graph
requires:
  - phase: 08-competition-creation
    plan: "01"
    provides: createCompetition server action, shadcn form components, organizer layout

provides:
  - app/organizerdb/create/page.tsx — competition creation form with live serial prefix preview
  - app/organizerdb/page.tsx — competition list page with cards and copyable registration links
  - app/organizerdb/_components/CopyLinkButton.tsx — client component for clipboard copy interaction

affects:
  - 09-athlete-registration (registration page at /registration/[compId] linked from list)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Competition creation form as 'use client' for live serial prefix preview via useState
    - Competition list as server component fetching with Drizzle desc() ordering
    - CopyLinkButton isolated as '_components/CopyLinkButton.tsx' client component — keeps list page as server component

key-files:
  created:
    - app/organizerdb/create/page.tsx
    - app/organizerdb/page.tsx
    - app/organizerdb/_components/CopyLinkButton.tsx

key-decisions:
  - "Creation form uses native <input> with inputClass string (matching JudgeSetupForm.tsx) rather than shadcn Input — avoids className merge complexity for dark brand token overrides"
  - "CopyLinkButton in _components/ subdirectory keeps organizerdb/page.tsx a pure server component"
  - "window.location.origin used in CopyLinkButton for full URL construction per D-03 — works at runtime without NEXT_PUBLIC_ env vars"

# Metrics
duration: pending (checkpoint)
completed: pending
---

# Phase 8 Plan 02: Competition Creation UI Summary

**Competition creation form at /organizerdb/create with live serial prefix preview and bell weight checkboxes, plus competition list at /organizerdb with status-badged cards and clipboard registration links**

## Status

PENDING CHECKPOINT — Tasks 1 and 2 complete. Task 3 (human-verify) awaiting user verification.

## Performance

- **Started:** 2026-04-03T03:14:34Z
- **Completed:** pending (checkpoint at Task 3)
- **Tasks completed:** 2 of 3

## Accomplishments

### Task 1: Competition Creation Form (`app/organizerdb/create/page.tsx`)

- `'use client'` component with full useState management for all 9 form fields
- Live serial prefix preview: `deriveSerialPrefix(name)` computed on every keystroke, shown in `text-bright-bronze` below the name input, hidden when name is empty
- Bell weights section: Double Bell (LC & Jerk) and Single Bell (Snatch) subsections each with Select All / Deselect All toggle and `grid-cols-3` checkbox grid — all checked by default
- Inline validation on submit: name required, date required, platforms 1-10, at least one bell weight
- Calls `createCompetition` server action, handles `{ error: string }` union return, redirects to `/organizerdb` on `{ id: string }` success
- Visual styling matches Kova brand tokens and JudgeSetupForm.tsx patterns

### Task 2: Competition List Page (`app/organizerdb/page.tsx` + `_components/CopyLinkButton.tsx`)

- Server component — Drizzle query `db.select().from(competitions).orderBy(desc(competitions.createdAt))`
- Competition cards with CardTitle (name), CardAction (status badge), CardDescription (date + platforms), CardContent (serial prefix + registration link row)
- Status badge: Draft uses `bg-raw-steel/20 text-raw-steel`, Open uses `bg-bright-bronze/20 text-bright-bronze`
- `CopyLinkButton` client component: `navigator.clipboard.writeText(window.location.origin + '/registration/' + compId)`, 1.5s "Copied!" state with Check icon, reverts to Clipboard icon
- Empty state: "No competitions yet" heading, descriptive body, "Create Competition" CTA
- "New Competition" button linking to `/organizerdb/create`

## Task Commits

1. **Task 1: Build competition creation form** - `e5b6b2a` (feat)
2. **Task 2: Build competition list page** - `256e952` (feat)

## Deviations from Plan

### Auto-applied

**1. [Rule 2 - Pattern] Native `<input>` used instead of shadcn `<Input>` in creation form**
- **Found during:** Task 1
- **Rationale:** The plan's `<action>` explicitly states: "if shadcn Input does not accept the className overrides cleanly, use native input." The shadcn Input uses `border-input bg-transparent` CSS variable defaults — overriding with Kova's `bg-charcoal border-raw-steel/30` via className works but is cleaner and more maintainable to use the native input with the same inputClass string pattern from JudgeSetupForm.tsx. The plan pre-authorized this choice.
- **Files modified:** app/organizerdb/create/page.tsx

No other deviations — plan executed as written.

## Known Stubs

None. Both pages are fully wired:
- Creation form calls real `createCompetition` server action
- List page queries real competitions table via Drizzle
- CopyLinkButton uses real `navigator.clipboard` API

---
*Phase: 08-competition-creation*
*Plan checkpoint reached: 2026-04-03*

## Self-Check: PASSED

- FOUND: app/organizerdb/create/page.tsx
- FOUND: app/organizerdb/page.tsx
- FOUND: app/organizerdb/_components/CopyLinkButton.tsx
- FOUND commit: e5b6b2a (Task 1)
- FOUND commit: 256e952 (Task 2)
