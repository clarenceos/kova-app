# Architecture Research

**Domain:** Competition registration and queue scheduling — new milestone on existing Kova PWA
**Researched:** 2026-04-02
**Confidence:** HIGH (derived from direct codebase reading + QUEUE_SPEC.md)

## Standard Architecture

### System Overview — New Features in Context

```
┌──────────────────────────────────────────────────────────────────────┐
│                    EXISTING KOVA ARCHITECTURE                         │
│                                                                       │
│  app/(app)/           app/record/          app/judge/                 │
│  (auth guarded)       (auth guarded)       (auth guarded)             │
│  dashboard, profile,  recording flow       judge session              │
│  leaderboard          client-only          client-only                │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ shares
┌──────────────────────────────▼───────────────────────────────────────┐
│                    SHARED INFRASTRUCTURE                              │
│                                                                       │
│  lib/db.ts (Turso singleton)   lib/schema.ts (scores, profiles)       │
│  lib/actions/*  (server actions)   components/ui/*  (shadcn)          │
│  components/ui/GlobalHeader.tsx    components/ui/BottomNav.tsx         │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ NEW tables added here
┌──────────────────────────────▼───────────────────────────────────────┐
│                    NEW: QUEUE SYSTEM                                  │
│                                                                       │
│  app/organizerdb/              app/registration/[compId]/             │
│  (no auth — auth-ready)        (no auth — public)                     │
│                                                                       │
│  ┌─────────────────┐  ┌──────────────────────────────────────────┐   │
│  │ OrganizerDB SC  │  │ RegistrationForm CC                      │   │
│  │ (server comp)   │  │ (event checkboxes, conditional subfields)│   │
│  │ CompSelector    │  └──────────────┬───────────────────────────┘   │
│  │ AnalyticsBar    │                 │ server action                  │
│  │ RegTable SC     │                 ▼                                │
│  │ QueueModal CC   │  lib/actions/registration.ts                     │
│  └────────┬────────┘  (createRegistrant — transaction)               │
│           │ server action                                             │
│           ▼                                                           │
│  lib/actions/competitions.ts   lib/actions/queue.ts                   │
│  (createCompetition,           (generateQueue — calls scheduler)      │
│   removeRegistrant,                                                   │
│   importCSV)                                                          │
│           │                                                           │
│           ▼                                                           │
│  lib/schema.ts — 3 new tables: competitions, registrants,             │
│                                 registration_entries                  │
│                                                                       │
│  lib/queue/                                                           │
│  ├── scheduler.ts  (pure function — no DB)                            │
│  └── weightClass.ts (pure helper)                                     │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Type |
|-----------|----------------|------|
| `app/organizerdb/page.tsx` | Competition selector, analytics bar, registrations table, CSV import, generate-queue modal | Server component shell + client islands |
| `app/organizerdb/create/page.tsx` | Competition creation form with bell weight checkboxes | Server component shell + client form component |
| `app/organizerdb/queue/page.tsx` | Timetable view — receives `compId` + `startTime` as query params, calls scheduler, renders grid + conflicts | Server component (pure render, no mutation) |
| `app/registration/[compId]/page.tsx` | Public registration form with competition guard states | Server component shell fetches comp, passes to client form |
| `app/registration/[compId]/success/page.tsx` | Confirmation — shows registrant name + serial table | Server component (reads from DB by session or redirect payload) |
| `CompetitionForm` | Controlled form with checkbox matrix for bell weights, derived serial_prefix display | Client component (`'use client'`) |
| `RegistrationForm` | Multi-event registration, conditional subfields per event, country searchable dropdown | Client component (`'use client'`) |
| `RegistrationsTable` | Sortable/filterable table with remove actions | Client component or server component with client sort — see notes |
| `GenerateQueueModal` | Start time input, confirms before navigating to queue | Client component (`'use client'`) |
| `lib/actions/competitions.ts` | `createCompetition`, `removeRegistrant`, `importCSV` — server actions | `'use server'` |
| `lib/actions/registration.ts` | `createRegistration` — transaction: insert registrant + entries, assign serials | `'use server'` |
| `lib/actions/queue.ts` | `getQueueData` — fetch entries with registrant data for scheduler input | `'use server'` or server component direct call |
| `lib/queue/scheduler.ts` | Pure scheduling function — takes entries array, returns `TimeBlock[]` + `Conflict[]` | Pure TypeScript, no imports from `lib/db.ts` |
| `lib/queue/weightClass.ts` | `getWeightClass(gender, bodyWeightKg)` → display string | Pure TypeScript helper |
| `lib/serial.ts` (extend) | Add `generateCompetitionSerial(competitionId, prefix)` — competition-scoped sequential serial | Server-only, used inside transaction |

## Recommended Project Structure

```
app/
├── (app)/                          # EXISTING — auth-guarded, mobile-first
│   ├── layout.tsx                  # EXISTING — do not modify
│   ├── dashboard/
│   ├── leaderboard/
│   └── profile/
├── record/                         # EXISTING — do not modify
├── judge/                          # EXISTING — do not modify
│
├── organizerdb/                    # NEW — desktop-first, no auth yet
│   ├── page.tsx                    # Dashboard: comp selector + registrations table
│   ├── create/
│   │   └── page.tsx                # Competition creation form
│   └── queue/
│       └── page.tsx                # Generated timetable view
│
├── registration/                   # NEW — public, no auth
│   └── [compId]/
│       ├── page.tsx                # Registration form
│       └── success/
│           └── page.tsx            # Confirmation + serials
│
└── layout.tsx                      # EXISTING — do not modify

