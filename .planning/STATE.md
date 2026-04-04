---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Core Platform
status: Milestone complete
last_updated: "2026-04-03T13:19:15.909Z"
last_activity: 2026-04-03
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 14
  completed_plans: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Authenticated video — canvas overlays (timer, name, discipline, serial) baked into every frame make async kettlebell competition results trustworthy without a referee present
**Current focus:** Phase 10 — organizer-dashboard-timetable

## Current Position

Phase: 10
Plan: Not started

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 02-athlete-video-recorder P01 | 2 | 5 tasks | 5 files |
| Phase 02-athlete-video-recorder P03 | 221 | 3 tasks | 2 files |
| Phase 02-athlete-video-recorder P02 | 4 | 4 tasks | 1 files |
| Phase 05-complete-athlete-loop P01 | 3 | 2 tasks | 6 files |
| Phase 05-complete-athlete-loop P02 | 2 | 2 tasks | 4 files |
| Phase 05-complete-athlete-loop P03 | 2 | 2 tasks | 2 files |
| Phase 05-complete-athlete-loop P04 | 4 | 2 tasks | 6 files |
| Phase 06-schema-foundation P01 | 3 | 2 tasks | 7 files |
| Phase 06-schema-foundation P02 | 10 | 1 tasks | 5 files |
| Phase 06 P03 | 2 | 2 tasks | 2 files |
| Phase 07 P01 | 71 | 1 tasks | 3 files |
| Phase 07 P02 | 2 | 2 tasks | 2 files |
| Phase 08-competition-creation P01 | 2 | 2 tasks | 6 files |
| Phase 09 P01 | 4 | 2 tasks | 7 files |
| Phase 09-public-registration P03 | 2 | 1 tasks | 1 files |
| Phase 09-public-registration P02 | 2 | 2 tasks | 3 files |
| Phase 10-organizer-dashboard-timetable P04 | 8 | 2 tasks | 6 files |
| Phase 10-organizer-dashboard-timetable P01 | 10 | 2 tasks | 14 files |
| Phase 10-organizer-dashboard-timetable P02 | 15 | 2 tasks | 2 files |
| Phase 10-organizer-dashboard-timetable P03 | 12 | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: next-pwa removed in Phase 1 (incompatible with Next.js 16; breaks service worker)
- [Init]: webm-fix-duration added in Phase 2 (MediaRecorder produces unseekable WebM without post-processing)
- [Init]: Competition management deferred to v2; v1 judge flow is paste-URL + tap-count, no entry queue
- [Init]: v1 leaderboard is all scores by discipline — no competition grouping, no role gates
- [Phase 02-01]: RecordProvider accepts athleteName as prop from server layout — avoids redundant Clerk calls in client components
- [Phase 02-01]: iOS gate uses canvas.captureStream feature detection rather than user-agent sniffing — future-proof
- [Phase 02-01]: Discipline stored as both id (slug) and label (display) in RecordContext — slug for filename, label for overlay
- [Phase 02-03]: Navigation guard in instructions screen uses recordedBlob (not serial) — serial is always a UUID string, never falsy
- [Phase 02-03]: Export filename extension determined dynamically from mimeType — .mp4 on iOS Safari, .webm on Chrome/Firefox
- [Phase 02-02]: Canvas element always-mounted via CSS toggle (not conditional rendering) so captureStream() references the same DOM node throughout recording state transitions
- [Phase 02-02]: MediaRecorder.start() called at countdown=3 to begin recording before countdown ends, eliminating dead footage
- [Phase 05-01]: reps column stays NOT NULL — pending entries use reps: 0 to avoid ALTER TABLE constraint complexity
- [Phase 05-01]: submitScore uses UPDATE-first pattern: updates existing entry by serial, inserts only as backward-compat fallback
- [Phase 05-01]: repTaps stored as JSON string in TEXT column — avoids separate junction table for v1
- [Phase 05-02]: XHR used for blob upload (not fetch) to enable xhr.upload.onprogress for real progress tracking
- [Phase 05-02]: google_not_connected state shows connect link plus skip option — not a hard error
- [Phase 05-02]: discipline converted from hyphenated (long-cycle) to underscored (long_cycle) at playback page level before createEntry
- [Phase 05-03]: Task 2 (repTaps session submission) was already completed by Plan 01 deviation fix — no duplicate work needed
- [Phase 05-03]: entryId added to JudgeSession for DB linkage; serial-only judge form replaces manual 5-field form
- [Phase 05-04]: GhostReplay uses rAF polling against YT getCurrentTime with seek backward detection (0.5s tolerance) — simpler than event callbacks, naturally handles seek
- [Phase 05-04]: Entry detail page is server component — repTaps JSON parsed server-side, passed as typed Rep[] to GhostReplay client component
- [v2.0 Roadmap]: db.transaction() is banned over Turso HTTP — all multi-table writes use db.batch() exclusively
- [v2.0 Roadmap]: weight_class is never stored in DB — derived at render time only from getWeightClass(gender, bodyWeightKg)
- [v2.0 Roadmap]: Drizzle migration journal must be fixed (Phase 6 first task) before any schema changes — journal is out of sync with 3 existing SQL files
- [v2.0 Roadmap]: Scheduler is a pure function (lib/queue/scheduler.ts) with zero DB imports — built and tested in Phase 7 before any UI
- [v2.0 Roadmap]: Organizer routes at app/organizerdb/ and public registration at app/registration/[compId]/ — outside app/(app)/ to avoid mobile-first auth-guarded layout
- [v2.0 Roadmap]: No auth gate on organizer routes for v2.0 — code structured for Clerk retrofit without rewrite (deferred to future milestone)
- [Phase 06-01]: Migration journal fixed by manually adding idx=1 and idx=2 entries for 0001_phase5_columns and 0002_profiles
- [Phase 06-01]: cuid2 PKs via $defaultFn(() => createId()) on all new tables; serial UNIQUE constraint prevents race-condition collisions
- [Phase 06-01]: db.batch() convention documented in schema.ts; db.transaction() banned over Turso HTTP
- [Phase 06-02]: Followed D-04 over QUEUE_SPEC example: Hunger Bells -> HUN not HUB (first 3 of first word when < 3 words)
- [Phase 06-02]: vi.mock pattern for unit-testing pure functions co-located with DB-dependent code
- [Phase 06-02]: vitest.config.ts required for @/ path alias resolution (vitest does not read tsconfig.json paths)
- [Phase 06]: Used mockWhere.mockImplementation() with call counter for collision test — simulates 4 sequential DB calls without live DB
- [Phase 06]: vi.fn().mockReturnValue() is the correct pattern for vitest default mock values; _returnValue property approach breaks when mockImplementation is also used
- [Phase 07-01]: SchedulerEntry is the flattened join type — caller constructs from DB query, scheduler receives clean typed array
- [Phase 07-01]: Super heavyweight label derived from last bracket limit at runtime ('80+kg', '95+kg') — not hardcoded strings
- [Phase 07]: weightClassSortKey numeric trick: parseFloat + 0.5 for '+' brackets ensures super-heavyweight sorts after bounded counterpart — plain localeCompare breaks this
- [Phase 07]: REST conflict uses strict gap < minRestBlocks (D-09), not <=; gap == minRestBlocks is acceptable rest, not a conflict
- [Phase 07]: COACH conflict: student is entry with coach field set, coach is entry whose full name matches (case-insensitive trimmed, D-01)
- [Phase 08-competition-creation]: deriveSerialPrefix called server-side in createCompetition — server is source of truth for prefix derivation (COMP-02, D-07)
- [Phase 08-competition-creation]: Organizer layout has no auth gate — structured for Clerk retrofit (v2.0 roadmap, deferred to future milestone)
- [Phase 08]: Competition creation form uses native input with inputClass string (JudgeSetupForm pattern) rather than shadcn Input component — className override for bg-charcoal/border-raw-steel tokens is cleaner with native input
- [Phase 08]: CopyLinkButton isolated in app/organizerdb/_components/ to keep list page as a pure server component — clipboard requires client JS
- [Phase 09-01]: Serial numbers generated in a for-loop before db.batch() so registrantId can be pre-generated and returned from the server action
- [Phase 09-01]: COUNTRIES array has 240 ISO 3166-1 entries — 193 sovereign states plus territories to exceed the 240 minimum requirement
- [Phase 09-03]: Success page is a pure server component — no 'use client' required since there is zero interactivity
- [Phase 09-03]: notFound() called for both missing registrantId and null return from getRegistrationData — correct 404 in both cases
- [Phase 09-02]: Guard state logic extracted into getGuardState() helper — status!=open, deadline<now, or count>=maxRegistrants each map to a labeled guard object
- [Phase 09-02]: Bell weight filtering done server-side by splitting allowedBellWeights JSON on 2x/1x prefix, passed as doubleBells/singleBells props to client component
- [Phase 10-04]: lib/actions/dashboard.ts created as deviation (Rule 3) — plan referenced getCompetitionDashboard but file did not exist
- [Phase 10-04]: Conflict lookup built as Map<entryId, Conflict[]> in TimetableGrid — O(1) cell lookup vs O(n*m) per-cell search
- [Phase 10-04]: Event tint majority rule: majority[1] <= events.length/2 means tied/split blocks get neutral tint (D-16)
- [Phase 10-01]: Used Popover+Command over shadcn Select for CompetitionSelector — SelectItem renders children as text only, Popover+Command allows custom name/date/badge per item
- [Phase 10-01]: 3-query + JS grouping for getCompetitionDashboard — cleaner than verbose Drizzle join; sufficient for <=200 registrants per D-09
- [Phase 10-01]: db.batch() cast via unknown for dynamically-built insert array in bulkImportRegistrants — Drizzle requires tuple type; safe with non-empty guard above
- [Phase 10]: SortableHeader as inner function captures sort state closure without prop drilling
- [Phase 10]: RemoveRegistrantDialog uses controlled open=true, delegates cancel/close via onRemoved callback to RegistrationsTable
- [Phase 10-03]: qrcode npm package used for QR generation (offline-capable, no external API dependency)
- [Phase 10-03]: Self-contained modal pattern: each modal manages its own open state and renders its own trigger — DashboardClient passes props only
- [Phase 10-03]: Disabled button tooltip requires span wrapper — Radix Tooltip on disabled Button has no pointer events; span restores them

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: canvas.captureStream() unsupported on iOS through iOS 26.4 — real-device test needed to confirm iOS 18.4+ status before finalizing "unsupported browser" UX path
- [Phase 2]: Blob download via URL.createObjectURL on iOS Safari for WebM/MP4 — needs real-device validation
- [Phase 3]: YouTube IFrame API iOS autoplay constraints (mute=1&playsinline=1 required) — verify before implementation
- [Phase 6 pre-work]: Drizzle migration journal out of sync — must fix journal before running drizzle-kit generate. Fix: add journal entries for 0001 and 0002 manually before generating 0003.
- [Phase 9]: Serial race condition under concurrent load — UNIQUE constraint + retry loop is the prevention; validate with load test (ab -c 20 -n 100) before sharing public registration link

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260326-u3g | Fix AudioContext user gesture chain broken by async/await | 2026-03-26 | 836c6e7 | [260326-u3g-fix-audiocontext-user-gesture-chain-brok](./quick/260326-u3g-fix-audiocontext-user-gesture-chain-brok/) |
| 260326-umx | Fix beep resume-then-play, add discard, clean up playback buttons | 2026-03-26 | 3ccb73b | [260326-umx-fix-beep-resume-then-play-add-discard-bu](./quick/260326-umx-fix-beep-resume-then-play-add-discard-bu/) |
| 260326-v24 | Remove audio track from recorded stream (Chrome WebM fix) | 2026-03-26 | 2736f6a | [260326-v24-remove-audio-track-from-recorded-stream-](./quick/260326-v24-remove-audio-track-from-recorded-stream-/) |
| 260327-10k | IndexedDB backup for recordings to prevent data loss | 2026-03-27 | 7a0c0cd | [260327-10k-indexeddb-backup-for-recordings-to-preve](./quick/260327-10k-indexeddb-backup-for-recordings-to-preve/) |
| 260327-19q | Remove webmFixDuration from onstop, IndexedDB-first save order | 2026-03-27 | 84b93c5 | [260327-19q-remove-webmfixduration-from-recorder-ons](./quick/260327-19q-remove-webmfixduration-from-recorder-ons/) |
| 260327-21e | Incremental IndexedDB chunk writes + block iOS recording | 2026-03-27 | cbf188b | [260327-21e-incremental-indexeddb-chunk-writes-durin](./quick/260327-21e-incremental-indexeddb-chunk-writes-durin/) |
| 260327-24f | Remove iOS recording block — allow iOS users to record | 2026-03-27 | 35a7738 | [260327-24f-remove-ios-recording-block-from-app-reco](./quick/260327-24f-remove-ios-recording-block-from-app-reco/) |
| 260327-2o4 | Fix 308 resume, save-on-failure, manual URL submission | 2026-03-27 | fadb13a | [260327-2o4-fix-308-resume-save-on-failure-manual-ur](./quick/260327-2o4-fix-308-resume-save-on-failure-manual-ur/) |
| 260327-q38 | Fix save-video-file button triggering back navigation on iOS | 2026-03-27 | 0fdd907 | [260327-q38-fix-save-video-file-button-triggering-ba](./quick/260327-q38-fix-save-video-file-button-triggering-ba/) |
| 260327-s4j | Show full serial in CompactEntryRow instead of truncated | 2026-03-27 | 5821311 | [260327-s4j-show-full-serial-in-compactentryrow-inst](./quick/260327-s4j-show-full-serial-in-compactentryrow-inst/) |
| 260327-snv | Redesign entry detail page — portrait mobile layout with rep pills, flash verdict, CSV export | 2026-03-27 | 2ee6f5e | [260327-snv-redesign-entry-detail-page-portrait-mobi](./quick/260327-snv-redesign-entry-detail-page-portrait-mobi/) |
| 260327-sxi | Entry detail: 80% video width, top-align rep column, time-sync rep highlighting | 2026-03-27 | — | [260327-sxi-entry-detail-80-video-width-top-align-re](./quick/260327-sxi-entry-detail-80-video-width-top-align-re/) |
| 260327-tdw | Entry detail: top-align columns, bronze pill styling, remove centering | 2026-03-27 | — | [260327-tdw-entry-detail-top-align-columns-bronze-pi](./quick/260327-tdw-entry-detail-top-align-columns-bronze-pi/) |
| 260404-lg4 | Fix UAT bugs: QR code blank, missing status toggle, hidden serial prefix | 2026-04-04 | 6745402 | [260404-lg4-fix-uat-bugs-qr-code-blank-no-status-tog](./quick/260404-lg4-fix-uat-bugs-qr-code-blank-no-status-tog/) |

## Session Continuity

Last activity: 2026-04-04 - Completed quick task 260404-lg4: Fix UAT bugs: QR code blank, no status toggle, serial prefix hidden
Resume file: None
