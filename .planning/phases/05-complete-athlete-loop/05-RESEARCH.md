# Phase 5: Complete Athlete Loop — Research

**Researched:** 2026-03-26
**Status:** Complete

## 1. Codebase Research Findings

### 1.1 Where the WebM Blob Exists After Recording

The recorded video blob lives in React state within `RecordContext`:

- **Created at:** `app/record/recording/page.tsx:474-483` — `recorder.onstop` handler assembles chunks into a Blob, runs `webmFixDuration()`, then calls `setRecordedBlob(fixedBlob)`
- **Stored in:** `lib/record-context.tsx:29` — `recordedBlob: Blob | null` state variable
- **Accessed via:** `useRecord()` hook — available in any child of `RecordProvider`
- **Currently consumed by:** `app/record/playback/page.tsx` (creates blob URL for `<video>` preview and export download) and `app/record/instructions/page.tsx` (used as navigation guard only)
- **Lifetime:** In-memory only. Lost on page refresh or navigation outside `/record/*` tree. The `RecordProvider` wraps all `/record/*` routes via `app/record/layout.tsx`.

**Key insight for YouTube upload:** The blob must be uploaded BEFORE the user navigates away from the `/record/*` route tree. The upload button should appear on the playback page or instructions page while `recordedBlob` is still in memory.

### 1.2 Data Available in RecordContext at Upload Time

From `lib/record-context.tsx` — all fields available via `useRecord()`:

| Field | Type | Example | Available at upload? |
|-------|------|---------|---------------------|
| `serial` | `string` | `"ABC-1234"` | Yes — set by server layout |
| `discipline` | `Discipline \| null` | `"long-cycle"` | Yes — set during setup |
| `disciplineLabel` | `string \| null` | `"10 Min. Long Cycle"` | Yes — set during setup |
| `athleteName` | `string` | `"John Smith"` | Yes — from Clerk metadata |
| `weightKg` | `number \| null` | `24` | Yes — set during setup |
| `recordedBlob` | `Blob \| null` | `Blob(size=45MB)` | Yes — set after recording |
| `mimeType` | `string` | `"video/webm;codecs=vp9"` | Yes — detected during recording |
| `countdownSeconds` | `number` | `10` | Yes (not needed for upload) |
| `beepEveryMinute` | `boolean` | `false` | Yes (not needed for upload) |
| `autoStop` | `boolean` | `true` | Yes (not needed for upload) |

### 1.3 YouTube Description Template

Located at `app/record/instructions/page.tsx:23-30`:

```typescript
const description = `Athlete: ${athleteName}
Discipline: ${disciplineLabel ?? ''}
Kettlebell Weight: ${weightKg ?? ''} kg
Date: ${today}
Serial: ${serial}
Competition: TBD

Recorded with KOVA — Kettlebell Sport Competition Platform`
```

This should be extracted into a shared utility so both the clipboard copy and YouTube upload use the same template.

### 1.4 Current DB Schema

**Table: `scores`** (`lib/schema.ts`):