lib/
├── schema.ts                       # EXTEND — add 3 new tables
├── db.ts                           # EXISTING — do not modify
├── serial.ts                       # EXTEND — add competition-scoped serial generator
├── actions/
│   ├── entries.ts                  # EXISTING — do not modify
│   ├── scores.ts                   # EXISTING — do not modify
│   ├── profile.ts                  # EXISTING — do not modify
│   ├── competitions.ts             # NEW — createCompetition, removeRegistrant, importCSV
│   ├── registration.ts             # NEW — createRegistration (transaction)
│   └── queue.ts                    # NEW — getQueueData (fetch for scheduler)
└── queue/
    ├── scheduler.ts                # NEW — pure scheduling function
    └── weightClass.ts              # NEW — pure weight class helper

components/
├── ui/                             # EXISTING — reuse as-is
│   ├── GlobalHeader.tsx
│   ├── BottomNav.tsx
│   └── ...
├── organizerdb/                    # NEW
│   ├── CompetitionForm.tsx         # 'use client' — creation form
│   ├── CompetitionSelector.tsx     # 'use client' — dropdown + new button
│   ├── AnalyticsBar.tsx            # Server component or client with props
│   ├── RegistrationsTable.tsx      # 'use client' — sortable/filterable + remove
│   ├── CsvImport.tsx               # 'use client' — file picker + preview
│   └── GenerateQueueModal.tsx      # 'use client' — start time input
├── queue/                          # NEW
│   ├── TimetableGrid.tsx           # Server component — pure render
│   └── ConflictPanel.tsx           # Server component — pure render
└── registration/                   # NEW
    └── RegistrationForm.tsx        # 'use client' — conditional event subfields

drizzle/
└── 0003_queue_system.sql           # NEW migration — competitions, registrants, registration_entries
```

### Structure Rationale

- **`app/organizerdb/` outside `(app)/`:** The `(app)` route group uses `app/(app)/layout.tsx`, which enforces auth and renders `GlobalHeader` + `BottomNav`. The organizer dashboard needs different layout behavior (no bottom nav, full-width desktop layout). Placing it outside `(app)` keeps the layout independent. Add its own `layout.tsx` for organizer-specific chrome when auth is wired in.
- **`app/registration/[compId]/` outside `(app)/`:** Registration is public — no auth guard, no bottom nav. Must be separate from the auth-guarded route group.
- **`lib/actions/` split by domain:** Existing actions (`entries.ts`, `scores.ts`) are not modified. New actions go in new files. This matches the existing pattern and prevents accidental breakage.
- **`lib/queue/` as a subdirectory:** The scheduler is a significant standalone unit with its own types. A subdirectory signals "this is a pure logic module" and makes it easy to unit test independently of the DB.
- **`lib/serial.ts` extension (not replacement):** The existing `generateSerial()` generates random 3-letter serials for score entries. The new `generateCompetitionSerial(competitionId, prefix)` is a different algorithm (prefix from competition name + sequential count). Add the new function to the same file rather than creating a parallel one — they share the collision-resistance concern.

## Architectural Patterns

### Pattern 1: Server Component Shell + Client Island

**What:** Page routes are server components that fetch required data and pass it as props to client components. The server component owns data fetching; the client component owns interactivity.

**When to use:** All new pages follow this pattern. Already established in the codebase (`app/judge/page.tsx` → `<JudgeSetupForm />`).

**Trade-offs:** Slightly more files than a single client page component, but avoids the `useEffect` data-fetching anti-pattern and keeps data fetching co-located with the route.

**Example:**
```typescript
// app/registration/[compId]/page.tsx
import { db } from '@/lib/db'
import { competitions } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { RegistrationForm } from '@/components/registration/RegistrationForm'

