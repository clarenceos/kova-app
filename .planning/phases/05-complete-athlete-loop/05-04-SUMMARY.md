---
phase: 05-complete-athlete-loop
plan: 04
subsystem: ui
tags: [react, nextjs, youtube, animation, canvas, rAF, profile]

# Dependency graph
requires:
  - phase: 05-01
    provides: getAthleteEntries and getEntryById server actions, extended scores schema with status/repTaps/youtubeId
  - phase: 05-03
    provides: YouTubeEmbed and RepCounter components, Rep type, judge session with repTaps submission
provides:
  - PROFILE tab in BottomNav unlocked with href /profile
  - Profile page listing athlete's submission history with status badges
  - EntryCard component with serial, discipline, weight, date, status, rep count
  - Entry detail page at /profile/[id] with YouTube embed and ghost replay
  - GhostReplay client component animating Check/X icons at judge tap timestamps
  - ghost-fade keyframe animation in globals.css
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "rAF polling loop for synchronized ghost replay against YouTube player currentTime"
    - "Seek backward detection by comparing currentTime to last processed tap timestamp minus 0.5s tolerance"
    - "Inline style animation (ghost-fade) for one-shot indicator with key-forcing re-render"

key-files:
  created:
    - components/profile/EntryCard.tsx
    - components/profile/GhostReplay.tsx
    - app/(app)/profile/page.tsx
    - app/(app)/profile/[id]/page.tsx
  modified:
    - components/ui/BottomNav.tsx
    - app/globals.css

key-decisions:
  - "GhostReplay uses rAF polling loop against YT player getCurrentTime rather than YT event callbacks — simpler, works for seek detection"
  - "Seek backward detected when currentTime < last processed tap time minus 0.5s tolerance — resets index to correct position"
  - "ghost-fade animation uses inline style with key-forcing (key: Date.now()) to re-trigger animation on each tap"
  - "Entry detail page is a server component — data fetched server-side, passed to GhostReplay client component as props"

patterns-established:
  - "Profile pattern: server component fetches data, passes serialized JSON to client child components as props"
  - "BottomNav tabs: set href + locked:false to unlock; locked:true tabs render as non-interactive div"

requirements-completed: [LOOP-04, LOOP-05]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 05 Plan 04: Athlete Profile and Ghost Replay Summary

**Profile page with submission history cards, entry detail with YouTube embed, and rAF-driven ghost replay overlaying Check/X icons at judge tap timestamps**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T04:44:08Z
- **Completed:** 2026-03-26T04:48:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Unlocked PROFILE tab in BottomNav (was `href: null, locked: true`; now `href: '/profile', locked: false`)
- Built profile page as Next.js server component listing all athlete submissions with EntryCard components and empty state
- EntryCard shows serial in large mono font, discipline/weight, date, JUDGED/PENDING status badge, and rep count for judged entries
- Built entry detail page with back navigation, YouTube embed via GhostReplay, and rep log with timestamps and Check/X icons
- GhostReplay implements rAF polling loop synchronized to YT player currentTime with seek backward detection that resets index correctly
- Added ghost-fade keyframe to globals.css for the 600ms scale + fade indicator animation

## Task Commits

Each task was committed atomically:

1. **Task 1: Unlock BottomNav profile tab, profile page, EntryCard** - `1210940` (feat)
2. **Task 2: Entry detail page with GhostReplay** - `11130e6` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `components/ui/BottomNav.tsx` - Changed profile tab from `href: null, locked: true` to `href: '/profile', locked: false`
- `components/profile/EntryCard.tsx` - Card component: serial (mono), discipline/weight, date, status badge, rep count
- `app/(app)/profile/page.tsx` - Server component: getAthleteEntries → EntryCard list or empty state
- `components/profile/GhostReplay.tsx` - Client component: wraps YouTubeEmbed with rAF polling and overlay animation
- `app/(app)/profile/[id]/page.tsx` - Server component: getEntryById → header + GhostReplay + rep log or pending state
- `app/globals.css` - Added `@keyframes ghost-fade` for indicator animation

## Decisions Made

- GhostReplay uses requestAnimationFrame polling against `player.getCurrentTime()` rather than YT event callbacks. This is simpler and naturally handles seek — no need to subscribe to state change events.
- Seek backward detection uses a 0.5-second tolerance (`currentTime < lastTapTime - 0.5`) to avoid false positives from normal playback jitter.
- The overlay indicator div uses `key={activeIndicator.key}` with `Date.now()` to force React to remount the element and restart the CSS animation each time a new tap fires.
- Entry detail page is a pure server component; only GhostReplay is `'use client'` — data is serialized (repTaps JSON parsed server-side, passed as typed `Rep[]` array).

## Deviations from Plan

### Worktree Merge Required (not a code deviation)

The parallel agent worktree was at commit `87361cf` (pre-phase-05). The phase 05 commits (`92f0f84` through `47ee8e2`) existed only in the main branch. Applied `git merge main` before starting implementation to get `lib/actions/entries.ts`, updated `lib/schema.ts`, and other phase 05 foundations.

This is a worktree initialization issue, not a plan deviation — the files existed as planned.

---

**Total code deviations:** None — plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — all data is fetched from Turso DB via server actions. No hardcoded empty values flow to UI rendering.

## Next Phase Readiness

- The complete athlete loop is now functional: Record → Upload → Submit → Profile → Entry Detail with ghost replay
- Phase 05 plans are all complete
- Athletes can track their submissions from pending to judged state and see exactly how the judge scored their set

---
*Phase: 05-complete-athlete-loop*
*Completed: 2026-03-26*