```typescript
export const scores = sqliteTable("scores", {
  id: text("id").primaryKey(),
  athleteName: text("athlete_name").notNull(),
  discipline: text("discipline").notNull(),
  weightKg: real("weight_kg").notNull(),
  reps: integer("reps").notNull(),       // ⚠️ NOT NULL — needs to become nullable
  youtubeUrl: text("youtube_url"),        // Already exists, nullable
  serial: text("serial"),                 // Already exists, nullable
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

**Missing columns for Phase 5:**
- `youtube_id` (text, nullable) — YouTube video ID for embed construction
- `status` (text, default 'pending') — 'pending' | 'judged'
- `athlete_id` (text, nullable) — Clerk user ID
- `rep_taps` (text, nullable) — JSON string of `{time: number, type: string}[]`

**Migration considerations:**
- SQLite ALTER TABLE supports ADD COLUMN but NOT modify column constraints
- To make `reps` nullable: need to create new table, copy data, drop old, rename — OR accept default value of 0 for pending entries
- Simpler: keep `reps` NOT NULL, default to 0 for athlete-created entries. Judge updates to actual count.

### 1.5 Score Submission Logic

`lib/actions/scores.ts` — `submitScore()`:
- Server action with `'use server'` directive
- Validates auth via `auth()`, validates all inputs
- Generates UUID for `id`
- Inserts into `scores` table
- Revalidates `/leaderboard` path
- Returns `{ id }` on success, `{ error }` on failure

**Changes needed:**
- Add `rep_taps` parameter (JSON string)
- Save `rep_taps` to DB
- Update entry status to 'judged' instead of creating new row (if entry already exists from athlete upload)
- OR: keep creating new row but link to athlete's entry via serial

**Design decision:** The current flow has the JUDGE creating the score row. In the new flow, the ATHLETE creates the entry row first (with youtube_url, serial, status=pending). The JUDGE then UPDATES that row (adds reps, rep_taps, status=judged). This is a fundamental change from INSERT to UPDATE.

### 1.6 Judge Setup Form

`components/judge/JudgeSetupForm.tsx`:
- Client component using `useJudgeSession()` context
- Fields: YouTube URL, athlete name, discipline select, weight, serial
- Validates all fields including URL extraction via `extractYouTubeId()`
- Sets session in context and navigates to `/judge/session`

**Changes needed for Phase 5:**
- Remove YouTube URL input entirely
- Serial becomes primary input
- On serial submit: call server action to look up entry in DB
- If found with youtube_url: auto-populate all fields from DB (athleteName, discipline, weightKg, youtubeUrl)
- If found without youtube_url: error message
- If not found: error message

### 1.7 Rep Taps Data Structure

`components/judge/RepCounter.tsx:7`:
```typescript
export type Rep = { time: number | null; type: 'rep' | 'no-rep' }
```

In `app/judge/session/page.tsx`:
- `reps` state: `Rep[]`
- Timestamps from `player.getCurrentTime()` (returns seconds as float)
- Currently NOT saved to DB — only `repCount` (filtered count of 'rep' type) is saved

**Serialization plan:**
```typescript
// Save
const repTapsJson = JSON.stringify(reps)
// Load
const repTaps: Rep[] = JSON.parse(entry.repTaps)
```

### 1.8 Authentication & Clerk Configuration

- Clerk v7 (`@clerk/nextjs ^7.0.6`)
- No middleware.ts at project root — uses Clerk's default behavior
- No Google OAuth currently configured
- Auth pattern: `auth()` and `currentUser()` in server components/layouts
- `publicMetadata.name` stores athlete display name

**Google OAuth setup:**
1. Enable Google social connection in Clerk Dashboard
2. Add `youtube.upload` scope in Clerk Dashboard OAuth settings
3. Retrieve token server-side: `clerkClient.users.getUserOauthAccessToken(userId, 'oauth_google')`
4. No code changes needed for OAuth connection — Clerk handles the flow

### 1.9 BottomNav Profile Tab

`components/ui/BottomNav.tsx:13`:
```typescript
{ id: 'profile', label: 'PROFILE', icon: User, href: null, locked: true },
```

**Change:** Set `href: '/profile'` and `locked: false`.

### 1.10 Existing Route Structure

```
app/
├── (app)/
│   ├── dashboard/page.tsx    — Dashboard with mode cards
│   └── leaderboard/page.tsx  — Public leaderboard (server component)
├── judge/
│   ├── layout.tsx            — Auth + JudgeSessionProvider
│   ├── page.tsx              — Judge setup form
│   ├── session/page.tsx      — Judge session (video + rep counter)
│   └── complete/page.tsx     — Score confirmation
├── record/
│   ├── layout.tsx            — Auth + RecordProvider (generates serial)
│   ├── page.tsx              — Discipline selection
│   ├── recording/page.tsx    — Camera + canvas recorder
│   ├── playback/page.tsx     — Review + export
│   └── instructions/page.tsx — YouTube upload guide + clipboard
├── onboarding/page.tsx
├── sign-in/page.tsx
└── sign-up/page.tsx
```

**New routes needed:**
- `app/(app)/profile/page.tsx` — Submission history (server component)
- `app/(app)/profile/[id]/page.tsx` — Entry detail with ghost replay

## 2. YouTube Data API v3 — Technical Details

### 2.1 Resumable Upload Protocol

1. **Initiate upload:** POST to `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
   - Header: `Authorization: Bearer {accessToken}`
   - Header: `Content-Type: application/json`
   - Body: video metadata (title, description, tags, category, privacy)
   - Response: `Location` header with upload URI

2. **Upload video data:** PUT to the upload URI
   - Header: `Content-Type: video/webm` (or `video/mp4`)
   - Header: `Content-Length: {blob.size}`
   - Body: video blob
   - For progress tracking: use `Content-Range: bytes {start}-{end}/{total}`

3. **Handle response:** 200 OK with video resource including `id` (videoId)

### 2.2 Upload Architecture Decision

