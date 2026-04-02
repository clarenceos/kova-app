# Stack Research

**Domain:** Sports competition PWA with canvas-based video recording
**Researched:** 2026-03-24 (v1.0), updated 2026-04-02 (v2.0 Queue System additions)
**Confidence:** MEDIUM — core stack decisions are HIGH; iOS Safari canvas/recording compatibility is actively evolving and some claims are MEDIUM due to divergent reports

---

## v2.0 Queue System: New Library Additions

This section documents additions needed for the competition registration and queue scheduling milestone only. The existing stack (Next.js, Clerk, Turso + Drizzle, shadcn/ui, Tailwind, Vercel) is unchanged.

### New Libraries Required

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@paralleldrive/cuid2` | ^2.2.2 | Collision-resistant ID generation | QUEUE_SPEC.md requires cuid2 for all new table PKs. `createId()` is the only API needed. 24-char IDs, not guessable. No runtime deps. Replaces any UUID approach — spec is explicit. |
| `papaparse` | ^5.5.3 | CSV parsing for organizer import | Spec requires CSV import on `/organizerdb`. PapaParse is the standard browser CSV parser — 5M weekly downloads, zero deps, handles malformed input gracefully. Parses client-side so no multipart/form-data upload to server needed. |
| `@types/papaparse` | ^5.3.x | TypeScript types for PapaParse | PapaParse ships without bundled types. Required for strict TypeScript. |
| `countries-list` | ^3.3.0 | ISO country data for registration form | Spec requires a searchable country dropdown. `countries-list` v3 is fully TypeScript + ESM, exports `countries` object keyed by ISO 3166-1 alpha-2. Build a static array at module level — no runtime cost. 3.3.0 released March 2026. |

### shadcn Components to Add (via CLI)

These are copied into the project via `npx shadcn add` — not npm packages.

| Component | Install Command | Purpose | Why |
|-----------|----------------|---------|-----|
| Calendar | `npx shadcn add calendar` | Date picker underlying primitive | Required by Date Picker. Built on react-day-picker v9 (shadcn updated June 2025). |
| Popover | `npx shadcn add popover` | Date picker trigger container | Calendar floats inside a Popover. Already may be installed — check `components/ui/popover.tsx` first. |
| Command | `npx shadcn add command` | Searchable dropdown primitive | Powers the Combobox pattern for country search. Uses built-in filtering — no cmdk dep in current shadcn. |
| Combobox | `npx shadcn add combobox` | Searchable select for country field | shadcn now ships a first-class Combobox component (not just a recipe). Uses Command + Popover internally. 200-country list requires type-to-filter UX — a plain `<select>` is unusable. |

**Note:** Run `ls components/ui/` first to confirm which components are already present from earlier phases. Re-running `npx shadcn add` on an existing component will overwrite it — safe but wasteful.

### react-day-picker (transitive, auto-installed)

`npx shadcn add calendar` will install `react-day-picker` as a dependency. Current shadcn uses **react-day-picker v9** (breaking change from v8 — shadcn migrated in June 2025). Do not install react-day-picker directly; let shadcn manage it.

---

## New Drizzle Schema Patterns

Three new tables as specified in QUEUE_SPEC.md. Key patterns for the existing Drizzle + libSQL setup:

### ID Generation with cuid2

```typescript
import { createId } from '@paralleldrive/cuid2'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const competitions = sqliteTable('competitions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  // ...
})
```

`$defaultFn` runs at insert time server-side. The spec says "Use cuid2 for all ids" — this is the idiomatic Drizzle pattern. Do NOT use `.$default()` (static) — use `.$defaultFn()` (function called per insert).

### JSON Array Column (allowed_bell_weights)

```typescript
allowedBellWeights: text('allowed_bell_weights', { mode: 'json' })
  .$type<string[]>()
  .notNull(),