export default async function RegistrationPage({ params }: { params: Promise<{ compId: string }> }) {
  const { compId } = await params
  const comp = await db.select().from(competitions).where(eq(competitions.id, compId)).limit(1)
  if (!comp[0]) notFound()

  // Guard states checked here, passed as props
  const now = new Date().toISOString()
  const isClosed = comp[0].status !== 'open'
    || (comp[0].registrationDeadline && now > comp[0].registrationDeadline)

  return <RegistrationForm competition={comp[0]} isClosed={isClosed} />
}
```

### Pattern 2: Server Action for Transactional Writes

**What:** Multi-table writes (registrant + N entries + serial assignment) happen inside a single server action using a DB transaction. The action returns either a success payload (registrant id) for redirect, or an error string.

**When to use:** `createRegistration` — the critical path for registration. Serial numbers must be assigned atomically with entry creation; a partial write is a data integrity error.

**Trade-offs:** Turso/libSQL supports transactions via `db.transaction()` in Drizzle. Must verify this works with the `@libsql/client/http` transport (it does — HTTP client supports batch/transaction mode). The transaction ensures serial uniqueness is enforced at the DB level (UNIQUE constraint on `registration_entries.serial`).

**Example:**
```typescript
// lib/actions/registration.ts
'use server'
import { db } from '@/lib/db'
import { registrants, registrationEntries, competitions } from '@/lib/schema'
import { eq, count } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

export async function createRegistration(input: RegistrationInput): Promise<
  { registrantId: string; serials: { event: string; serial: string }[] } | { error: string }
> {
  // Validate input
  // Fetch competition to get serial_prefix and validate it's open
  // Generate serials: prefix + sequential count (count existing entries for this compId)
  // db.transaction(async (tx) => {
  //   insert registrant
  //   for each event: insert registration_entry with serial
  // })
  // Return registrant id + serial list for success page
}
```

### Pattern 3: Pure Scheduler Function

**What:** The scheduling algorithm lives entirely in `lib/queue/scheduler.ts` as a pure function. It receives a typed array of entries and returns a typed result. Zero DB calls, zero imports from `lib/db.ts`.

**When to use:** Called from the queue page server component (or a server action) after fetching all registrant data. The pure function boundary means it can be tested with fixture data without a DB, and it never accidentally creates N+1 query patterns.

**Trade-offs:** Data fetching and scheduling are separate steps — the server component/action must first fetch `RegistrationEntryWithRegistrant[]`, then call the pure scheduler. This is one extra step but makes both pieces independently testable and auditable.

**Example:**
```typescript
// lib/queue/scheduler.ts — signature only
export interface SchedulerInput {
  entries: RegistrationEntryWithRegistrant[]
  numPlatforms: number
  startTimeMinutes: number    // 540 = 9:00am
  blockDuration?: number      // default 10
  transitionDuration?: number // default 5
  minRestBlocks?: number      // default 2
}

export interface SchedulerOutput {
  timeBlocks: TimeBlock[]
  conflicts: Conflict[]
  estimatedFinishTime: number  // minutes since midnight
}

export function generateSchedule(input: SchedulerInput): SchedulerOutput {
  // Pure: sort entries → assign to blocks → detect conflicts
}
```

### Pattern 4: Query Params for Queue Page State

**What:** The queue page at `/organizerdb/queue` receives `compId` and `startTime` as URL query parameters. The organizer sets these in the `GenerateQueueModal` and is navigated to the queue URL. The page is a server component that reads them, fetches data, runs the scheduler, and renders.

**When to use:** Queue page only. Using query params (not POST body) means the queue URL is bookmarkable/shareable and can be printed — the browser's URL bar holds the state.

**Trade-offs:** `startTime` is a simple HH:MM string in the URL. The server component parses it to `startTimeMinutes`. If params are missing or invalid, redirect back to dashboard.

**Example:**
```typescript
// app/organizerdb/queue/page.tsx
interface QueuePageProps {
  searchParams: Promise<{ compId?: string; startTime?: string }>
}