**Option A: Client-side upload (recommended)**
- Server action retrieves Google OAuth token from Clerk
- Token passed to client
- Client uploads blob directly to YouTube API
- Advantages: no server bandwidth, blob stays in browser memory, progress tracking trivial
- Disadvantage: token exposed to client (mitigated: token is user's own, scoped to youtube.upload only)

**Option B: Server-side upload via API route**
- Client sends blob to Next.js API route
- API route uploads to YouTube
- Disadvantage: blob must traverse network twice (client→server→YouTube), large files (45MB+ for 10min video)
- Advantage: token never leaves server

**Recommendation: Option A** — client-side upload. The video blob is already in browser memory (45-80MB for a 10-minute recording). Sending it through the server doubles bandwidth and adds a failure point. The OAuth token is the user's own token, scoped to upload only.

### 2.3 Token Retrieval

Server action pattern:
```typescript
'use server'
import { clerkClient, auth } from '@clerk/nextjs/server'

export async function getYouTubeToken(): Promise<{ token: string } | { error: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const client = await clerkClient()
  const tokens = await client.users.getUserOauthAccessToken(userId, 'oauth_google')

  if (!tokens.data || tokens.data.length === 0) {
    return { error: 'Google account not connected' }
  }

  return { token: tokens.data[0].token }
}
```

### 2.4 Quota Considerations

- YouTube Data API v3 default quota: 10,000 units/day
- Video upload costs: 1,600 units per upload
- At default quota: ~6 uploads per day
- For production: request quota increase via Google Cloud Console

## 3. DB Migration Plan

### 3.1 New Columns

```typescript
// lib/schema.ts — updated
export const scores = sqliteTable("scores", {
  id: text("id").primaryKey(),
  athleteName: text("athlete_name").notNull(),
  discipline: text("discipline").notNull(),
  weightKg: real("weight_kg").notNull(),
  reps: integer("reps"),                    // CHANGED: nullable (null = pending)
  youtubeUrl: text("youtube_url"),          // EXISTS: no change
  youtubeId: text("youtube_id"),            // NEW
  serial: text("serial"),                   // EXISTS: no change
  status: text("status").default("pending"),// NEW: 'pending' | 'judged'
  athleteId: text("athlete_id"),            // NEW: Clerk userId
  repTaps: text("rep_taps"),               // NEW: JSON array
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### 3.2 Migration SQL

```sql
ALTER TABLE scores ADD COLUMN youtube_id TEXT;
ALTER TABLE scores ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE scores ADD COLUMN athlete_id TEXT;
ALTER TABLE scores ADD COLUMN rep_taps TEXT;
```

For making `reps` nullable in SQLite — two approaches:
1. **Pragmatic:** Keep `reps` NOT NULL, use 0 for pending entries. Judge updates to actual count. Leaderboard already filters by reps > 0 effectively.
2. **Clean:** Create new table, migrate data, swap. More complex for a column constraint change.

**Recommendation:** Option 1 — keep `reps` NOT NULL with default 0. Simpler, no data migration risk.

### 3.3 New Server Actions Needed

1. **`createEntry`** — Athlete creates entry after upload:
   ```
   Input: athleteName, discipline, weightKg, serial, youtubeUrl, youtubeId, athleteId
   Output: { id } | { error }
   ```

2. **`lookupEntryBySerial`** — Judge looks up entry:
   ```
   Input: serial
   Output: { entry: Score } | { error: 'not_found' | 'no_video' }
   ```

3. **`getAthleteEntries`** — Profile page query:
   ```
   Input: athleteId (from auth)
   Output: Score[]
   ```

4. **`getEntryById`** — Entry detail page:
   ```
   Input: id, athleteId (must own)
   Output: Score | null
   ```

5. **Update `submitScore`** — Judge saves score with rep_taps:
   ```
   Changed: update existing entry (by serial) instead of insert
   Added: repTaps parameter (JSON string)
   Sets: status = 'judged'
   ```

## 4. Ghost Replay Implementation

### 4.1 Timing Engine

```typescript
// Pseudocode for ghost replay polling
const repTaps: Rep[] = JSON.parse(entry.repTaps)
let lastProcessedIndex = 0

function pollReplay() {
  const currentTime = player.getCurrentTime() // seconds (float)

  while (lastProcessedIndex < repTaps.length) {
    const tap = repTaps[lastProcessedIndex]
    if (tap.time !== null && tap.time <= currentTime) {
      triggerIndicator(tap.type) // show Check or X
      lastProcessedIndex++
    } else {
      break
    }
  }

  requestAnimationFrame(pollReplay)
}
```

### 4.2 Visual Indicator

- Absolutely positioned div over the YouTube embed
- `pointer-events-none` so it doesn't block video controls
- Large icon (Check or X) centered
- Fade animation: opacity 1 → 0 over 600ms
- Colors: Check = patina-bronze (#B87333), X = raw-steel (#8A8A8A)

### 4.3 YouTube Player Seek Handling

- If user seeks backward: reset `lastProcessedIndex` to find correct position
- If user seeks forward: advance index past skipped taps
- On seek: recalculate `lastProcessedIndex` based on new `currentTime`

## 5. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| YouTube API quota (6 uploads/day default) | Blocks athletes after 6 uploads | Request quota increase; show remaining quota in UI |
| Google OAuth token expiry during upload | Upload fails mid-way | Use resumable upload; retry with fresh token |
| Blob lost on page refresh before upload | Recording lost | Show warning before navigation; consider IndexedDB backup |
| rep_taps JSON corruption | Ghost replay broken | Validate JSON on read; graceful fallback to no replay |
| Clerk Google OAuth scope not configured | Upload silently fails | Pre-flight check on recording page; clear error messaging |

## RESEARCH COMPLETE