```

SQLite has no array type. Drizzle's `text({ mode: 'json' })` stores as a JSON string and deserializes on read. `$type<string[]>()` provides TypeScript safety. This matches how `repTaps` is stored in the existing `scores` table (currently as plain `text` — the new tables should use `{ mode: 'json' }` for cleaner typing).

### Timestamp Convention

The existing schema uses `integer("created_at", { mode: "timestamp" })`. The QUEUE_SPEC.md specifies `text NOT NULL` for `created_at` fields (ISO date/datetime strings). **Follow the spec for the new tables** — the inconsistency is intentional (ISO strings are human-readable in Turso console, easier to compare for registration deadlines).

```typescript
createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
```

### Foreign Key Pattern (Drizzle + libSQL)

```typescript
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const registrants = sqliteTable('registrants', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  competitionId: text('competition_id').notNull().references(() => competitions.id),
  // ...
})
```

libSQL enforces foreign keys only if `PRAGMA foreign_keys = ON` is set. With `@libsql/client/http`, this pragma is not automatically set per connection. For v2.0, enforce referential integrity at the application layer (server actions) rather than relying on DB-level cascade. This is consistent with existing Kova patterns.

### Transaction Pattern for Serial Assignment

Serial numbers must be assigned in a transaction (count existing entries, increment, assign). Drizzle supports `db.transaction()` with libSQL HTTP:

```typescript
const result = await db.transaction(async (tx) => {
  // 1. Insert registrant
  const [registrant] = await tx.insert(registrants).values({...}).returning()

  // 2. Count existing entries for this competition to derive serial number
  const existingCount = await tx
    .select({ count: sql<number>`count(*)` })
    .from(registrationEntries)
    .where(eq(registrationEntries.competitionId, competitionId))

  // 3. Insert entries with assigned serials
  const serial = `${prefix}-${String(existingCount[0].count + 1).padStart(4, '0')}`
  await tx.insert(registrationEntries).values({ serial, registrantId: registrant.id, ... })

  return registrant
})
```

**Caveat:** libSQL HTTP `db.transaction()` uses Drizzle's transaction abstraction, not a raw SQL `BEGIN/COMMIT`. For simple sequential inserts (registrant then entries), the Drizzle batch API (`db.batch([...])`) is an alternative — batch operations run in an implicit transaction on libSQL. Either works for this use case; `db.transaction()` is more readable.

---

## CSV Import Architecture

The spec requires client-side CSV parsing sent to a server action.

**Pattern:**
1. `<input type="file" accept=".csv">` in a `'use client'` component
2. Parse in the browser with PapaParse: `Papa.parse(file, { header: true, skipEmptyLines: true })`
3. Pass the parsed array to a server action (JSON-serializable, no file upload needed)
4. Server action validates and bulk-inserts via Drizzle

This avoids multipart form data parsing on the server entirely. PapaParse runs synchronously on small files (<10k rows); for competition CSV imports this is always fast enough.

```typescript
// In a 'use client' component
import Papa from 'papaparse'

function handleFile(file: File) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      // results.data is typed as unknown[] — validate before sending
      importRegistrantsAction(results.data as CsvRow[])
    },
  })
}
```

---

## Date/Time Input Strategy

The spec has two datetime fields:
- **Date** (competition date) — date only, no time
- **Registration Deadline** — datetime with time (optional)

**Recommended approach:** Use the shadcn Calendar + Popover pattern for the date field (R3: follow existing Kova UI patterns). For the registration deadline datetime, use a native `<input type="datetime-local">` styled with Tailwind — it's simpler than composing a full datetime picker and is fine for a desktop-first organizer form.

```tsx
// Date-only field
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">{date ? format(date, 'PPP') : 'Pick a date'}</Button>
  </PopoverTrigger>
  <PopoverContent>
    <Calendar mode="single" selected={date} onSelect={setDate} />
  </PopoverContent>
</Popover>

// Datetime field (native, Tailwind-styled)
<input
  type="datetime-local"
  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
/>
```

`format()` from the standard `date-fns` library (already a peer dep of react-day-picker v9 — verify with `ls node_modules/date-fns` after installing calendar) can be used for display formatting. Do not install date-fns separately; it comes with react-day-picker.

---

## Country Dropdown Implementation

Build a static lookup array at module level using `countries-list`. This runs once at import time — no runtime cost.

```typescript
import { countries } from 'countries-list'

