# Kova — Project Context

## What Kova Is
Competition judging platform for kettlebell sport. PWA, not a native app.
Full brief: `/KOVA_BRIEF.md` | Design: `/DESIGN_CONTEXT.md`

## Stack
| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS |
| Auth | Clerk — roles: organizer / judge / athlete |
| Database | Turso (libSQL) + Drizzle ORM |
| Hosting | Vercel |
| PWA | next-pwa |
| Video playback | YouTube iframe API |
| Video recording | Browser MediaRecorder API + canvas compositing |
| Video filters (judge) | CSS filter property only |

## Three Roles
- **Organizer** — creates competitions, assigns judges, publishes results (desktop-first)
- **Judge** — watches video, taps reps, submits blind score (mobile-first)
- **Athlete** — submits entry with YouTube URL, views result (mobile only)

## Builder
Clarence Santos — vibe coder, does not write code independently. Uses AI-assisted tools exclusively.
Previous project: Alaga (alagacare.com) — same Turso + Drizzle + Clerk + Vercel stack. Reference it for patterns.
Work cadence: 1–2 hours/day focused sessions.

## Current Phase: Phase 5 Complete — Full Athlete Loop Working

### What's Built and Working (as of 2026-03-26)
- [x] Project initialized (Next.js, Tailwind, Clerk, Turso, Drizzle)
- [x] Base schema with all 12 columns (id, athleteName, discipline, weightKg, reps, youtubeUrl, serial, youtubeId, status, athleteId, repTaps, createdAt)
- [x] Deployed to Vercel, production stable
- [x] Auth with role metadata (organizer / judge / athlete)
- [x] Full brand-aligned UI redesign (design tokens, global nav, all screens)
- [x] Judge interface — YouTube embed, tap zone, rep counter, undo, submit
- [x] Rep taps stored with video timestamps
- [x] Judge session landscape layout (3 modes: portrait / phone landscape blocked / tablet+desktop)
- [x] Judge session portrait overhaul — 60vh video, rep count overlay on video, compact 3-button row (NO REP | UNDO | REP), submit only on pause/end, buttons gated on isPlaying (YouTube state 1)
- [x] Scores submitted page — full rep log with timestamps + rep/no-rep icons, rep count hero, Judge Again + Finalize actions
- [x] Serial number format: XXX-0000
- [x] Canvas recorder — MediaRecorder + canvas compositing, authenticated overlay (name, discipline, weight, serial, timer)
- [x] Recorder UI — countdown, beep sounds, stop confirmation, duration-aware
- [x] Playback page — review recording, export to file, upload to YouTube
- [x] YouTube upload — resumable upload via Google OAuth, progress bar
- [x] createEntry — saves submission to DB after YouTube upload
- [x] Athlete profile — lists submissions, mini video player per entry
- [x] Sign out button on profile page

### Critical Production Config
- `TURSO_AUTH_TOKEN` in Vercel has `Bearer ` prefix — `lib/db.ts` strips it with `.replace(/^Bearer\s+/i, '').trim()`
- `@libsql/client/http` is used (NOT WebSocket) — required for Vercel serverless
- Never switch back to `@libsql/client` (WebSocket)

### Next Priorities (not yet built)
- Judge can look up entry by serial number and judge it (lookupEntryBySerial exists, UI may need polish)
- Organizer dashboard — see all entries, assign judges, publish results
- Multi-judge blind scoring + consolidation
- PWA install prompt, offline support (Serwist)
- Competition structure (events, weight categories)

## Roadmap
- Phase 6: Complete judge loop — serial lookup works end-to-end, judge can score athlete submissions
- Phase 7: Organizer dashboard — manage entries, view all scores
- Phase 8: Gym validation — PWA polish, WakeLock, haptics, Android perf
- Phase 9: Competition ready — multi-judge consolidation, head judge override, results export

## Gamification System
Full design doc: `.claude/kova-gamification.md` — read this before planning or building any gamification features.

**Growth stages:**
- Stage 1 (Club MVP): 1 gym, ~20 athletes — athlete profiles, trophies, peer judging, custom formats
- Stage 2 (Multi-Club): organizer tiers visible, judge trust tiers, public club profiles
- Stage 3 (Online Clubmeet): cross-club competition, minimum judge tier requirements

**Key locked decisions (do not contradict):**
- Peer judge assignment is fully automated by the app — never manual
- Score finalisation is gated on completion of judging duties
- No numerical MMR/ELO displayed to users at any stage
- No penalty system for judges or organizers at early stage
- Official formats vs club/custom formats are always visually distinct
- Collect judge trust and organizer data silently in Stage 1 — do not surface it yet

**Schema additions needed (not yet built):**
- `Club` — id, name, coach_id, tier, created_at
- `ClubMembership` — id, club_id, athlete_id, role
- `Trophy` — id, athlete_id, competition_id, type (participation | podium_1 | podium_2 | podium_3 | first_comp | kova_official), awarded_at
- `PeerJudgeAssignment` — id, entry_id, judge_id, assigned_at, completed_at
- `OrganizerRecord` — id, organizer_id, successful_comp_count, tier
- `CompetitionFormat` — type field: official | club added to Competition or Event table

## North Star
**Would a coach trust this score over a handwritten count?**
When yes without hesitation — Kova is ready for competition.
