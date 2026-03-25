# Phase 5: Complete Athlete Loop - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Source:** PRD Express Path (user specification)

<domain>
## Phase Boundary

This phase closes the full athlete-to-judge loop. After recording, athletes upload directly to YouTube from the app, their submissions appear in a profile page, judges look up entries by serial number (no URL needed), and athletes can watch ghost replays of their judging sessions. Zero manual friction between recording and receiving a score.

Four deliverables:
1. YouTube Data API v3 auto-upload from the app
2. Athlete profile page (/profile) with submission history
3. Entry detail screen with ghost replay of judge scoring
4. Judge setup form updated to serial-only lookup

</domain>

<decisions>
## Implementation Decisions

### YouTube Upload — Auth & OAuth
- Clerk Google OAuth provider must be extended with `youtube.upload` scope (`https://www.googleapis.com/auth/youtube.upload`)
- Google OAuth access token pulled from Clerk after auth — NOT a separate OAuth implementation
- Clerk v7 API: `clerkClient.users.getUserOauthAccessToken(userId, 'google')` to retrieve token server-side
- If user hasn't connected Google account, show prompt to connect via Clerk's OAuth flow

### YouTube Upload — API Integration
- Resumable upload: POST to `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable`
- Video metadata set automatically from session data:
  - title: `KOVA | {disciplineLabel} | {weightKg}KG | {athleteName} | {serial}`
  - description: same content as current clipboard copy in `/record/instructions` page
  - tags: `["kova", "kettlebell", discipline, "competition"]`
  - category: `17` (Sports)
  - privacyStatus: `"unlisted"`
- WebM format — YouTube API accepts natively, no transcoding needed
- On upload complete: YouTube API returns `videoId`
- Construct URL: `https://youtube.com/watch?v={videoId}`
- Store `youtube_url` and `youtube_id` in DB

### YouTube Upload — UX
- Upload triggered by single button tap after recording completes
- Progress bar showing upload percentage (resumable upload supports progress tracking)
- Estimated time remaining display
- Error state with retry button
- On success: show entry card with serial prominently displayed
- Upload happens from client-side using token passed from server action

### DB Schema Migration
- Extend existing `scores` table (Drizzle + Turso/SQLite):
  - `youtube_id` (text, nullable) — YouTube video ID
  - `status` (text, default 'pending') — values: 'pending' | 'judged'
  - `athlete_id` (text, nullable) — Clerk user ID linking entry to athlete
  - `rep_taps` (text, nullable) — JSON-serialized array of `{time: number, type: 'rep'|'no-rep'}`
- Keep `reps` column NOT NULL (default 0 for pending entries) — SQLite ALTER TABLE cannot change NOT NULL constraints without full table recreation; 0 distinguishes "not yet judged" at the application layer
- `youtube_url` already exists as nullable column — no change needed
- Entry lifecycle: athlete creates row (status=pending, reps=null) → judge updates (status=judged, reps=count, rep_taps=JSON)

### Profile Page (/profile)
- Unlock PROFILE tab in BottomNav (currently `locked: true`, `href: null`)
- Route: `/profile` under `(app)` layout group
- Server component fetches entries for current athlete from DB (`WHERE athlete_id = userId`)
- Ordered by `created_at` descending
- Each submission card shows:
  - Serial (large, prominent — this is what the athlete shares with judges)
  - Discipline + weight
  - Date recorded
  - Status badge: PENDING (raw-steel color) | JUDGED (patina-bronze color)
  - Rep count (shown only once judged)
- Tapping a card navigates to Entry Detail view (`/profile/[id]`)

### Entry Detail — Ghost Replay
- Layout: identical to judge session layout (video top, action area bottom) but read-only
- Video plays via YouTube embed (`YouTubeEmbed` component reused, videoId from DB)
- Ghost replay engine:
  - `rep_taps` deserialized from DB JSON column
  - As video plays, poll `player.getCurrentTime()` via requestAnimationFrame or setInterval
  - When currentTime crosses a tap's time value, trigger visual indicator:
    - REP: large Check icon in patina-bronze, centered over video, fade out 600ms
    - NO REP: large X icon in raw-steel, same treatment
  - Indicator: absolutely positioned overlay on video, pointer-events-none
- Bottom section:
  - Final rep count in large patina-bronze text
  - Full rep log (same design as judge session rep log component)
  - Status: JUDGED / OFFICIAL badge