export const COUNTRY_OPTIONS = Object.entries(countries)
  .map(([code, data]) => ({ value: data.name, label: data.name, code }))
  .sort((a, b) => a.label.localeCompare(b.label))
```

Pass `COUNTRY_OPTIONS` to the shadcn Combobox. The Combobox's built-in Command filtering handles type-to-search. Store `data.name` (English country name string) in the DB — matches the `country: text NOT NULL` column spec. No need for ISO codes in the DB.

---

## Print CSS Strategy

The spec requires `/organizerdb/queue` to be print-friendly with nav and buttons hidden.

**Use Tailwind's built-in `print:` variant** — no additional library or CSS file needed.

```tsx
// Hide nav and action buttons on print
<nav className="print:hidden">...</nav>
<div className="print:hidden">
  <Button>Print / Export PDF</Button>
  <Button>Back to Dashboard</Button>
</div>

// Show only on print (e.g., a print-specific header)
<div className="hidden print:block">
  Generated: {timestamp}
</div>
```

Tailwind v4 (already installed) supports `print:` out of the box — no `tailwind.config.js` changes needed. The `@media print` variant is built into the default configuration.

For the timetable grid, use `break-inside-avoid` on each row to prevent table rows from splitting across pages.

---

## Recommended Stack (Existing — Do Not Change)

### Core Technologies (Already Chosen)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.1 | App framework | Already chosen. App Router is the correct choice — recording flow is entirely `'use client'` so no SSR conflict. Pages Router would also work but App Router is the current standard. |
| React | 19.2.4 | UI library | Already chosen. Concurrent rendering is irrelevant for the recorder (synchronous canvas loop), but no reason to change. |
| Clerk | ^7.0.6 | Auth + user metadata | Already chosen. `publicMetadata.name` pattern for athlete name avoids a users table. `auth()` server-side access works cleanly in Server Components and Server Actions. |
| Turso + Drizzle ORM | drizzle ^0.45.1, @libsql/client ^0.17.2 | Database | Already chosen. Correct for this use case — sqlite-compatible, edge-friendly, Vercel works without a VPN/connection proxy. |
| shadcn/ui (Nova/Radix) | shadcn ^4.1.0, radix-ui ^1.4.3 | UI components | Already chosen. Correct for a sports app needing accessible, unstyled-first primitives. |
| Tailwind CSS | ^4 | Styling | Already chosen. v4 with @tailwindcss/postcss is the current standard. |
| Vercel | — | Deployment | Already chosen. Native Next.js support. No extra config needed for the recording flow since it is entirely client-side. |

### PWA Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `app/manifest.ts` (Next.js built-in) | Next.js 16 built-in | Web app manifest | Next.js 16 generates `/manifest.json` from `app/manifest.ts`. No extra library. Use this over any third-party option for manifest generation. |
| Serwist | `@serwist/next` ^9.0.0, `serwist` latest | Service worker (offline caching, installability) | `next-pwa` (currently installed) is **abandoned** — last release December 2022, multiple open breaking-bug issues filed against Vercel's own Next.js docs. Serwist is the official successor and is referenced in Next.js 16 official docs under "Offline Support." |

**Important:** Serwist requires webpack. Next.js 16 defaults to Turbopack. Build scripts must use `next build --webpack` when PWA is needed. Development can use Turbopack (`next dev --turbopack`) but service worker will not be active during dev.

### Recording Layer (Browser APIs — No Libraries)

Per PROJECT.md constraint: native browser APIs only. This is the correct call.

| API | Purpose | Notes |
|-----|---------|-------|
| `navigator.mediaDevices.getUserMedia()` | Camera stream acquisition | Must be called inside a user gesture on first use. Re-use the stream across the recording session; do not call repeatedly. |
| `HTMLCanvasElement` + `requestAnimationFrame` | Overlay compositing | Draw camera frame + overlay text every rAF tick. Canvas must be the same resolution as the desired output (e.g., 1280×720). |
| `HTMLCanvasElement.captureStream(30)` | Convert canvas to MediaStream | 30 fps matches project spec. Pass the resulting stream directly to MediaRecorder. |
| `MediaRecorder` | Record the canvas stream | Use `isTypeSupported()` to select format — see container strategy below. |
| `AudioContext` + `OscillatorNode` | Beep sounds (minute marker, countdown) | Must resume AudioContext on first user gesture. iOS Safari blocks audio until user interaction. |
| `Blob` + `URL.createObjectURL()` | Export/download | Create an `<a>` element, set `href` to blob URL and `download` attribute, programmatically click. Works on both iOS Safari and Android Chrome. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next-pwa` | — | **DO NOT USE** — see "What NOT to Use" | — |
| `@serwist/next` | ^9.0.0 | Service worker plugin for Next.js | When adding offline caching and PWA installability |
| `serwist` | latest | Service worker runtime | Peer dep of `@serwist/next` |

