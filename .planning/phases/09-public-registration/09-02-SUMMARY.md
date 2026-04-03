---
phase: 09-public-registration
plan: 02
subsystem: ui
tags: [nextjs, server-component, client-component, shadcn, combobox, form, registration, guard-states]

# Dependency graph
requires:
  - phase: 09-01
    provides: registerAthlete server action, COUNTRIES array, shadcn Command + Popover components
  - phase: 06-schema-foundation
    provides: competitions, registrants tables with Drizzle types
  - phase: 08-competition-creation
    provides: organizer layout pattern, inputClass/labelClass styling constants
provides:
  - Public registration page at app/registration/[compId]/page.tsx (server component with guard states)
  - RegistrationForm client component at app/registration/[compId]/_components/RegistrationForm.tsx
  - Registration route layout at app/registration/[compId]/layout.tsx (no auth)
affects:
  - 09-03 (success page uses same route prefix /registration/[compId]/success)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component page + client component form: page.tsx is server-only, fetches DB data and guard state, imports RegistrationForm client component from _components/
    - CSS max-height transition for inline event expand/collapse (max-h-0 to max-h-96) with overflow-hidden and duration-200
    - Popover + Command combobox: PopoverTrigger wraps native-styled button, PopoverContent contains Command with CommandInput for live search and CommandItem with data-checked for selected state

key-files:
  created:
    - app/registration/[compId]/layout.tsx
    - app/registration/[compId]/page.tsx
    - app/registration/[compId]/_components/RegistrationForm.tsx
  modified: []

key-decisions:
  - "Guard state logic extracted into getGuardState() helper to keep the server component clean — status!=open, deadline<now, or count>=maxRegistrants each map to a labeled guard object"
  - "Bell weight filtering: doubleBells/singleBells derived server-side by splitting allowedBellWeights JSON and filtering on '2x' vs '1x' prefix — passed as props to avoid JSON parsing in client component"
  - "CommandItem data-checked pattern used for combobox selected state: country === c.name renders Check icon manually rather than relying on command's built-in checked state, for explicit control"
  - "labelClass uses font-semibold per UI-SPEC (not font-medium from create/page.tsx) — corrected at time of implementation"

patterns-established:
  - "Registration route layout: minimal server component, no auth, matches organizer layout pattern exactly"
  - "Guard states: server-rendered card with Badge + message, no form rendered, same max-width layout as form"

requirements-completed: [REG-01, REG-02, REG-03, REG-04, REG-06, REG-08]

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 9 Plan 02: Registration Form Page Summary

**Public registration page at /registration/[compId] with server-side guard states (404/closed/full), country combobox, inline event expand/collapse with bell weight and duration selectors, wired to registerAthlete server action**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-03T05:31:02Z
- **Completed:** 2026-04-03T05:33:00Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- Created registration route layout (no auth, matches organizer layout pattern)
- Built server component page that fetches competition, handles all guard states (404 via notFound(), closed/deadline/full via branded card)
- Built RegistrationForm client component with all fields in QUEUE_SPEC order: Last Name, First Name (with "single name" helper), Gender (Male/Female radio), Body Weight, Country (Popover+Command searchable combobox with flag display), Events (checkbox with inline bell weight select + duration), Club, Coach (with "coach will be present" helper)
- Event expand/collapse uses CSS max-height transition (200ms ease-in-out) — checking reveals bell weight select + duration config; unchecking collapses and clears state
- Bell weights filtered by event type: double bells (2x prefix) for LC and Jerk, single bells (1x prefix) for Snatch
- Duration shows RadioGroup when allowedDurations='both', static text otherwise
- Submit calls registerAthlete and redirects to /registration/[compId]/success?registrantId=xxx on success
- TypeScript compiles clean (npx tsc --noEmit passes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create registration layout and server data loader** - `d94aa6a` (feat)
2. **Task 2: Build registration form page with guard states and event selection** - `85de667` (feat)

## Files Created/Modified
- `app/registration/[compId]/layout.tsx` - Minimal server component layout, no auth, Metadata for "Kova - Registration"
- `app/registration/[compId]/page.tsx` - Server component: fetches competition, guard state logic, renders guard card or RegistrationForm
- `app/registration/[compId]/_components/RegistrationForm.tsx` - Client component with all form fields, country combobox, event checkboxes with inline expand, submit handling

## Decisions Made
- Guard state extracted into `getGuardState()` helper to keep JSX clean — returns `{ label, message }` or null
- `doubleBells` and `singleBells` derived server-side by filtering the parsed `allowedBellWeights` JSON array on prefix (`2x`/`1x`), then passed as props — avoids JSON.parse in the client component
- `labelClass` uses `font-semibold` per UI-SPEC (the existing create page uses `font-medium` which is a known style inconsistency — UI-SPEC was the authority)
- `CommandItem` data-checked pattern: set `data-checked` attribute and render `<Check>` icon manually when `country === c.name` for explicit selected state display

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs

None — all data is live from DB. Bell weights come from competition's `allowedBellWeights`. Guard states are real-time server checks. Form submits to real server action.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 03 (success page) can now visit /registration/[compId]/success?registrantId=xxx
- The server action `getRegistrationData` from lib/actions/registrations.ts is ready for the success page
- Full registration loop is functional once Plan 03 success page is built

---
*Phase: 09-public-registration*
*Completed: 2026-04-03*