### Judge Flow Update
- JudgeSetupForm: remove YouTube URL input field entirely
- Serial input becomes the primary lookup field
- On serial submit: server action queries DB for entry WHERE serial = input
- If entry found WITH youtube_url: populate session data from DB (athleteName, discipline, weightKg, youtubeUrl, videoId, serial) and proceed to judge session
- If entry found WITHOUT youtube_url: show error "Video not yet uploaded by athlete"
- If no entry found: show error "No submission found for this serial"
- Judge session page: save rep_taps array to DB on score submission (extend submitScore action)

### Claude's Discretion
- API route structure for YouTube upload proxy (route handler vs server action)
- Error handling granularity for YouTube API failures (quota, auth expiry, network)
- Whether to add Google account connection prompt in onboarding vs just-in-time at upload
- Exact animation implementation for ghost replay indicators (CSS transitions vs framer-motion vs manual)
- Profile page empty state design
- Whether Entry Detail is a separate route or a modal/sheet

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database
- `lib/schema.ts` — Current Drizzle schema (scores table)
- `lib/db.ts` — Database client singleton
- `drizzle/0000_strong_punisher.sql` — Initial migration SQL
- `drizzle.config.ts` — Drizzle Kit configuration

### Recording Flow
- `lib/record-context.tsx` — RecordState interface with all session data available at upload time
- `app/record/layout.tsx` — Server layout generating serial and fetching athleteName
- `app/record/playback/page.tsx` — Where recordedBlob is consumed for export
- `app/record/instructions/page.tsx` — YouTube description template for clipboard copy (lines 23-30)
- `app/record/recording/page.tsx` — Canvas recorder, blob creation in onstop handler (lines 474-489)
- `lib/serial.ts` — Serial generation (XXX-0000 format, DB collision check)

### Judge Flow
- `components/judge/JudgeSetupForm.tsx` — Current form with YouTube URL + serial + all fields
- `components/judge/RepCounter.tsx` — Rep type definition, rep log UI, counter buttons
- `components/judge/YouTubeEmbed.tsx` — YouTube IFrame API wrapper
- `app/judge/session/page.tsx` — Judge session: reps state, getTimestamp, submitScore call
- `app/judge/complete/page.tsx` — Score submission confirmation page
- `lib/judge-context.tsx` — JudgeSession type, session state management
- `lib/actions/scores.ts` — submitScore server action (currently saves to scores table)

### Auth & Layout
- `app/judge/layout.tsx` — Auth check, JudgeSessionProvider wrapper
- `app/(app)/dashboard/page.tsx` — Dashboard with mode cards
- `components/ui/BottomNav.tsx` — Bottom navigation with locked PROFILE tab
- `lib/utils.ts` — extractYouTubeId utility

### Existing Patterns
- `app/(app)/leaderboard/page.tsx` — Server component DB query pattern
- `components/leaderboard/ScoresTable.tsx` — Table rendering pattern
- `components/leaderboard/DisciplineFilter.tsx` — Filter UI pattern

</canonical_refs>

<specifics>
## Specific Ideas

- Serial format is XXX-0000 (3 uppercase letters, dash, 4 digits) — unique per entry, collision-checked
- YouTube description template already exists at `app/record/instructions/page.tsx:23-30` — reuse for upload metadata
- Rep type `{ time: number | null; type: 'rep' | 'no-rep' }` defined in RepCounter.tsx — serialize as JSON for DB storage
- YouTubeEmbed component already handles YT IFrame API loading with module-level singleton — reuse for ghost replay
- Judge session already captures timestamps via `player.getCurrentTime()` — same mechanism drives ghost replay
- BottomNav profile tab at index 4: `{ id: 'profile', label: 'PROFILE', icon: User, href: null, locked: true }`
- Clerk v7 `@clerk/nextjs` — Google OAuth scope extension done in Clerk Dashboard, not in code
- Current `scores.youtubeUrl` column already exists but is nullable — was populated by judge, will now be populated by athlete

</specifics>

<deferred>
## Deferred Ideas

- Multiple judges per entry (v2 — MJ-01, MJ-02, MJ-03)
- Competition management / organizer workflows (v2 — COMP-01 through COMP-04)
- Push notifications when score is published (v2 — PWA-03)
- AI rep counting
- Video storage on Kova servers (athletes self-host on YouTube)

</deferred>

---

*Phase: 05-complete-athlete-loop*
*Context gathered: 2026-03-26 via PRD Express Path*