---

## Browser Compatibility Matrix: Canvas Recording

This is the highest-risk area of the project. Research was conducted against official WebKit blog posts, MDN, and WebKit bug tracker.

| Browser / Platform | MediaRecorder | canvas.captureStream() | canvas → MediaRecorder video | Container |
|---|---|---|---|---|
| Chrome (Android) 49+ | YES | YES | YES — works reliably | WebM (VP8/VP9) |
| Chrome (desktop) 49+ | YES | YES | YES — works reliably | WebM (VP8/VP9) |
| Chrome (desktop) 130+ | YES | YES | YES | Also MP4/H264 |
| Firefox 29+ | YES | YES | YES | WebM (VP8/VP9) |
| Safari (macOS) 14.1+ | YES | YES (partial, bugs fixed ~2022) | MEDIUM — generally works | MP4/H264/AAC |
| Safari (iOS) 14.3–18.3 | YES (MP4 only) | Documented bugs (WebKit #181663, #229611, #252465) | UNRELIABLE — blank video, freeze on stop, black preview | MP4/H264/AAC |
| Safari (iOS) 18.4+ | YES | Not explicitly confirmed fixed | UNKNOWN — needs real-device testing | WebM (VP8/VP9) added in 18.4, MP4 still supported |

**Confidence: MEDIUM for iOS Safari.** Safari 18.4 (released March 31, 2025, ships with iOS 18.4) added WebM video support via MediaRecorder. The longstanding canvas.captureStream() bugs (WebKit #181663, #229611) were marked resolved in 2022, but WebKit bug #252465 (getUserMedia video element black screen in standalone PWA) still showed active reports through iOS 18.4.1 as of early 2026 per community reports. Real-device testing on iOS 18+ is **mandatory** before launch.

**Bottom line for Kova:** iOS 18.4+ is likely the minimum version for reliable canvas → MediaRecorder recording. Athletes on older iOS must be warned that recording may not work and advised to update. Chrome/Android is the reliable primary recording platform.

---

## Container Format Strategy

### The Problem

- **WebM** (VP8/VP9): Chrome/Firefox/Android native. iOS Safari pre-18.4 does not support WebM at all — neither recording nor playback in Safari.
- **MP4** (H264/AAC): iOS Safari's native format for MediaRecorder since iOS 14.3. Chrome added MP4 MediaRecorder support in Chrome 130+ (late 2024). Firefox does not support MP4 MediaRecorder.
- **WebM with Safari 18.4+**: Finally supported for recording, but canvas.captureStream() reliability is still uncertain.

### Recommended Approach

```typescript
function getSupportedMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',  // Safari fallback
    'video/mp4',
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''  // browser will choose — risky, log a warning
}
```

**What this means for the export file:**
- The project spec says export as `.webm`. This is correct for Chrome/Android.
- On Safari (iOS pre-18.4), the recorded container will be MP4 regardless of what you specify. The file will actually be an MP4 even if you name it `.webm` — this is a known Safari quirk (iOS 12 reports `video/webm` but produces `mp4[h.264/aac]`).
- **Decision required:** Either (a) export whatever the browser produces and name it appropriately, or (b) accept `.webm` for Chrome/Android and `.mp4` for iOS Safari, making the filename dynamic based on detected MIME type.
- Recommendation: Use dynamic filename. `kova-[discipline]-[name]-[serial].webm` on Chrome, `kova-[discipline]-[name]-[serial].mp4` on iOS Safari. Both are uploadable to YouTube.

---

## PWA Manifest Requirements

Next.js 16 handles this natively via `app/manifest.ts`. No third-party library needed.

**Minimum manifest for installability:**
```typescript
// app/manifest.ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kova',
    short_name: 'Kova',
    description: 'Kettlebell sport competition platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

**Camera permissions are NOT declared in the manifest.** They are requested at runtime via `getUserMedia()`. The manifest itself has no camera-related fields. PWAs require HTTPS for camera access (Vercel provides this automatically).

**iOS-specific notes:**
- iOS Safari does not show the automatic install prompt (`beforeinstallprompt` is not supported on iOS). Users must manually use Share > Add to Home Screen.
- `display: 'standalone'` is required for the standalone experience but it is this mode that has historically caused camera permission issues. Latest iOS (18.4+) appears to have improved but is not fully reliable.
- Camera permission is NOT persisted between sessions on iOS PWA standalone mode — users may be re-prompted on each launch.

---

## getUserMedia in Next.js App Router

**Rule:** All camera/canvas/MediaRecorder/AudioContext code must be in `'use client'` components. These are browser-only APIs that do not exist during SSR.

**Pattern for the recorder component:**

```typescript
'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

export function KovaRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)

  // Acquire camera only on explicit user action, not on mount
  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: 1280, height: 720 },
      audio: true,
    })
    streamRef.current = stream
    videoRef.current!.srcObject = stream
  }, [])

  // Stop all tracks on unmount — critical to release camera indicator light
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])
  // ...
}
```

**Key App Router constraints:**
1. Never call `getUserMedia()` at module level or in a Server Component.
2. `useEffect` with an empty dep array is safe for initialization, but prefer explicit user gesture triggers (button press) to avoid iOS permission prompt timing issues.
3. `dynamic(() => import('./KovaRecorder'), { ssr: false })` is the correct pattern to prevent SSR hydration errors if the component imports fail on the server.
4. Do NOT import `getUserMedia` or `AudioContext` at the top level of a file that might be imported by a Server Component — it will fail at build time.

---

## AudioContext Beep Sounds

**iOS Safari requires AudioContext to be created or resumed inside a user gesture handler.** The "start recording" button click is the correct place.

```typescript
// Create once on user gesture, reuse across the session
const audioCtxRef = useRef<AudioContext | null>(null)