export default async function QueuePage({ searchParams }: QueuePageProps) {
  const { compId, startTime } = await searchParams
  if (!compId || !startTime) redirect('/organizerdb')
  // fetch entries for compId, run generateSchedule(), render TimetableGrid
}
```

## Data Flow

### Registration Flow (Critical Path)

```
Athlete navigates to /registration/[compId]
    ↓
Server component fetches competition (open? deadline? full?)
    ↓ props: competition data, isClosed flag
RegistrationForm (Client Component)
    ├── Renders guard message if isClosed
    └── Athlete fills form, checks events, sets bell weights/duration
        ↓ form submit → server action
createRegistration (lib/actions/registration.ts)
    ├── Validate input (all required fields, at least one event)
    ├── Re-verify competition is still open (server-side re-check)
    ├── Fetch current entry count for competition_id (for serial numbering)
    └── db.transaction():
        ├── INSERT INTO registrants (...)
        └── for each event:
            └── INSERT INTO registration_entries (serial = prefix + padded count)
    ↓ returns { registrantId, serials[] }
redirect('/registration/[compId]/success?registrantId=...')
    ↓
Success page: fetch registrant + entries by registrantId, display serial table
```

### Competition Creation Flow

```
Organizer fills /organizerdb/create form
    ↓ CompetitionForm (Client) → server action on submit
createCompetition (lib/actions/competitions.ts)
    ├── Derive serial_prefix from competition name
    │   (e.g. "Girya Pilipinas Cup" → "GPC")
    ├── Serialize allowed_bell_weights as JSON string
    └── INSERT INTO competitions (...)
    ↓ redirect('/organizerdb')
    ↓ revalidatePath('/organizerdb')
Dashboard shows new competition in selector
```

### Queue Generation Flow

```
Organizer on /organizerdb (comp selected)
    ↓ clicks "Generate Queue"
GenerateQueueModal (Client) — renders start time input
    ↓ confirm → router.push('/organizerdb/queue?compId=...&startTime=...')

/organizerdb/queue (Server Component)
    ├── Parse compId + startTime from searchParams
    ├── Fetch competition.num_platforms
    ├── Fetch all registration_entries JOIN registrants WHERE competition_id = compId
    │   (status NOT 'scratched' or 'dns')
    ├── Call generateSchedule({ entries, numPlatforms, startTimeMinutes })
    └── Render: ConflictPanel (if conflicts) + TimetableGrid
```

### Organizer Dashboard Data Flow

```
/organizerdb (Server Component)
    ├── Fetch all competitions (for CompetitionSelector)
    ├── Selected compId from searchParams
    ├── Fetch registrants + entries WHERE competition_id = selectedCompId
    │   (for AnalyticsBar: count, per-event, gender split)
    ├── Pass registrants array to RegistrationsTable (Client)
    └── Render: selector + analytics + table + CSV import button + Generate Queue button

RegistrationsTable (Client Component)
    ├── Client-side sort/filter (no round-trip needed — data already in props)
    └── Remove action: calls removeRegistrant server action → revalidatePath
```

## New Tables and Integration With Existing Schema

The 3 new tables are entirely additive. No existing tables are modified.

```
EXISTING:                          NEW:
scores (score entries)             competitions
profiles (athlete profiles)        registrants → FK: competitions.id
                                   registration_entries → FK: registrants.id
                                                        → FK: competitions.id (redundant for query efficiency)
