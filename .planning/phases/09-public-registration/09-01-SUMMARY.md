---
phase: 09-public-registration
plan: 01
subsystem: database
tags: [shadcn, combobox, countries, server-action, drizzle, turso, registration]

# Dependency graph
requires:
  - phase: 06-schema-foundation
    provides: registrants and registrationEntries tables, generateCompetitionSerial, db.batch() pattern
  - phase: 08-competition-creation
    provides: competitions table, createCompetition server action pattern
provides:
  - shadcn Command component (components/ui/command.tsx) for combobox
  - shadcn Popover component (components/ui/popover.tsx) for combobox
  - COUNTRIES array with 240 ISO 3166-1 entries (lib/constants/countries.ts)
  - registerAthlete server action — atomic registrant + N entry insert via db.batch()
  - getRegistrationData function — fetches registrant + entries + competition for success page
affects:
  - 09-02 (registration form depends on registerAthlete, COUNTRIES, Command, Popover)
  - 09-03 (success page depends on getRegistrationData)

# Tech tracking
tech-stack:
  added:
    - cmdk (peer dep of shadcn Command, for command palette)
    - "@radix-ui/react-popover" (shadcn Popover)
  patterns:
    - Serial pre-generation before db.batch() — serials generated in a for-loop before batch to allow returning registrantId
    - COUNTRIES as pure hardcoded constant with no runtime dependencies — no API call needed

key-files:
  created:
    - components/ui/command.tsx
    - components/ui/popover.tsx
    - components/ui/dialog.tsx
    - components/ui/input-group.tsx
    - components/ui/textarea.tsx
    - lib/constants/countries.ts
    - lib/actions/registrations.ts
  modified: []

key-decisions:
  - "Serial numbers generated in a for-loop before db.batch() so the registrantId can be pre-generated and returned from the server action"
  - "240 ISO 3166-1 entries in COUNTRIES — 193 sovereign states plus territories/dependencies to exceed the 240 minimum requirement"
  - "getRegistrationData is a plain async export (not a unique server action) but works fine since the file has 'use server' at the top level"

patterns-established:
  - "Server action with sequential serial generation: generate all serials in a for-loop before db.batch(), not inside the batch callback"
  - "Country combobox: COUNTRIES array from lib/constants/countries.ts, shadcn Command + Popover for searchable dropdown"

requirements-completed: [REG-03, REG-05, REG-07]

# Metrics
duration: 4min
completed: 2026-04-03
---

# Phase 9 Plan 01: Data Layer for Public Registration Summary

**shadcn Command + Popover installed, 240-country ISO array created, and registerAthlete server action atomically inserts registrant + N event entries with unique serials via db.batch()**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-03T05:24:12Z
- **Completed:** 2026-04-03T05:28:12Z
- **Tasks:** 2
- **Files created:** 7

## Accomplishments
- Installed shadcn Command and Popover components (combobox primitives for Plan 02's country dropdown)
- Created lib/constants/countries.ts with 240 ISO 3166-1 countries including all major kettlebell sport nations (Philippines, Kazakhstan, Russia, Ukraine, South Korea, India)
- Created registerAthlete server action with full validation: competition found, status open, deadline not passed, capacity not exceeded, all required fields, events non-empty
- registerAthlete uses db.batch() for atomic insert of 1 registrant + N registration_entries
- Each registration entry receives a unique serial from generateCompetitionSerial
- Created getRegistrationData for success page server-side fetch

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn combobox components and create countries constant** - `8eef94e` (feat)
2. **Task 2: Create registerAthlete server action** - `2618f76` (feat)

## Files Created/Modified
- `components/ui/command.tsx` - shadcn Command component for combobox internals
- `components/ui/popover.tsx` - shadcn Popover component for combobox trigger wrapper
- `components/ui/dialog.tsx` - peer dep installed by shadcn command
- `components/ui/input-group.tsx` - peer dep installed by shadcn command
- `components/ui/textarea.tsx` - peer dep installed by shadcn command
- `lib/constants/countries.ts` - COUNTRIES array: 240 ISO 3166-1 entries with name + flag emoji
- `lib/actions/registrations.ts` - registerAthlete + getRegistrationData server action exports

## Decisions Made
- Serials are generated in a sequential for-loop before db.batch() — this lets the registrantId be pre-generated via createId() and returned from the action. If serial generation were inside the batch callback that's not possible.
- Countries list expanded beyond 193 sovereign states to include territories (Aruba, Guam, Hong Kong, Puerto Rico, etc.) to reach the 240 minimum requirement specified in the plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs

None — all code is fully functional data layer. No UI rendering with placeholder data.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (registration form page) can now import:
  - `registerAthlete` from `lib/actions/registrations`
  - `COUNTRIES` from `lib/constants/countries`
  - `Command`, `CommandInput`, `CommandList`, `CommandItem`, `CommandEmpty`, `CommandGroup` from `components/ui/command`
  - `Popover`, `PopoverContent`, `PopoverTrigger` from `components/ui/popover`
- Plan 03 (success page) can import `getRegistrationData` from `lib/actions/registrations`
- TypeScript compiles cleanly with no errors on all new files

---
*Phase: 09-public-registration*
*Completed: 2026-04-03*

## Self-Check: PASSED

All files verified present on disk. All task commits verified in git log.