function ensureAudioContext() {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtxRef.current.state === 'suspended') {
    audioCtxRef.current.resume()
  }
  return audioCtxRef.current
}

function beep(durationMs = 200, frequencyHz = 880) {
  const ctx = ensureAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = frequencyHz
  osc.start()
  osc.stop(ctx.currentTime + durationMs / 1000)
}
```

**Note:** iOS Safari with ringer on vibrate will not play Web Audio. This is a hardware-level OS decision, not a bug — no workaround exists.

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-pwa` (shadowwalker/next-pwa) | Abandoned since Dec 2022. Breaks with Next.js 15+. Filed as a bug against Vercel's own docs (next.js issue #43439). Already installed — remove it. | Serwist (`@serwist/next`) or Next.js built-in manifest only |
| `RecordRTC` | Large polyfill library that adds ~200KB. Project constraint is native APIs only. Also has known issues with canvas streams on Safari. | Native `MediaRecorder` |
| `opus-media-recorder` (WebAssembly polyfill) | WASM overhead, complex setup, not needed for video-first recording. Useful for audio-only cross-browser Opus, not this use case. | Native `MediaRecorder` with MIME type detection |
| `gif.js` or animated GIF export | Cannot carry audio. Enormous file sizes for 10-minute sets. | `MediaRecorder` even if iOS support is imperfect |
| `navigator.mediaDevices.getUserMedia` in Server Component | Throws at build time — window/navigator don't exist in Node.js | `'use client'` component only |
| Calling `getUserMedia` on every page render/mount | iOS re-prompts permission every time a new getUserMedia call is made | Acquire once, store in `useRef`, reuse |
| `OffscreenCanvas.captureStream()` | No browser supports this combination as of early 2026 | Regular `HTMLCanvasElement.captureStream()` |
| `react-select` for country dropdown | Large bundle (~60KB), brings its own design system that fights shadcn/Tailwind. R3 says no new UI libraries. | shadcn Combobox + `countries-list` data |
| `react-csv` or `csv-parser` | react-csv is for generating CSV (not parsing). csv-parser is Node.js streams — doesn't work browser-side. | `papaparse` client-side, pass parsed data to server action |
| `date-fns` as a direct dep | Already a transitive dep of react-day-picker v9. Installing separately risks version conflict. | Import from `date-fns` after verifying it's in node_modules post-shadcn install |
| `react-datepicker` | Brings its own CSS, fights Tailwind v4. R3 says follow existing Kova UI. | shadcn Calendar + Popover for date field; native `datetime-local` for datetime field |
| `uuid` for IDs | QUEUE_SPEC.md explicitly mandates cuid2. UUID v4 is technically fine but contradicts the spec. | `@paralleldrive/cuid2` `createId()` |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Serwist (`@serwist/next`) | Next.js manifest only (no service worker) | If offline support is not needed. For Kova the recorder needs to work without connectivity during recording. Use Serwist. |
| Next.js built-in `app/manifest.ts` | `next-pwa` manifest generation | Never use `next-pwa` — see above |
| Dynamic filename based on detected MIME type | Always export `.webm` | If you decide iOS support is out of scope for v1 — `.webm` always on Chrome/Android |
| `display: standalone` in manifest | `display: browser` | If iOS camera bugs are blocking — remove `apple-mobile-web-app-capable` and let users run in Safari tab. Loses installed-app feel but camera is more reliable. |
| shadcn Combobox + `countries-list` | Full country dropdown library (react-select-country-list, react-country-state-city) | If you need flag emoji display or state/city cascades — not needed for Kova v2.0 |
| PapaParse client-side parse + server action | Multipart file upload to server route | If CSV files are expected to be very large (>50MB). Not the case for competition rosters. |
| Native `datetime-local` input for deadline | shadcn Calendar + time picker composition | If time picker UX is important (it isn't for an optional organizer field). Native input is simpler and fully styled with Tailwind. |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `next-pwa` | ^5.6.0 | Next.js ≤14 | **Incompatible with Next.js 16.** Remove this package. |
| `@serwist/next` | ^9.0.0 (to install) | Next.js 13–16 | Requires `--webpack` flag for build. Dev can use Turbopack. |
| `@clerk/nextjs` | ^7.0.6 | Next.js 15/16 | Version 7 supports App Router. Check Clerk docs for breaking changes from v5→v6→v7. |
| `drizzle-orm` | ^0.45.1 | `@libsql/client` ^0.17 | Current stable pairing. No known compatibility issues. |
| `@paralleldrive/cuid2` | ^2.2.2 | No deps — works anywhere | Pure ESM. Works in both Server Components and client. |
| `papaparse` | ^5.5.3 | Browser + Node.js | Must be used in a `'use client'` component for File input. Node.js streaming mode available but not needed here. |
| `countries-list` | ^3.3.0 | ESM only | v3 is ESM-only. Next.js 16 App Router handles ESM natively — no transpilation needed. |
| `react-day-picker` | v9 (via shadcn) | React 19 | v9 required for React 19 compatibility. shadcn migrated to v9 in June 2025. Do not pin to v8. |

---

## Installation (v2.0 Queue System)

```bash
# New npm packages
npm install @paralleldrive/cuid2 papaparse countries-list
npm install -D @types/papaparse

# New shadcn components (check components/ui/ first for existing ones)
npx shadcn add calendar
npx shadcn add popover
npx shadcn add command
npx shadcn add combobox
```

---

## Sources

- [@paralleldrive/cuid2 GitHub](https://github.com/paralleldrive/cuid2) — `createId()` API, collision resistance characteristics — HIGH confidence
- [@paralleldrive/cuid2 npm (Socket.dev)](https://socket.dev/npm/package/@paralleldrive/cuid2/versions) — Current version 2.2.2, last updated Mar 2025 — HIGH confidence
- [PapaParse npm](https://www.npmjs.com/package/papaparse) — v5.5.3, 5M weekly downloads, zero deps — HIGH confidence
- [PapaParse official docs](https://www.papaparse.com/) — Browser API, `header: true` option, streaming for large files — HIGH confidence
- [countries-list GitHub (annexare/Countries)](https://github.com/annexare/Countries) — v3.3.0 released March 2026, TypeScript ESM exports, `countries` object structure — HIGH confidence
- [shadcn/ui Calendar docs](https://ui.shadcn.com/docs/components/radix/calendar) — Built on react-day-picker, `npx shadcn add calendar` — HIGH confidence
- [shadcn/ui Date Picker docs](https://ui.shadcn.com/docs/components/radix/date-picker) — Calendar + Popover composition — HIGH confidence
- [shadcn/ui Combobox docs](https://ui.shadcn.com/docs/components/radix/combobox) — First-class component, Popover + Command internals — HIGH confidence
- [shadcn Calendar June 2025 changelog](https://ui.shadcn.com/docs/changelog/2025-06-calendar) — Upgraded to latest react-day-picker (v9) — HIGH confidence
- [react-day-picker v9 upgrade discussion](https://github.com/gpbl/react-day-picker/discussions/2280) — Breaking changes from v8, React 19 compatibility — HIGH confidence
- [Drizzle ORM SQLite column types](https://orm.drizzle.team/docs/column-types/sqlite) — `text({ mode: 'json' }).$type<T>()` pattern — HIGH confidence
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) — `db.transaction(async tx => {...})` pattern — HIGH confidence
- [Drizzle Batch API](https://orm.drizzle.team/docs/batch-api) — libSQL implicit transaction in batch — HIGH confidence
- [Tailwind CSS print styles (jacobparis.com)](https://www.jacobparis.com/content/css-print-styles) — `print:hidden` / `print:block` utility classes in Tailwind v4 — MEDIUM confidence (unofficial but well-established pattern)
- [WebKit blog: MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/) — Safari 14.3+ iOS support, MP4/H264/AAC codec list — HIGH confidence
- [WebKit blog: Safari 18.4 features](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) — WebM MediaRecorder added in iOS 18.4 — HIGH confidence
- [Next.js official PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — Manifest setup, Serwist recommendation — HIGH confidence
- [Serwist getting started](https://serwist.pages.dev/docs/next/getting-started) — `@serwist/next` installation, webpack requirement — HIGH confidence

---

## Critical Open Questions for Phase-Specific Research

1. **Does canvas.captureStream() → MediaRecorder produce a valid video on iOS 18.4+ in practice?** No authoritative source confirmed this for 18.4 specifically. Needs real-device testing before building the recorder phase.

2. **Does the download blob (URL.createObjectURL + anchor click) work on iOS Safari for a recorded MP4 blob?** Standard technique, but iOS sometimes intercepts blob downloads. Needs verification.

3. **Does standalone PWA mode (Add to Home Screen) reliably provide camera access on iOS 18.4?** Bug #252465 is "fixed" but community reports say otherwise through late 2025. May need to ship with a warning recommending regular Safari tab instead of standalone mode for recording.

4. **Does Drizzle `db.transaction()` work correctly with `@libsql/client/http` for sequential insert + count + insert?** The batch API is a safe fallback if transactions behave unexpectedly. Verify in development before relying on it for serial assignment.

---

*Stack research for: Kova — kettlebell sport competition PWA with canvas video recording*
*v1.0 Researched: 2026-03-24*
*v2.0 Updated: 2026-04-02 — Queue System additions (cuid2, PapaParse, countries-list, shadcn Calendar/Combobox, print CSS, Drizzle patterns)*