```

**Key integration notes:**

- `registration_entries.serial` uses a different format than `scores.serial`. Existing `scores.serial` is random (`XXX-NNNN` where XXX is random letters). New `registration_entries.serial` is `PREFIX-NNNN` where PREFIX is derived from the competition name and NNNN is sequential. These are in separate tables so there is no collision concern, but the serial format on screen looks identical — this is intentional (QUEUE_SPEC locked format).
- The existing `lib/serial.ts` `generateSerial()` function queries the `scores` table. The new competition serial generator queries `registration_entries`. Extend `lib/serial.ts` with a new exported function rather than reusing the existing one.
- No foreign key relationship between `registration_entries` and `scores`. They are parallel tracks: registration entries track who plans to compete; score entries (the existing `scores` table) track submitted video results. Future work may link them by serial number, but that is explicitly out of scope for this milestone.

## Build Order

Dependencies drive this ordering. Each step unblocks the next.

### Step 1: Schema Extension + Migration
**Deliverables:** 3 new tables in `lib/schema.ts`, migration file `drizzle/0003_queue_system.sql`

**Why first:** All other steps read or write to these tables. No UI can be built without the schema in place.

**Dependencies:** None (purely additive)

**Specific tasks:**
- Add `competitions`, `registrants`, `registration_entries` table definitions to `lib/schema.ts`
- Run `npx drizzle-kit generate` to produce the migration
- Apply migration to Turso dev DB

### Step 2: Pure Logic Layer
**Deliverables:** `lib/queue/weightClass.ts`, `lib/queue/scheduler.ts` (full implementation), extended `lib/serial.ts`

**Why second:** These are pure functions with no dependencies on routes, UI, or server actions. Writing them second means they can be tested immediately (manual or automated) before any UI exists. The scheduler is the most algorithmically complex piece — isolate and verify it early.

**Dependencies:** Schema types (Step 1 exports TypeScript types)

**Specific tasks:**
- `lib/queue/weightClass.ts` — `getWeightClass(gender: 'Male' | 'Female', bodyWeightKg: number): string`
- `lib/serial.ts` — `generateCompetitionSerial(prefix: string, existingCount: number): string` (pure, no DB call; caller fetches count before calling)
- `lib/queue/scheduler.ts` — full sort + assignment + conflict detection per QUEUE_SPEC

### Step 3: Server Actions
**Deliverables:** `lib/actions/competitions.ts`, `lib/actions/registration.ts`

**Why third:** Server actions are the data write layer. Building them before UI means the UI components can be wired up immediately and tested end-to-end.

**Dependencies:** Schema (Step 1), serial helper (Step 2)

**Specific tasks:**
- `createCompetition(input)` — derive prefix, serialize bell weights JSON, INSERT
- `removeRegistrant(registrantId)` — DELETE registrant + cascade entries (or explicit DELETE entries then registrant)
- `importCSV(formData)` — parse CSV rows, call createRegistration logic in a loop
- `createRegistration(input)` — transaction: INSERT registrant + N entries with serials

### Step 4: Competition Creation Route
**Deliverables:** `app/organizerdb/create/page.tsx`, `components/organizerdb/CompetitionForm.tsx`

**Why fourth:** A competition must exist before registration or the dashboard can be meaningfully tested. This is the entry point for the entire data dependency chain.

**Dependencies:** `createCompetition` action (Step 3)

**Specific tasks:**
- `CompetitionForm` client component — all fields per QUEUE_SPEC (checkboxes for bell weights, radios for duration/status)
- Server component page shell — renders form, handles post-submit redirect

### Step 5: Organizer Dashboard
**Deliverables:** `app/organizerdb/page.tsx`, `components/organizerdb/CompetitionSelector.tsx`, `components/organizerdb/AnalyticsBar.tsx`, `components/organizerdb/RegistrationsTable.tsx`, `components/organizerdb/CsvImport.tsx`, `components/organizerdb/GenerateQueueModal.tsx`

**Why fifth:** The dashboard orchestrates all organizer-facing data but depends on competitions existing (Step 4) and registration data flowing in (Step 6). Build the structure first; it will render empty state until registrations arrive.

**Dependencies:** Schema (Step 1), actions (Step 3), create form (Step 4)

**Specific tasks:**
- Server component fetches competitions list + selected comp registrations
- `RegistrationsTable` — sortable/filterable with remove action
- `CsvImport` — file picker that calls `importCSV` action
- `GenerateQueueModal` — start time input → `router.push` to queue URL

### Step 6: Public Registration Routes
**Deliverables:** `app/registration/[compId]/page.tsx`, `app/registration/[compId]/success/page.tsx`, `components/registration/RegistrationForm.tsx`

**Why sixth:** Logically registration comes before the dashboard is populated, but architecturally it depends on the schema (Step 1) and `createRegistration` action (Step 3), both of which are already done. The registration form is the most complex client component (conditional subfields per event, country dropdown). Building it after the dashboard means the dashboard is ready to display results as soon as the first registration lands.

**Dependencies:** Schema (Step 1), `createRegistration` action (Step 3)

**Specific tasks:**
- Guard states: not found → 404; not open → message; deadline passed → message; full → message
- Events section: checked event reveals bell weight dropdown + duration selector
- Bell weight options filtered from `competition.allowed_bell_weights` (JSON parsed)
- Success page: display serial table, "Register another athlete" button
- Country dropdown: static list, searchable (combobox from shadcn)

### Step 7: Queue / Timetable View
**Deliverables:** `app/organizerdb/queue/page.tsx`, `components/queue/TimetableGrid.tsx`, `components/queue/ConflictPanel.tsx`

**Why last:** Depends on everything: competitions (Step 4), registrations (Step 6), the scheduler (Step 2). Can only be meaningfully rendered with real data.

**Dependencies:** All previous steps

**Specific tasks:**
- Server component: parse `compId` + `startTime` query params, fetch entries with registrant join, call `generateSchedule()`
- `ConflictPanel` — list REST (red) and COACH (amber) conflicts
- `TimetableGrid` — time column + platform columns, cell content per QUEUE_SPEC, row tinted by event type
- Print CSS: `@media print { nav, button { display: none } }` — no JS needed for print hiding

## Integration Points With Existing Architecture

### What Is NOT Modified

| Existing File | Reason Unchanged |
|---------------|-----------------|
| `app/layout.tsx` | Root layout — project constraint, never modify |
| `proxy.ts` | Clerk middleware — project constraint, never modify |
| `app/(app)/layout.tsx` | Auth guard for athlete routes — new routes live outside this group |
| `lib/db.ts` | DB singleton — no changes needed |
| `lib/schema.ts` (existing tables) | Additive only — new tables appended, existing `scores` and `profiles` untouched |
| `lib/actions/entries.ts` | Existing athlete entry actions — no changes needed |
| `lib/actions/scores.ts` | Existing judge score actions — no changes needed |
| `components/ui/*` | Reuse as-is; new components use same shadcn primitives |
| `components/ui/GlobalHeader.tsx` | Reuse in organizerdb pages; `ROOT_PATHS` array should have `/organizerdb` added to suppress back arrow |

### What Is Extended

| Existing File | Extension |
|---------------|-----------|
| `lib/schema.ts` | Append 3 new table definitions after existing tables |
| `lib/serial.ts` | Add `generateCompetitionSerial` export; existing `generateSerial` unchanged |
| `components/ui/GlobalHeader.tsx` | Add `/organizerdb` to `ROOT_PATHS` array so the back chevron is suppressed on the dashboard root |
| `components/ui/BottomNav.tsx` | The COMPS tab (`locked: true`) already exists with `href: null` — wire it to `/registration/[compId]` or leave for a later milestone when athlete comp browsing is built |

### Auth Integration Point (R1 Compliance)

QUEUE_SPEC R1: "No authentication required on any new pages. Structure code so Clerk auth can be added later without rewriting."

The correct pattern for this: new page server components do NOT call `auth()` or `redirect('/sign-in')`. When auth is added later:

```typescript
// CURRENT (auth-free, per R1)
export default async function OrganizerDashboard() {
  // No auth check
}

// FUTURE (auth added without rewrite)
export default async function OrganizerDashboard() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  // rest unchanged
}
```

Server actions similarly omit the auth check now but structure so it can be added:

```typescript
// CURRENT
export async function createCompetition(input: CompetitionInput) {
  // No auth check (R1)
  // ...
}

// FUTURE
export async function createCompetition(input: CompetitionInput) {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }
  // rest unchanged
}
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1 competition | Current approach — no pagination needed on registrations table |
| 1–20 competitions | Add `competition_id` index on `registrants` and `registration_entries` (include from day one) |
| 20+ competitions | CompetitionSelector dropdown becomes unwieldy — add search/filter to selector |
| 500+ registrants per comp | Registrations table needs server-side pagination; currently client-side sort/filter is fine up to ~500 rows in props |

### Scaling Priorities

1. **First bottleneck:** Registrations table query — JOIN registrants + registration_entries for a large competition. Add indexes on `registration_entries.competition_id` and `registrants.competition_id` at migration time.
2. **Second bottleneck:** CSV import — a large CSV (200+ rows) imported in a single transaction could hit Turso's transaction size limits. Break into batches of 50 if needed.

## Anti-Patterns

### Anti-Pattern 1: Putting Serial Generation Inside the Client

**What people do:** Generate the serial on the client (e.g. in the registration form) to show a preview, then send it to the server.

**Why it's wrong:** QUEUE_SPEC explicitly locks this: "Assigned server-side in a DB transaction. Never client-side." Client-generated serials cannot guarantee uniqueness and can be spoofed. The sequential count must be read inside the same transaction that creates the entry.

**Do this instead:** Generate the serial inside `db.transaction()` in `createRegistration`. The count is read atomically within the transaction, guaranteeing no duplicate serials even under concurrent registration submissions.

### Anti-Pattern 2: DB Calls Inside the Scheduler

**What people do:** Pass `compId` to the scheduler and have it fetch entries internally.

**Why it's wrong:** QUEUE_SPEC R6 explicitly requires a pure function. DB calls inside a scheduler make it untestable without a real DB, couple algorithm correctness to DB state, and create hidden N+1 risks.

**Do this instead:** Fetch `RegistrationEntryWithRegistrant[]` in the calling server component/action, then pass the array to `generateSchedule()`.

### Anti-Pattern 3: Modifying (app) Route Group for Organizer Routes

**What people do:** Put `/organizerdb` inside `app/(app)/` to reuse the auth layout.

**Why it's wrong:** `app/(app)/layout.tsx` renders `GlobalHeader` + `BottomNav` — a mobile-first layout with bottom navigation. The organizer dashboard is desktop-first (QUEUE_SPEC R2) and needs a different layout. The auth guard also needs to be role-specific (organizer role, not any authenticated user) — this is a different check from what `(app)` currently does.

**Do this instead:** Place organizer routes at `app/organizerdb/` with its own `layout.tsx`. Reuse `GlobalHeader` without `BottomNav`. Add role check when auth is wired in.

### Anti-Pattern 4: Storing Weight Class in the Database

**What people do:** Add a `weight_class` column to `registration_entries` to avoid recalculating it.

**Why it's wrong:** QUEUE_SPEC explicitly states "Weight class derivation (display only, never stored)." Storing a derived value creates a consistency risk if `body_weight_kg` is ever updated, and adds unnecessary migration complexity.

**Do this instead:** Derive weight class in the scheduler and in the timetable renderer using `lib/queue/weightClass.ts`. It's a pure function called at render time.

### Anti-Pattern 5: Using the Existing `generateSerial()` for Competition Serials

**What people do:** Reuse `lib/serial.ts:generateSerial()` for registration entry serials.

**Why it's wrong:** The existing function (a) generates random 3-letter prefixes, (b) checks against the `scores` table for uniqueness, and (c) uses a random algorithm incompatible with the competition-scoped sequential requirement. Competition serials require a deterministic prefix derived from the competition name and a sequential number scoped per competition.

**Do this instead:** Add `generateCompetitionSerial(prefix: string, count: number): string` as a separate export. Keep the existing function untouched for backward compatibility.

## Sources

- `QUEUE_SPEC.md` — Full requirements brief, locked conventions (serial format, scheduling algorithm interface, table schemas)
- `.planning/PROJECT.md` — Milestone context, out-of-scope constraints
- `.claude/kova-decisions.md` — Locked technical decisions (server actions not API routes, Turso + Drizzle, Clerk auth patterns)
- `.claude/kova-patterns.md` — Established code patterns (serial format, YouTube embed sizing)
- Direct codebase reading: `lib/schema.ts`, `lib/db.ts`, `lib/serial.ts`, `lib/actions/entries.ts`, `lib/actions/scores.ts`, `lib/actions/profile.ts`, `app/(app)/layout.tsx`, `app/record/layout.tsx`, `app/judge/layout.tsx`, `components/ui/GlobalHeader.tsx`, `components/ui/BottomNav.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/leaderboard/page.tsx`
- `drizzle.config.ts` — Migration configuration (schema path, dialect, output directory)

---
*Architecture research for: Kova v2.0 Queue System — competition registration and scheduling*
*Researched: 2026-04-02*
