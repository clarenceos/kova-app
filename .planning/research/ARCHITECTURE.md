# Architecture Research

**Domain:** Multi-role sports competition PWA (async kettlebell sport)
**Researched:** 2026-03-24
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                               │
│                                                                   │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Athlete       │  │ Judge        │  │ Organizer          │    │
│  │ /record/*     │  │ /judge/*     │  │ /organizer/*       │    │
│  │ ('use client')│  │ ('use client'│  │ (mostly SC)        │    │
│  │ camera/canvas │  │ YouTube +    │  │ forms + tables     │    │
│  │ MediaRecorder │  │ tap counter) │  │                    │    │
│  └───────┬───────┘  └──────┬───────┘  └─────────┬──────────┘    │
│          │                 │                     │               │
├──────────┴─────────────────┴─────────────────────┴───────────────┤
│                   NEXT.JS APP ROUTER LAYER                        │
│                                                                   │
│  ┌──────────────┐  ┌───────────────────────────────────────┐    │
│  │ Route Groups │  │ Server Actions (actions/)              │    │
│  │ (athlete)    │  │  - saveAthleteProfile (Clerk metadata) │    │
│  │ (judge)      │  │  - createCompetition (DB)              │    │
│  │ (organizer)  │  │  - submitEntry (DB)                    │    │
│  │ (public)     │  │  - submitScore (DB)                    │    │
│  └──────────────┘  │  - publishResults (DB)                 │    │
│                    └───────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────┤
│                   DATA ACCESS LAYER (lib/dal/)                    │
│                                                                   │
│  ┌──────────────────────┐    ┌──────────────────────────┐       │
│  │ Turso + Drizzle ORM  │    │ Clerk SDK (clerkClient)  │       │
│  │ (competitions, etc.) │    │ (publicMetadata writes)  │       │
│  └──────────────────────┘    └──────────────────────────┘       │
├──────────────────────────────────────────────────────────────────┤
│                   EXTERNAL SERVICES                               │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Turso DB     │  │ Clerk Auth   │  │ YouTube IFrame API  │   │
│  │ (edge SQLite)│  │ (identity +  │  │ (judge playback,    │   │
│  │              │  │  metadata)   │  │  no storage cost)   │   │
│  └──────────────┘  └──────────────┘  └─────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `(athlete)` route group | All athlete-facing UI: onboarding, recorder, competition entry | Client components with `'use client'` throughout |
| `(judge)` route group | Assigned entry view, YouTube embed, rep tap counter, score submit | Client component for interaction, server component shell |
| `(organizer)` route group | Competition CRUD, athlete entry management, judge assignment, result publish | Mostly server components with server action forms |
| `(public)` route group | Public leaderboard, unauthenticated result viewing | Server components, cached queries |
| `actions/` | Thin `'use server'` entry points that delegate to DAL | Validate input, call DAL, revalidatePath |
| `lib/dal/` | All DB queries and Clerk metadata mutations, `server-only` | Drizzle queries, clerkClient calls, auth checks |
| `lib/db.ts` | Drizzle client singleton (Turso connection) | `drizzle(createClient({url, authToken}))` |
| `RecorderCanvas` | Canvas overlay loop (requestAnimationFrame), MediaRecorder, AudioContext | Single `'use client'` component, internal state machine |
| `public/sw.js` | Service worker: cache shell + static assets, network-first API | Workbox or hand-rolled with Cache API |

## Recommended Project Structure

```
app/
├── (athlete)/
│   ├── layout.tsx              # Athlete nav; redirects non-athletes to /
│   ├── onboarding/
│   │   └── page.tsx            # Collect athlete name → Clerk publicMetadata
│   ├── record/
│   │   ├── page.tsx            # Setup step (discipline, weight, countdown)
│   │   └── [session]/
│   │       └── page.tsx        # Recorder → playback → export → YouTube guide
│   └── compete/
│       ├── page.tsx            # Browse open competitions
│       └── [competitionId]/
│           └── page.tsx        # Entry form (submit YouTube URL)
├── (judge)/
│   ├── layout.tsx              # Judge nav; guard
│   └── entries/
│       ├── page.tsx            # Assigned entries list
│       └── [entryId]/
│           └── page.tsx        # Video + tap counter + submit
├── (organizer)/
│   ├── layout.tsx              # Organizer nav; guard
│   ├── competitions/
│   │   ├── page.tsx            # Competition list
│   │   ├── new/page.tsx        # Create competition form
│   │   └── [id]/
│   │       ├── page.tsx        # Competition dashboard
│   │       ├── entries/page.tsx
│   │       └── results/page.tsx
│   └── judges/
│       └── page.tsx            # Assign judges to entries
├── (public)/
│   └── competitions/
│       └── [id]/
│           └── leaderboard/
│               └── page.tsx    # Public results (unofficial/official)
├── actions/
│   ├── athlete.ts              # 'use server' — onboarding, entry submit
│   ├── judge.ts                # 'use server' — score submit
│   └── organizer.ts            # 'use server' — competition CRUD, publish
├── manifest.ts                 # PWA manifest (Next.js built-in)
├── layout.tsx                  # Root: ClerkProvider only (DO NOT MODIFY)
└── page.tsx                    # Landing / role redirect

lib/
├── dal/
│   ├── competitions.ts         # server-only — competition queries
│   ├── entries.ts              # server-only — entry queries
│   ├── scores.ts               # server-only — score queries
│   └── users.ts                # server-only — Clerk clerkClient metadata
├── db.ts                       # Drizzle + Turso client singleton
└── utils.ts                    # cn(), slugify(), serial generation

db/
├── schema.ts                   # All Drizzle table definitions
└── migrations/                 # drizzle-kit generated

components/
├── recorder/
│   ├── RecorderCanvas.tsx      # 'use client' — the core recording component
│   ├── SetupForm.tsx           # 'use client' — discipline/weight/options
│   ├── PlaybackView.tsx        # 'use client' — review before export
│   └── YouTubeGuide.tsx        # 'use client' — copy-to-clipboard instructions
├── judge/
│   ├── TapCounter.tsx          # 'use client' — large tap target, running count
│   └── YouTubeEmbed.tsx        # 'use client' — IFrame API wrapper
├── organizer/
│   ├── CompetitionForm.tsx
│   ├── EntryTable.tsx
│   └── LeaderboardTable.tsx
└── ui/                         # shadcn/ui components

public/
└── sw.js                       # Service worker (hand-rolled or Serwist)
```

### Structure Rationale

- **Route groups `(athlete)`, `(judge)`, `(organizer)`:** Keep role layouts isolated — each can have its own `layout.tsx` that guards by Clerk `publicMetadata.role`. No URL pollution (parentheses are stripped from paths). Full page reload only occurs if you navigate between groups with different root layouts — Kova uses the single root `app/layout.tsx` so this is not a concern per Next.js docs.
- **`actions/` as thin shims:** Server actions are public POST endpoints. The official Next.js Data Security guide explicitly recommends keeping them thin and delegating to a `server-only` DAL. This prevents accidental logic duplication and makes authorization auditing straightforward.
- **`lib/dal/` with `server-only`:** Marks the module boundary — if DAL code is accidentally imported into a Client Component, the build fails. All Drizzle queries and clerkClient calls live here.
- **`components/recorder/`:** The recording flow is entirely client-side and the most complex UI in the app. Grouping its components signals "this subtree never touches the server."
- **`db/schema.ts` (single file):** Drizzle with Turso works best with a single schema file for v1 — migrations are generated by drizzle-kit and run via the Turso CLI or programmatically on deploy.

## Architectural Patterns

### Pattern 1: Route Group Layout Guards

**What:** Each role's `layout.tsx` calls `auth()` from `@clerk/nextjs/server` and checks `publicMetadata.role`. Unauthorized users are redirected, not shown 403.

**When to use:** All three role route groups. More user-friendly than forbidden pages for a sports app.

**Trade-offs:** Redirect logic in every role layout is slightly repetitive — extract a `requireRole(role)` helper to keep layouts clean.

**Example:**
```typescript
// app/(judge)/layout.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function JudgeLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  if (!userId || sessionClaims?.publicMetadata?.role !== 'judge') {
    redirect('/')
  }
  return <>{children}</>
}
```

### Pattern 2: Thin Server Action + DAL Delegation

**What:** Server actions validate input with Zod, then delegate all business logic to `server-only` DAL functions. The action's only additional job is cache revalidation.

**When to use:** All mutations — entry submission, score submission, competition creation.

**Trade-offs:** Two files per domain instead of one. Worth it: auth bugs in actions are the #1 security issue in Next.js apps (per official data security guide). The thin action pattern makes auditing each layer independently practical.

**Example:**
```typescript
// app/actions/judge.ts
'use server'

import { z } from 'zod'
import { submitScore } from '@/lib/dal/scores'
import { revalidatePath } from 'next/cache'

const schema = z.object({ entryId: z.string(), repCount: z.number().int().min(0) })

export async function submitScoreAction(data: { entryId: string; repCount: number }) {
  const parsed = schema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid input' }
  await submitScore(parsed.data)         // auth + authz + DB inside DAL
  revalidatePath(`/judge/entries/${data.entryId}`)
  return { success: true }
}

// lib/dal/scores.ts
import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { scores, entries } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function submitScore({ entryId, repCount }: { entryId: string; repCount: number }) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  // Verify this judge is assigned to this entry (IDOR prevention)
  const entry = await db.query.entries.findFirst({ where: eq(entries.id, entryId) })
  if (!entry || entry.assignedJudgeId !== userId) throw new Error('Forbidden')
  await db.insert(scores).values({ entryId, judgeId: userId, repCount })
}
```

### Pattern 3: Client-Side Recording State Machine (no global state lib)

**What:** The multi-step recording flow (setup → countdown → recording → playback → export → YouTube guide) is pure local React state inside `RecorderCanvas.tsx`. A discriminated union type drives which step renders.

**When to use:** The recording flow only. No other part of the app needs to know recording state — once the athlete submits a YouTube URL, that's a server action, not shared state.

**Trade-offs:** `RecorderCanvas.tsx` becomes the largest single component. Acceptable given the clear boundary: everything recording-related lives here, nothing else does. No global state library needed — this avoids an entire dependency and its associated bundle weight.

**Example:**
```typescript
type RecordingStep =
  | { step: 'setup' }
  | { step: 'countdown'; secondsLeft: number }
  | { step: 'recording'; startedAt: number; mediaRecorder: MediaRecorder }
  | { step: 'playback'; blob: Blob }
  | { step: 'export'; blob: Blob; filename: string }
  | { step: 'youtube-guide'; serial: string }

// useState<RecordingStep>({ step: 'setup' }) drives the entire flow
```

### Pattern 4: Clerk Metadata Write via clerkClient

**What:** The onboarding action writes `publicMetadata.name` (and optionally `role`) via `clerkClient().users.updateUser()`. This runs server-side only, behind auth.

**When to use:** Athlete onboarding, and any future admin role assignment.

**Trade-offs:** clerkClient is a Clerk Backend SDK call — it uses the Clerk Secret Key, lives in `server-only` DAL, never in client components.

**Example:**
```typescript
// lib/dal/users.ts
import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'

export async function saveAthleteProfile({ name }: { name: string }) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  const client = await clerkClient()
  await client.users.updateUser(userId, {
    publicMetadata: { name, role: 'athlete' }
  })
}
```

## Data Flow

### Athlete Recording Flow (100% Client-Side)

```
User opens /record
    ↓
SetupForm (useState: discipline, weight, options)
    ↓ submit → state: 'countdown'
RecorderCanvas
    ├── getUserMedia() → stream
    ├── canvas.captureStream(30) → canvasStream
    ├── requestAnimationFrame loop: drawFrame(stream, overlays) → canvas
    ├── MediaRecorder(canvasStream) → chunks[]
    └── auto-stop → Blob → state: 'playback'
PlaybackView (URL.createObjectURL(blob))
    ↓ user approves → state: 'export'
Export: anchor.click() with .webm Blob
    ↓ → state: 'youtube-guide'
YouTubeGuide: copy-to-clipboard pre-filled description

No server contact until athlete submits YouTube URL via submitEntry action
```

### Entry Submission Flow

```
Athlete fills entry form (competition + YouTube URL)
    ↓ form.action = submitEntryAction
Server Action (app/actions/athlete.ts)
    ↓ Zod validate
DAL: createEntry() (lib/dal/entries.ts)
    ├── auth() → verify athlete userId
    ├── verify competition is open
    └── db.insert(entries, { competitionId, athleteId, youtubeUrl, ... })
    ↓ revalidatePath
Server Component re-renders entry confirmation
```

### Judge Scoring Flow

```
Organizer assigns judge → updates entries.assignedJudgeId
    ↓
Judge navigates to /judge/entries/[entryId]
Server Component: fetch entry (youtubeUrl, competition info) from DAL
    ↓ props to client boundary
YouTubeEmbed (Client): IFrame API player
TapCounter (Client): useState(0), big touch target
    ↓ judge taps reps, submits count
submitScoreAction → DAL: insertScore
    ↓ revalidatePath
Entry marked as scored; organizer can see score
```

### Leaderboard / Result Publish Flow

```
Organizer: publishResultsAction
    ↓
DAL: setCompetitionStatus('official')
    ↓ revalidatePath
Public leaderboard server component re-renders
    Reads: scores JOIN entries JOIN users (Clerk metadata for names)
    Sorts: by repCount DESC per division
    Shows: "Official Results" badge
```

## DB Schema

Drizzle SQLite (Turso). All IDs are `text` (UUIDs or cuid2, generated client-side before insert).

```typescript
// db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const competitions = sqliteTable('competitions', {
  id:         text('id').primaryKey(),              // cuid2
  name:       text('name').notNull(),
  slug:       text('slug').notNull().unique(),
  status:     text('status').notNull()              // 'draft' | 'open' | 'closed' | 'official'
              .$type<'draft' | 'open' | 'closed' | 'official'>(),
  startDate:  integer('start_date'),                // Unix timestamp
  endDate:    integer('end_date'),
  disciplines: text('disciplines').notNull(),       // JSON array: ['long_cycle','jerk','snatch']
  createdBy:  text('created_by').notNull(),         // Clerk userId of organizer
  createdAt:  integer('created_at').notNull(),
})

export const divisions = sqliteTable('divisions', {
  id:            text('id').primaryKey(),
  competitionId: text('competition_id').notNull().references(() => competitions.id),
  gender:        text('gender').notNull().$type<'m' | 'f' | 'mx'>(),
  weightClass:   real('weight_class').notNull(),    // kg upper bound, e.g. 68.0
  discipline:    text('discipline').notNull(),       // 'long_cycle' | 'jerk' | 'snatch'
  label:         text('label').notNull(),            // e.g. "Men's 68kg Long Cycle"
})

export const entries = sqliteTable('entries', {
  id:               text('id').primaryKey(),
  competitionId:    text('competition_id').notNull().references(() => competitions.id),
  divisionId:       text('division_id').notNull().references(() => divisions.id),
  athleteId:        text('athlete_id').notNull(),   // Clerk userId
  athleteName:      text('athlete_name').notNull(), // Denormalized from publicMetadata.name
  youtubeUrl:       text('youtube_url'),            // Null until athlete submits
  kovaSerial:       text('kova_serial'),            // Baked into the video watermark
  discipline:       text('discipline').notNull(),
  weightKg:         real('weight_kg').notNull(),
  status:           text('status').notNull()
                    .$type<'pending' | 'submitted' | 'scored' | 'disqualified'>(),
  assignedJudgeId:  text('assigned_judge_id'),      // Clerk userId of judge, nullable
  submittedAt:      integer('submitted_at'),
  createdAt:        integer('created_at').notNull(),
})

export const scores = sqliteTable('scores', {
  id:        text('id').primaryKey(),
  entryId:   text('entry_id').notNull().references(() => entries.id),
  judgeId:   text('judge_id').notNull(),            // Clerk userId of judge
  repCount:  integer('rep_count').notNull(),
  notes:     text('notes'),                         // Optional judge notes
  scoredAt:  integer('scored_at').notNull(),
})
```

**Design decisions:**

- **No users table.** Athlete names are denormalized into `entries.athleteName` at submission time (from Clerk `publicMetadata.name`). This avoids a join for leaderboard display and is stable even if the athlete changes their name later.
- **`divisions` as first-class rows**, not JSON arrays. Enables clean filtering: `WHERE division_id = ?` for leaderboard queries.
- **`entries.status` state machine:** `pending` (registered, no video) → `submitted` (YouTube URL provided) → `scored` → `disqualified`. Organizers can DQ without deleting.
- **Timestamps as Unix integers.** Turso/SQLite has no native datetime. Integer timestamps are sortable and simple to serialize over JSON to client components.
- **`kovaSerial` on entry.** The serial baked into the video watermark is stored on the entry at creation time, before recording. Judges can cross-reference the serial in the video against the DB record.

## PWA Service Worker Strategy

**Recommendation: hand-rolled `public/sw.js` over `next-pwa@5.6.0`.**

`next-pwa@5.6.0` is a webpack-based plugin. Next.js 16 defaults to Turbopack for `next dev`. The plugin may conflict and is unmaintained (last release 2022). The official Next.js PWA guide recommends Serwist for full offline support, but also shows a manual `public/sw.js` pattern for simpler cases. Kova's offline needs are minimal — the recording flow is 100% client-side and does not need network.

**What to cache (Cache-First):**
- App shell: `/_next/static/**` — JS/CSS chunks, fonts
- PWA icons and manifest: `/icon-*.png`, `/manifest.webmanifest`
- Static images in `/public/`

**What to cache (Network-First with stale fallback):**
- Competition list, entry status pages — users expect fresh data but degraded offline is acceptable

**What NOT to cache:**
- Server action POST requests — never cache mutations
- YouTube IFrame API scripts — Turso/YouTube own these; stale YouTube JS breaks embeds
- Clerk auth endpoints — caching auth responses creates security bugs
- `/api/*`, `/_next/data/**` — Next.js manages these via its own caching layer

**Service worker registration:** Register in `instrumentation-client.ts` (Next.js 16 supported hook) or a layout-level `useEffect` — not in the root layout server component.

```javascript
// public/sw.js (simplified Workbox-free pattern)
const SHELL_CACHE = 'kova-shell-v1'
const SHELL_URLS = ['/', '/record', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Never intercept: POST requests, Clerk, YouTube, Next.js data
  if (event.request.method !== 'GET') return
  if (url.hostname !== self.location.hostname) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) return

  // Cache-first for static assets
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    )
  }
})
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Clerk | `ClerkProvider` in root layout, `auth()` in server components/actions, `clerkClient()` in DAL for metadata writes | Clerk v7 installed; `clerkMiddleware()` in `proxy.ts` — do not modify |
| Turso | `@libsql/client` + Drizzle ORM; single `lib/db.ts` singleton with `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` env vars | Edge-compatible; `createClient` supports both local (`file:./local.db`) and remote (`libsql://`) |
| YouTube IFrame API | Client-side script tag in `YouTubeEmbed.tsx` — load `https://www.youtube.com/iframe_api` via `useEffect`, render `<YT.Player>` | No API key needed for embed-only usage; URL parsing to extract video ID from submitted YouTube links |
| Vercel | Deploy target; `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` as environment variables in Vercel dashboard | Edge runtime not needed — App Router defaults to Node.js serverless which Turso's HTTP client handles fine |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client components → Server actions | `import` + invoke (Next.js serialization) | Always call from event handlers, not render. Pass minimal data — IDs, not full objects |
| Server actions → DAL | Direct function call | DAL is `server-only`; actions import from `@/lib/dal/*` |
| DAL → Drizzle | `db.query.*` / `db.insert()` etc. | One `db` singleton from `lib/db.ts` |
| DAL → Clerk | `(await clerkClient()).users.updateUser()` | Clerk v7 uses async `clerkClient()` factory — not a static import |
| Server components → DAL | Direct function call (same process) | Server components can call DAL directly; no action needed for reads |
| RecorderCanvas → MediaRecorder | Internal component state | Blob never leaves client boundary; only the YouTube URL eventually reaches the server |

## Suggested Build Order

Dependencies drive this ordering — each phase unblocks the next:

1. **DB schema + DAL scaffolding** — everything else reads/writes to this. Define all tables, write typed DAL functions (even with stub implementations). Unlocks: actions, server components.

2. **Clerk role model + route guards** — `publicMetadata.role` assignment and layout guards. Athlete onboarding (save name to Clerk metadata). Unlocks: all role-gated routes.

3. **Athlete recorder** — heaviest client-side work; standalone (no DB writes until YouTube URL submission). Needs: Clerk userId for serial generation. Unlocks: YouTube URL submission flow.

4. **Competition management (Organizer)** — create competitions with divisions. Unlocks: athlete entry submission (needs competitions to exist).

5. **Athlete entry submission** — athletes browse and register for competitions, submit YouTube URLs. Needs: competitions in DB. Unlocks: judge assignment.

6. **Judge interface** — view assigned entry, YouTube embed, tap counter, submit score. Needs: entries with YouTube URLs and judge assignments. Unlocks: leaderboard.

7. **Leaderboard + result publishing** — read scores, sort by division, organizer publish action. Needs: scored entries.

8. **PWA shell** — manifest, service worker, install prompt. Can be added at any point after core routes exist; defer to avoid complicating dev setup.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–500 users | Current architecture is correct. Single Turso DB, Vercel serverless, no caching needed. |
| 500–10k users | Add React `cache()` wrappers in DAL for leaderboard reads (hot path). Consider `revalidateTag` instead of `revalidatePath` for fine-grained cache busting. |
| 10k+ users | Evaluate Turso's multi-region replicas (built-in, configuration change only). Leaderboard can be ISR with short TTL instead of always dynamic. |

### Scaling Priorities

1. **First bottleneck:** Leaderboard query — it joins competitions + divisions + entries + scores. Add indexes on `entries.competition_id`, `entries.division_id`, `scores.entry_id` from day one.
2. **Second bottleneck:** Clerk `clerkClient().users.updateUser()` calls — these are external HTTP. Cache `publicMetadata.name` reads in the DAL using React `cache()` to avoid repeated Clerk API calls within a single request.

## Anti-Patterns

### Anti-Pattern 1: Fetching Clerk publicMetadata in Client Components

**What people do:** Pass `user.publicMetadata` from a client-side `useUser()` hook to control role-gated UI.

**Why it's wrong:** `publicMetadata` is authoritative on the server. Client-side role checks are a UX hint, not a security boundary. A malicious user can manipulate client state. Every protected action must re-verify server-side.

**Do this instead:** Check `sessionClaims?.publicMetadata?.role` inside server components and DAL functions using the server-side `auth()`. Client components can use `useUser()` for display purposes only (e.g., showing the athlete's name in the UI).

### Anti-Pattern 2: Putting Business Logic Directly in Server Actions

**What people do:** Write auth checks, DB queries, and complex logic inline in `'use server'` files.

**Why it's wrong:** Server actions are public POST endpoints (per Next.js data security guide). Without a DAL boundary, authorization logic gets duplicated, forgotten, or inconsistently applied across actions. Makes security auditing hard.

**Do this instead:** Keep actions thin (validate → delegate → revalidate). All auth + DB logic in `lib/dal/` with `import 'server-only'`.

### Anti-Pattern 3: Including MediaRecorder / Canvas / AudioContext in Server Components

**What people do:** Try to share recording utility code between server and client contexts, or forget to mark large component trees with `'use client'`.

**Why it's wrong:** `window`, `navigator.mediaDevices`, `AudioContext`, `HTMLCanvasElement` are not available in the Node.js runtime. Next.js will throw at build or request time.

**Do this instead:** Mark `RecorderCanvas.tsx` and all recorder sub-components with `'use client'`. Use a server component page (`app/(athlete)/record/page.tsx`) as a thin shell that renders `<RecorderCanvas />` — the client boundary is at the component level, not the page level.

### Anti-Pattern 4: Using next-pwa@5 with Next.js 16

**What people do:** Wrap `next.config.ts` with `withPWA()` from `next-pwa@5.6.0` since it's already in `package.json`.

**Why it's wrong:** `next-pwa@5` uses webpack-based Workbox injection. Next.js 16 defaults to Turbopack for `next dev`. The plugin is unmaintained and the combination is untested. You will likely get build errors or a silently non-functional service worker.

**Do this instead:** Use `public/sw.js` with a hand-rolled cache strategy (sufficient for Kova's minimal offline needs), or migrate to `@serwist/next` which has explicit Next.js 16 / Turbopack support. Register the service worker in `instrumentation-client.ts`.

## Sources

- Next.js 16 official docs: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- Next.js 16 official docs: `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- Next.js 16 official docs: `node_modules/next/dist/docs/01-app/02-guides/forms.md`
- Next.js 16 official docs: `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`
- Next.js 16 official docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`
- `@clerk/nextjs@7.0.6` dist types: `node_modules/@clerk/nextjs/dist/types/server/index.d.ts`
- `drizzle-orm@0.45.1` libsql driver: `node_modules/drizzle-orm/libsql/driver.d.ts`
- `next-pwa@5.6.0` package.json: webpack/workbox dependency confirmed, last release 2022
- Project context: `.planning/PROJECT.md`

---
*Architecture research for: Kova — async kettlebell sport competition PWA*
*Researched: 2026-03-24*
