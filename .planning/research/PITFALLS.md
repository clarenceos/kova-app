# Pitfalls Research

**Domain:** PWA with canvas-based video recording, authenticated overlays, judge interface, competition management
**Researched:** 2026-03-24 (v1 recorder/judge); 2026-04-02 (v2.0 queue/registration milestone added)
**Confidence:** HIGH (authoritative sources: WebKit bug tracker, Can I Use, Next.js 16 local docs, Clerk docs, MDN, Drizzle ORM docs, Turso MVCC blog)

---

## v2.0 Queue System — Critical Pitfalls

These pitfalls are specific to adding competition registration, serial generation, scheduling, CSV import, and print layout to the existing Kova system.

---

### Pitfall 7: Serial Number Race Condition — Count-Then-Insert Is Not Atomic Over HTTP

**What goes wrong:**
The serial number format is `XXX-0000` where the number is "count of existing registration_entries for this competition_id, plus 1." Two athletes registering simultaneously will each count `N` entries, compute `N+1` as their serial, and both insert. One succeeds; the other hits the `UNIQUE` constraint on the `serial` column and the entire registration transaction fails with a cryptic DB error surfaced to the athlete as a generic "registration failed" screen.

At a real competition launch — when the organizer opens registration and 30 athletes click the link within seconds — this is not a hypothetical race. It is a near-certainty.

**Why it happens:**
The Turso/libSQL HTTP client (used by this project via `@libsql/client/http`) sends each statement as a separate HTTP request. Even `db.batch()` executes statements atomically within a single batch, but it cannot serialize a `SELECT COUNT(*) ... + INSERT` pair against concurrent requests: two batches submitted at the same millisecond will each read the same count from Turso's MVCC snapshot before either has committed. Turso's concurrent write detection catches write-write conflicts at the row level, not the "count predicate" level, so both transactions may proceed past the count step and collide only at the UNIQUE constraint insert.

The existing `generateSerial()` in `lib/serial.ts` uses a random approach (collision risk ~1 in 175M per pair). The new sequential approach dramatically increases collision probability under concurrent load.

**How to avoid:**
- Use `db.batch()` to atomically execute the count and insert in one network round-trip:
  ```ts
  const [countResult, insertResult] = await db.batch([
    db.select({ n: count() }).from(registrationEntries)
      .where(eq(registrationEntries.competitionId, compId)),
    db.insert(registrationEntries).values({ ...entry, serial: PLACEHOLDER })
  ])
  ```
  This does NOT solve the race — `db.batch()` is atomic (all-or-nothing) but the count snapshot can still be stale.
- The correct prevention is a `UNIQUE` constraint on `serial` (already in the spec: `serial: text NOT NULL UNIQUE`) combined with a **retry loop**: catch the unique constraint violation, recount, and reinsert. Max 3 retries before returning a user-visible error.
- Alternatively: generate a CUID2 suffix instead of a sequential counter and just ensure uniqueness within the competition by using `serial_prefix + '-' + cuid2().slice(0,4).toUpperCase()`. This trades human-readable sequential numbers for collision-resistance. The spec says sequential, so use the retry approach.
- Keep the UNIQUE constraint as the final safety net regardless of the generation strategy. Without it, duplicate serials are possible and the authentication model breaks.

**Warning signs:**
- Registration tests pass in isolation but fail under `ab -c 20 -n 100` load
- DB error logs show `UNIQUE constraint failed: registration_entries.serial`
- Two athletes arrive at the success page with the same serial number

**Phase to address:** Phase 1 (Registration & Serial Assignment) — the retry wrapper and UNIQUE constraint must be in place before any public registration link is shared

---

### Pitfall 8: Drizzle Migration Journal Out of Sync With Production Schema

**What goes wrong:**
The project's `drizzle/meta/_journal.json` currently records only one entry (`0000_strong_punisher`) despite three migration files existing (`0000`, `0001`, `0002`). This means `drizzle-kit migrate` believes the database is at the initial state and will attempt to replay migrations that have already been applied, throwing "table already exists" errors for `scores` and `profiles`.

Running `drizzle-kit push` against production directly to "just add the new tables" corrupts the migration journal: it applies schema changes without recording them as migration files, so future `generate` runs produce diffs that include already-applied changes.

**Why it happens:**
The journal was not updated when `0001` and `0002` were applied (they were likely applied manually via `drizzle-kit push` rather than through the `migrate` runner). Drizzle's migration runner uses the journal file exclusively to determine what has been applied — it does not introspect the live database schema. When journal and reality diverge, the runner is blind.

**How to avoid:**
- Before generating new migrations, run `drizzle-kit pull` to introspect the current production schema and verify the journal matches live state
- Add the three new tables by editing `lib/schema.ts` and running `drizzle-kit generate` — do NOT manually write SQL or run `drizzle-kit push` to production
- The generated migration file for the new tables will contain only `CREATE TABLE` statements for the three new tables (competitions, registrants, registration_entries), which is safe to apply to the live DB
- Update `drizzle/meta/_journal.json` to reflect the current applied state before generating: add entries for `0001_phase5_columns` and `0002_profiles` with their actual timestamps so the generator knows the correct baseline
- Verify the generated SQL contains only the three new tables before applying to production

**Warning signs:**
- `drizzle-kit generate` produces a migration that includes `CREATE TABLE scores` or `CREATE TABLE profiles` (tables that already exist)
- `drizzle-kit migrate` throws "table already exists" on first run against production
- The journal file has only one entry but the `drizzle/` directory has three SQL files

**Phase to address:** Phase 0 / pre-work — fix the journal before writing any schema changes; this is the first task of the milestone

---

### Pitfall 9: Biathlon/Triathlon Athletes Collide With Themselves in the Scheduler

**What goes wrong:**
An athlete doing "Biathlon" (Jerk + Snatch) has two entries in `registration_entries`. The greedy sequential scheduler fills platforms from a flat sorted list. After sorting by event group (LC → Jerk → Snatch), Jerk entries are scheduled first, then Snatch entries. If an athlete has both, they appear in block N (Jerk) and block N+2 (Snatch) — which satisfies the minimum rest gap of 2 blocks. But if the competition has few platforms and many Snatch entries stacked immediately after Jerk, that athlete may land in blocks N and N+1, triggering a RED REST conflict for themselves with only a 1-block gap.

The scheduler spec says "flag rest conflicts" — it does not say "prevent" them. The conflict panel shows a warning and the organizer can proceed. This is the correct behavior. The pitfall is implementing the conflict detection incorrectly.

**Why it happens:**
Developers implementing the conflict check group entries by `registrant.id` and check `block2 - block1 <= minRestBlocks`. If `minRestBlocks` defaults to 2 and the gap is exactly 2 (blocks 3 and 5), the check `5 - 3 <= 2` evaluates to `true` and incorrectly flags a conflict. The spec says "same athlete in two blocks where `block2 - block1 <= minRestBlocks`" — the boundary condition matters: is a gap of exactly `minRestBlocks` a conflict or not?

A gap of exactly `minRestBlocks` blocks means the athlete lifts in block N and block N+2. Between those blocks is block N+1, which is one full set (~15 minutes with transition). That is the minimum acceptable rest. Flagging this as a conflict is wrong; the flag should fire when `block2 - block1 < minRestBlocks`, not `<=`.

**How to avoid:**
- Use strictly-less-than: `block2 - block1 < minRestBlocks` for the rest conflict check
- Write unit tests for the scheduler pure function before integrating it:
  - Athlete in blocks [1, 3] with `minRestBlocks=2` → no conflict
  - Athlete in blocks [1, 2] with `minRestBlocks=2` → RED REST conflict
  - Athlete in blocks [1, 4] with `minRestBlocks=2` → no conflict
  - Single-entry athlete → no conflict (needs guard for `entries.length < 2`)
- The coach conflict check is separate: if a person's name appears as both an athlete in one block and as another registrant's `coach` value in an overlapping block, flag AMBER. "Overlapping" means same block number exactly — the coach cannot be in two places at the same time.

**Warning signs:**
- Biathlon athletes always appear in the conflict panel even with generous rest gaps
- A competition with 20 athletes and 3 platforms shows 15 REST conflicts (over-detection)
- The scheduler flags an athlete in blocks 1 and 4 as a conflict with `minRestBlocks=2`

**Phase to address:** Phase 2 (Scheduler Algorithm) — write the pure function with its unit tests before connecting it to any UI; confirm boundary conditions with a test suite before integration

---

### Pitfall 10: Coach Conflict Detection Uses String Equality on a Free-Text Field

**What goes wrong:**
The coach conflict detection cross-references `registrant.coach` (a free-text field) against `registrant.last_name + first_name` or similar. If a coach registers as "Sergei Merkulin" but athletes list their coach as "S. Merkulin" or "Merkulin", the conflict is missed. Conversely, two unrelated people who share a common surname and are listed as coaches will generate false AMBER warnings.

**Why it happens:**
The spec says "cross-reference `registrant.coach` field — if a name appears as both athlete and listed coach, check if they share any block." This is an exact string match problem on user-entered text with no normalization. Athletes enter their coach's name when registering; that name must exactly match another registrant's name for the conflict to fire.

**How to avoid:**
- Normalize both sides to lowercase trimmed before comparison: `coach.toLowerCase().trim()` vs. `${registrant.lastName} ${registrant.firstName}`.toLowerCase().trim()`
- Also check the reverse: `${registrant.firstName} ${registrant.lastName}`.toLowerCase().trim()`
- Document clearly in the UI helper text: "Enter your coach's full name exactly as it appears on their registration." This is the organizer's responsibility to enforce; the system provides best-effort detection only
- Frame coach conflicts as "soft warnings" not errors — the organizer knows their athletes; false positives are better than false negatives here
- Do NOT attempt fuzzy matching or Levenshtein distance — the complexity is not warranted for a soft-warning feature

**Warning signs:**
- Organizer manually identifies a coach conflict that the system missed
- Well-known coaches generate AMBER warnings for athletes they did not coach

**Phase to address:** Phase 2 (Scheduler Algorithm) — normalization logic belongs in the pure scheduler function; add a unit test with intentional case/spacing variations

---

### Pitfall 11: CSV Import Fails Silently on Excel-Generated Files

**What goes wrong:**
The organizer exports a registrant list from Excel and imports it into the dashboard. The import appears to succeed (no error message) but the first registrant's last name comes back as `"\uFEFFDoe"` — invisible in the UI but wrong in the database. All serial numbers assigned to that registrant carry the corrupted name. The timetable PDF shows correct names in the UI preview but prints a garbage character before the first letter of every first-row entry.

Three separate issues arise with Excel CSV exports:
1. Excel saves UTF-8 CSVs with a BOM (U+FEFF) prepended. The BOM attaches to the first header cell value. If parsed naively, the header column is named `"\uFEFFLast Name"` not `"Last Name"` — so the parser cannot find the column and treats every row as having no last name.
2. Excel uses Windows-1252 encoding by default when "Save As CSV (Comma delimited)" is selected on Windows. Non-ASCII characters (e.g., athlete names with accents: "Müller", "Jiménez") become corrupted byte sequences when parsed as UTF-8.
3. Excel uses `\r\n` line endings (CRLF). Most parsers handle this but PapaParse in Node.js environment has historically misidentified MIME type `application/vnd.ms-excel` (what Windows assigns to `.csv` files) and triggered FileReaderSync errors.

**Why it happens:**
The import path uses a `<input type="file">` + server action. The file is read as text in the browser (using FileReader or the File.text() API) before being sent to the server action as a string. This means:
- Browser `File.text()` uses the file's declared encoding or defaults to UTF-8. Windows-1252 encoded files will have their high-byte characters corrupted at the browser read step, before the server action even receives them.
- BOM detection requires explicitly stripping U+FEFF from the start of the string before parsing.

**How to avoid:**
- Use `file.text()` in the client component to get the raw string, then strip BOM before sending to the server action: `text.replace(/^\uFEFF/, '')`
- When parsing with PapaParse (or equivalent), set `skipEmptyLines: true` and `header: true`
- After parsing, validate that expected headers exist before processing rows: check for presence of `'Last Name'`, `'First Name'`, `'Gender'`, etc.
- Return a structured import summary with per-row errors, not a single pass/fail: `{ imported: 45, skipped: 3, errors: [{ row: 12, reason: 'Missing bell weight' }] }`
- Do NOT silently skip malformed rows — show the organizer which rows failed and why, so they can fix the source file
- For the Windows-1252 encoding problem: document that the template CSV provided for download from the dashboard is UTF-8, and athletes importing from Excel should "Save As CSV UTF-8 (Comma delimited)" not "CSV (Comma delimited)"

**Warning signs:**
- First athlete's name has a weird leading character
- Column headers are not recognized after import (`"undefined"` in parsed rows)
- Athletes with accented names appear with `?` or mojibake characters

**Phase to address:** Phase 3 (Organizer Dashboard + CSV Import) — strip BOM and validate headers before any row processing; build the import summary UI before testing with real Excel files

---

### Pitfall 12: Conditional Form Fields Retain Stale Values on Submit

**What goes wrong:**
The registration form shows a "Bell Weight" dropdown and "Duration" selector for each event the athlete checks. If an athlete checks LC, selects "2x24" and "10 min", then unchecks LC, the LC fields visually disappear. On submit, the form includes the stale values for LC (`bell_weight: "2x24"`, `duration: 10`) in the submitted data. The server action creates an LC entry the athlete did not intend to register for, assigns a serial, and the organizer's dashboard shows them in a third event.

This is the `shouldUnregister` problem in React Hook Form (RHF). The default behavior (`shouldUnregister: false`) retains field values in the form state even when the field is unmounted from the DOM.

**Why it happens:**
RHF's default `shouldUnregister: false` means that when a conditional field (e.g., the LC bell-weight row) is hidden via conditional rendering, its registered value remains in `getValues()` and is submitted. The checkbox state controls visibility only, not the form data.

Setting `shouldUnregister: true` fixes this in theory, but introduces known bugs in RHF: stale values can appear in edge cases (issue #4950, issue #12697 — active as of early 2026) and validation does not always trigger correctly on re-mount. Using `shouldUnregister: true` globally also breaks the `defaultValues` merge on reset, which is needed if the form needs to be pre-filled.

**How to avoid:**
- Keep `shouldUnregister: false` (the default) and manually call `unregister` when an event is unchecked:
  ```ts
  const handleEventToggle = (event: string, checked: boolean) => {
    if (!checked) {
      unregister(`entries.${event}.bellWeight`)
      unregister(`entries.${event}.duration`)
    }
    // update events array
  }
  ```
- On the server action, additionally validate that submitted event entries match the checked events array in the same submission body — treat the `events` checkbox array as the source of truth and ignore any `entries` data for unchecked events
- This server-side validation is the critical safety net even if the client-side unregister works

**Warning signs:**
- Athlete registers for one event but dashboard shows them in two
- Console log of form values on submit shows keys for unchecked events
- Unchecking an event and immediately resubmitting includes the previously entered values

**Phase to address:** Phase 1 (Registration Form) — handle unregister in the event toggle handler from the start; do not add it as a patch after discovering duplicate entries in the dashboard

---

### Pitfall 13: Print CSS Fights the Existing Mobile-First Tailwind Layout

**What goes wrong:**
The timetable page uses Tailwind utility classes tuned for the desktop layout (`full-width`, flex rows, `overflow-x-auto` on the table). When the organizer prints, the browser renders the print version at a narrow paper width. The `overflow-x-auto` table scrolls in the browser but overflows the printed page — columns are cut off at the right margin. The nav bar and "Generate Queue" button print on every page. Conflict-colored pills lose their background colors because browsers suppress background colors by default in print.

**Why it happens:**
Tailwind's `print:` modifier is available in Tailwind v4 with no configuration needed. But developers often forget three things:
1. `print:hidden` must be applied to every UI element that should not print (nav, buttons, modals, conflict panel controls)
2. Table `overflow-x-auto` scrollbars do not exist in print — the table must be `width: 100%` with word-wrap or column shrinking in print
3. Background colors are suppressed by default in browsers unless `-webkit-print-color-adjust: exact; print-color-adjust: exact` is set on elements that use colored backgrounds (event-type row tints, conflict pills)

**How to avoid:**
- Apply `print:hidden` to: global nav, "Back to Dashboard" button, "Print/Export PDF" button, the conflict panel's interactive controls (the conflict table itself should print, the "dismiss" actions should not)
- Add a `print:` variant to the table container to remove `overflow-x-auto` and use `print:w-full print:table-fixed`
- Add `[print-color-adjust:exact]` (Tailwind arbitrary value) to cells that use event-type background tints and conflict pills: `[print-color-adjust:exact] print:bg-red-100`
- Add a `@media print` CSS block in `globals.css` as a safety net for anything not expressible in Tailwind utilities:
  ```css
  @media print {
    .timetable-row { break-inside: avoid; }
    .conflict-panel { break-before: page; }
  }
  ```
- Test by using the browser's built-in print preview (`Cmd+P`) at A4 paper size — do this before calling any print feature "done"

**Warning signs:**
- Nav bar appears on every printed page
- Timetable is cut off after column 3 in print preview
- Event-type colored rows print as white (background colors stripped)
- Conflict pills are invisible in print

**Phase to address:** Phase 3 (Timetable/Queue View) — apply print styles during initial timetable implementation; retrofitting print CSS onto a complex layout is significantly harder than designing it in from the start

---

### Pitfall 14: searchParams on the Queue Page Are Server-Side Only — Do Not Reach Client Components

**What goes wrong:**
The timetable page at `/organizerdb/queue` receives `compId` and `startTime` as URL query parameters. The page component is a Server Component that passes these to a `<TimetableView>` Client Component. Inside `TimetableView`, a developer uses `useSearchParams()` to re-read the params. In the App Router, `useSearchParams()` suspends until the params are available, which requires wrapping in `<Suspense>`. Without the Suspense boundary, Next.js throws a hydration error during the timetable render.

Alternatively: the developer tries to access `searchParams` in a Layout component (e.g., the `/organizerdb` layout). Layout components in the App Router do NOT receive `searchParams` as a prop — only Page components do. Any logic that reads `compId` from `searchParams` in a Layout will silently get `undefined`.

**Why it happens:**
Next.js App Router separates Server Component props (`searchParams` available on `page.tsx`) from Client Component hooks (`useSearchParams()` requires Suspense). The docs note this explicitly but it is easy to miss when the timetable page is built as a mix of server-fetched data and client-side rendering.

**How to avoid:**
- Read `compId` and `startTime` from `searchParams` in the Server Component `page.tsx` only
- Pass them as props to Client Components — do not re-read in Client Components with `useSearchParams()` unless you add a `<Suspense>` boundary
- For the timetable page, the scheduling computation should happen in the Server Component (fetch registrations from DB, run the pure scheduler function, pass `timeBlocks` and `conflicts` as props to the Client Component that renders the table)
- Never read `searchParams` in any Layout component — layouts do not receive them

**Warning signs:**
- Timetable page throws "Missing Suspense boundary" hydration error in production
- `compId` is undefined in the organizer dashboard layout
- Query params work in development but break in production (different rendering behavior)

**Phase to address:** Phase 2 (Timetable/Queue View) — establish the data flow pattern (Server Component reads params → runs scheduler → passes results to Client Component) before building the table UI

---

### Pitfall 15: Partial Registration Insert Leaves Orphan Registrant Row

**What goes wrong:**
Registration creates one row in `registrants` and N rows in `registration_entries`. If the registrant insert succeeds but an entries insert fails (e.g., due to a serial number collision), the registrant row remains in the database without any entries. The organizer's dashboard shows an athlete with no events. The athlete sees a generic error and tries again, creating a second registrant row (or hitting a name uniqueness issue if one is added).

The inverse is also possible: if the registrant row insert fails mid-way through a multiple-event registration (e.g., after one of three entry inserts has committed), the DB has entries without a registrant — foreign key dangling (though SQLite enforces FK constraints only if `PRAGMA foreign_keys = ON` is set, which libSQL does not guarantee by default).

**Why it happens:**
The registration server action must write to two tables atomically. Using sequential `await db.insert()` calls without wrapping them in `db.batch()` or `db.transaction()` means any failure after the first successful insert leaves the database in a partial state.

`db.transaction()` with Drizzle over the Turso HTTP client may not behave as expected: each `execute()` call within a transaction is still an HTTP request, and the HTTP protocol does not support stateful transaction management (`BEGIN`/`COMMIT` over HTTP fails with "cannot commit — no transaction is active" as documented in drizzle-kit issue #5489).

`db.batch()` is the correct tool here: it sends all statements in a single HTTP call with atomic execution. Drizzle's batch API for libSQL guarantees all-or-nothing semantics.

**How to avoid:**
- Use `db.batch()` to atomically insert the registrant and all N entries:
  ```ts
  await db.batch([
    db.insert(registrants).values({ id: registrantId, ...registrantData }),
    db.insert(registrationEntries).values({ id: entry1Id, ...entry1 }),
    db.insert(registrationEntries).values({ id: entry2Id, ...entry2 }),
  ])
  ```
- Generate all IDs and serial numbers (with collision check) before calling `db.batch()` — the batch cannot include a SELECT that feeds into a subsequent INSERT within the same batch for serial generation
- If the batch fails, the entire registration is rolled back and no rows are created — return the error to the user and let them retry
- Note: `db.transaction()` with the HTTP client is unreliable for this purpose; use `db.batch()` instead

**Warning signs:**
- Dashboard shows registrants with zero events
- An athlete contacts the organizer saying they "submitted twice" after an error
- `registration_entries` rows with `registrant_id` pointing to a deleted registrant

**Phase to address:** Phase 1 (Registration Server Action) — use `db.batch()` for the combined registrant + entries insert from day one; never chain sequential inserts for multi-table writes

---

## Critical Pitfalls (Phase 1 — Recorder & Judge, from original research)

### Pitfall 1: canvas.captureStream() Is Not Supported on iOS Safari

**What goes wrong:**
The entire recording pipeline — `getUserMedia → draw to canvas → canvas.captureStream(30) → MediaRecorder` — silently fails on iOS Safari. `canvas.captureStream()` returns `null` or throws on iOS, so `MediaRecorder` never receives a valid stream. The athlete sees the camera preview but gets no recorded file, or a blank/empty file, on any iPhone or iPad.

**Why it happens:**
Can I Use (confirmed March 2026) lists iOS Safari as "not supported" for the Media Capture from DOM Elements API (`canvas.captureStream`). This is not a bug pending fix — it is an unimplemented API in WebKit on iOS across all tested versions through iOS 26.4. WebKit bug 181663 (canvas captureStream) has been open for years. Developers assume Safari's MediaRecorder support means the full pipeline works; it does not.

**How to avoid:**
- Call `canvas.captureStream` inside a `try/catch` and check for `null` before constructing `MediaRecorder`
- Add a browser capability check on recorder component mount: `if (!HTMLCanvasElement.prototype.captureStream) { showIOSUnsupportedMessage() }`
- Display a clear "iOS is not supported for recording" message with a fallback: direct the athlete to use Chrome on Android or a desktop browser
- Do not attempt silent degradation — the Kova authentication model (baked overlays) cannot be compromised, so a fake recording is worse than no recording
- Document iOS as explicitly unsupported for the recorder in Phase 1, and track WebKit progress for a potential Phase N iOS solution

**Warning signs:**
- Canvas preview works but exported file is blank or zero-length
- `MediaRecorder.state` never reaches `"recording"` on iOS
- `ondataavailable` fires but `event.data.size === 0`

**Phase to address:** Phase 1 (Athlete Video Recorder) — add capability detection and clear messaging before any recording UI is shown

---

### Pitfall 2: iOS PWA Standalone Mode Breaks Camera Permissions

**What goes wrong:**
When Kova is installed as a PWA (Add to Home Screen), iOS Safari does not persist camera permissions between sessions. The athlete must re-grant camera access every time they open the app. On some iOS versions, the permission prompt re-fires on every route change that triggers a URL hash change (WebKit bug 215884). The "Install to Home Screen" affordance that improves the PWA experience actively worsens the camera permission experience.

**Why it happens:**
WebKit's standalone PWA mode (triggered by `apple-mobile-web-app-capable`) runs outside Safari's permission persistence model. Permissions granted in standalone mode are not saved per-origin the way Safari browser permissions are. Bug 215884 remains open as of April 2025.

**How to avoid:**
- Do not include `apple-mobile-web-app-capable` meta tag in Phase 1 if iOS recording support is intended — this forces the app to run in Safari where permissions persist, while still allowing a Home Screen bookmark
- Use a single-page recording route without hash-based navigation to minimize re-prompts
- Add a `visibilitychange` listener to gracefully re-request `getUserMedia` when the app returns from background: `document.addEventListener('visibilitychange', () => { if (!document.hidden) reacquireStream() })`
- Show a contextual permission UI (not the browser's native prompt) that explains why camera access is needed before calling `getUserMedia`

**Warning signs:**
- Camera works in desktop Chrome but shows repeated permission dialogs on iOS Home Screen
- Camera stream becomes a frozen frame after the athlete backgrounds the app briefly
- `getUserMedia` throws `NotAllowedError` on subsequent calls within the same session

**Phase to address:** Phase 1 (Athlete Video Recorder) — PWA manifest and permission UX must be designed with iOS limitations in mind from the start

---

### Pitfall 3: WebM Recordings Have No Duration Metadata and Cannot Seek

**What goes wrong:**
`MediaRecorder` with `video/webm` mimeType produces files where the duration field in the container is missing or set to `Infinity`. The exported WebM file plays from start to finish fine, but scrubbing/seeking is broken in most media players and especially in the YouTube review step. `<video>` elements cannot display a correct progress bar. The 10-minute set recording looks broken to athletes reviewing their export.

**Why it happens:**
WebM's Matroska container requires duration metadata at the start of the file. MediaRecorder writes chunks incrementally and does not go back to fill in the duration header when recording stops. This is a known, unfixed limitation of the MediaRecorder spec for live recordings.

**How to avoid:**
- Use the `webm-fix-duration` npm package (TypeScript fork: `mat-sz/webm-fix-duration`) to post-process the Blob before offering the download. It appends the missing duration/seek metadata in-browser with no server round-trip
- Keep `timeslice` calls to `MediaRecorder.start(1000)` (1-second chunks) so chunk data is available to calculate duration
- Track elapsed recording time independently via `Date.now()` and pass it to the fix library's duration parameter

**Warning signs:**
- Exported WebM shows `duration: Infinity` in `video.duration`
- Athlete cannot seek backwards during in-app playback review
- YouTube upload shows correct file size but wrong video length

**Phase to address:** Phase 1 (Athlete Video Recorder) — apply duration fix in the export/download step before the file is offered to the athlete

---

### Pitfall 4: Screen Dims / Locks During a 10-Minute Recording Set

**What goes wrong:**
iOS and Android will dim the screen and eventually lock the device if no touch input occurs. A kettlebell athlete recording a 10-minute set provides no touch input after pressing Start. When the screen locks, the browser tab is backgrounded. On Chrome for Android, the canvas `requestAnimationFrame` loop is throttled to near-zero fps. The overlay frames stop being drawn, `captureStream` stops pushing frames, and `MediaRecorder` may output an audio-only or frozen-frame video for the last several minutes of the set.

**Why it happens:**
`requestAnimationFrame` is tied to the display refresh. Browsers throttle it to ~1fps or stop it entirely for backgrounded tabs (Firefox bug 1344524 documents this). No touch events occur during a competition set, so OS screen-lock timers fire normally.

**How to avoid:**
- Request the Screen Wake Lock API immediately when recording starts: `const lock = await navigator.wakeLock.request('screen')`
- Handle the case where wake lock is released automatically (e.g., when the user switches apps): listen for `lock.addEventListener('release', ...)` and show a prominent in-app warning: "Screen lock detected — recording may be affected"
- Note: Wake Lock API has been fully supported in Safari since iOS 16.4, but had a bug in installed PWA mode until iOS 18.4. Test in both Safari browser mode and PWA standalone mode
- As a fallback, play a silent audio track via `AudioContext` to prevent some browsers from aggressively throttling the tab (this is a last resort and may not be needed in 2026)

**Warning signs:**
- Test recordings made with the phone screen locked show a still frame or audio-only portion
- `document.visibilityState === 'hidden'` fires during what should be an active recording
- `wakeLock.request()` rejects on older iOS devices

**Phase to address:** Phase 1 (Athlete Video Recorder) — Wake Lock must be in the initial recording implementation, not added later as an afterthought

---

### Pitfall 5: Next.js 16 Uses `proxy.ts`, Not `middleware.ts` — Clerk Integration Must Match

**What goes wrong:**
Training data and most tutorials show Clerk integrated via `middleware.ts`. In Next.js 16, `middleware.ts` is deprecated and renamed to `proxy.ts`. The exported function must be named `proxy`, not `middleware`. If a developer copies Clerk's documented setup using the old convention, the authentication proxy will not run, leaving all routes unprotected and Clerk's `auth()` calls returning `null` in server components.

**Why it happens:**
Next.js 16.0.0 renamed the file convention (confirmed in local `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`). The existing `proxy.ts` in this project is already correctly set up — it uses `clerkMiddleware()` as a default export which is valid (the proxy file supports both named `proxy` export and default export). The critical risk is that any future developer adding or modifying auth configuration may reference outdated Next.js 14/15 Clerk documentation.

**How to avoid:**
- The existing `proxy.ts` is correctly configured — do not rename it back to `middleware.ts`
- When referencing Clerk docs, verify the Next.js version context before applying patterns
- Never rely on `proxy.ts` (the Clerk middleware check) as the sole authorization gate — always call `auth()` inside each Server Function that touches sensitive data (Clerk docs explicitly state this, and Next.js proxy docs note that Server Functions are POST requests to their route, which the proxy matcher might not cover)
- Server Functions (`'use server'`) must individually call `const { userId } = await auth(); if (!userId) throw new Error('Unauthorized')`

**Warning signs:**
- `auth()` returns `null` in server components on protected routes despite the proxy appearing to work
- Routes that should require login are accessible without a session cookie
- Console shows `clerkMiddleware` not running (no Clerk debug headers on requests)

**Phase to address:** Phase 1 (foundation) — auth is already set up; document the proxy.ts convention prominently so it is not accidentally broken in later phases

---

### Pitfall 6: Server Functions Defined Inside Client Components Lose Request Context

**What goes wrong:**
When a `'use server'` function is defined inline within a `'use client'` component file (rather than in a separate `actions.ts`), Clerk's `auth()` may return empty data because request headers are not forwarded. The athlete's name lookup or score submission silently fails or throws a generic auth error.

**Why it happens:**
Clerk's documentation explicitly warns: "When Server Actions are defined inside Client Components, request headers are not available by default because Client Components run in the browser." The `auth()` helper reads Clerk's session token from HTTP headers, which are only present in a true server-side execution context.

**How to avoid:**
- Define all Clerk-authenticated Server Functions in dedicated `app/actions/` files with `'use server'` at the top of the file
- Import and pass them as props to Client Components — never define `'use server'` functions inline within a `'use client'` file
- Pattern: `const { userId } = await auth()` at the top of every mutation server function, before any DB access

**Warning signs:**
- `auth()` returns `{ userId: null }` inside a server action that "should" be authenticated
- Calls to `currentUser()` return `null` despite the user being logged in on the frontend
- Works in development but fails in production (different execution environments surface the header issue differently)

**Phase to address:** Phase 1 (onboarding — athlete name write to Clerk publicMetadata) — this is the first server action; establish the correct pattern here to avoid propagating the anti-pattern

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip `webm-fix-duration` post-processing | Simpler export code | Athletes cannot seek in exported video; YouTube shows wrong duration | Never — affects the core product |
| Inline `'use server'` in client components | Less boilerplate | Auth silently breaks; security hole | Never |
| Rely solely on `proxy.ts` for auth | Simpler code | Any server function is callable without auth check | Never |
| Skip Wake Lock API | Less code | Recordings broken for athletes who look away for >30s | Never |
| Skip browser capability check for captureStream | Faster build | iOS athletes get blank export with no explanation | Never |
| Use `facingMode: 'environment'` directly | One line of code | Rear camera silently fails on many iOS devices | MVP only if iOS recording is not supported anyway |
| `requestAnimationFrame` without throttle guard | Simplest draw loop | Extra frames drawn but not pushed to stream; wasted CPU | Acceptable in Phase 1, optimize later |
| Sequential inserts for registrant + entries | Simpler code | Orphan rows on partial failure; no atomicity | Never — use `db.batch()` |
| `db.transaction()` instead of `db.batch()` with Turso HTTP | Familiar transaction API | "cannot commit — no transaction is active" error in production; unreliable over HTTP | Never with Turso HTTP; use `db.batch()` |
| Running `drizzle-kit push` directly to production | Fast schema update | Journal out of sync; future migrations produce wrong diffs | Never in production |
| Exact string match for coach conflict detection | Simple code | Misses "S. Merkulin" vs "Sergei Merkulin"; false negatives | Acceptable as v1 with documented limitation |
| Skip BOM stripping on CSV import | Less preprocessing | First column header corrupted; entire import silently fails | Never — one line of code prevents data corruption |
| Apply print CSS as afterthought | Ship faster | Retrofitting print onto complex Tailwind layout is disproportionately hard | Never — add `print:hidden` and `print-color-adjust` during initial timetable build |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Clerk + Next.js 16 | Copying `middleware.ts` patterns from Clerk docs | Use `proxy.ts` (already exists); call `auth()` inside every server function |
| Clerk `publicMetadata` write | Calling `clerkClient.users.updateUser()` from a client component | Call from a `'use server'` function in a dedicated actions file; Clerk Backend SDK is server-only |
| Turso + Drizzle + Edge | Using `@libsql/client` (Node.js) in a Vercel Edge function | Import `@libsql/client/web` for Edge runtimes; standard `@libsql/client` for Node.js serverless |
| Drizzle migrations | Running `drizzle-kit push` against production directly | Generate migrations first (`db:generate`), apply separately (`db:migrate`); skipping generation causes schema drift |
| Drizzle + Turso HTTP transactions | Using `db.transaction()` for multi-table writes | Use `db.batch()` — it provides all-or-nothing atomicity over a single HTTP call without requiring stateful `BEGIN`/`COMMIT` |
| Drizzle migration journal | Journal has 1 entry but 3 migration files exist | Fix journal before generating new migrations; run `drizzle-kit pull` to confirm live schema matches journal baseline |
| YouTube iframe API | Loading `youtube-iframe-api` script in a Server Component | Script must load in a Client Component; YouTube's global `YT` object only exists in the browser |
| YouTube iframe on iOS | Using `autoplay=1` without `mute=1` and `playsinline=1` | Always include `mute=1&playsinline=1` in the embed URL; iOS blocks unmuted autoplay unconditionally |
| MediaRecorder mimeType | Using `video/webm` without runtime check | Call `MediaRecorder.isTypeSupported('video/webm;codecs=vp9')` first; Safari 18.4+ supports webm but older Safari uses `video/mp4` |
| `getUserMedia` rear camera | Using `facingMode: 'environment'` on iOS | Use `enumerateDevices()` to get the rear camera `deviceId`, then pass `{ video: { deviceId: { exact: rearCameraId } } }` |
| CSV import | Parsing Excel-exported file with PapaParse without BOM strip | Strip U+FEFF from start of file text before parsing; validate all expected headers exist before processing rows |
| Next.js searchParams | Reading `searchParams` in a Layout component | Layouts do not receive `searchParams` — read only in `page.tsx` Server Components; pass as props to Client Components |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| rAF loop draws every frame but stream doesn't need it | CPU pegged at 100% on mid-range Android; battery drain during 10-min set | Throttle draw calls: only call `drawImage` if a new camera frame is available; use `video.requestVideoFrameCallback()` where supported | Constant on all devices; worse on thermal-throttled mid-range phones |
| Accumulating `Blob` chunks without releasing | Memory grows ~2–3 MB/min at 720p; after 10 min = ~20–30 MB in-memory Blob | Use `timeslice` (e.g., 1000ms) in `MediaRecorder.start()` and collect chunks in an array; concatenate only at stop | Not a crash risk at 10 min on modern phones, but could cause jank on 2–3 GB RAM devices with other apps open |
| Drawing full-resolution canvas at 1920×1080 | 60fps draw ops at 2MP resolution is GPU-intensive; overlay text renders slowly | Cap canvas resolution at 1280×720 (720p) — adequate for competition judging and well within 720p YouTube quality | On all devices if 1080p is used; especially bad on Safari which has stricter canvas memory limits |
| Single Turso connection per request in serverless | No connection reuse; latency spikes on leaderboard queries | Create the Drizzle client at module scope (outside request handlers) to enable connection reuse in warm serverless instances | Not a problem at low request volume; noticeable at competition time with many simultaneous judge queries |
| YouTube iframe loaded in document body without lazy init | YT iframe API's `onYouTubeIframeAPIReady` races with React hydration | Use `next/dynamic` with `ssr: false` for any component that instantiates `YT.Player`; initialize only after `window.YT` is confirmed ready | On every page load; timing errors appear intermittently depending on network speed |
| Scheduling algorithm runs in a Server Component that also queries all registrations | Slow timetable page load when competition has 200+ registrants | Keep scheduler as pure function; fetch registrations with a single Drizzle join query rather than N+1 per registrant; run scheduler in the server component before rendering | Noticeable above ~100 registrants with N+1 queries |
| CSV import reads entire file as string before parsing | Memory spike for large imports | Use streaming CSV parsing if imports exceed ~1000 rows; for typical competition sizes (≤300) in-memory is fine | Acceptable at competition scale; re-evaluate if import feature grows beyond 500 rows |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting the serial number in the video overlay as tamper-proof without server-side records | An athlete could record with a different app, manually overlay a fake serial, and submit | Store serials server-side at generation time; when a judge reviews, validate that the submitted serial exists in the DB and matches the athlete/discipline/date |
| Returning raw Drizzle query results from server functions to the client | Exposes database column names, internal IDs, and potentially sensitive fields | Define explicit DTO types; only return the fields the UI needs |
| Judge accessing another judge's assigned entries | Horizontal privilege escalation in judge interface | In every server function that returns entry data, verify `auth().userId === assignedJudgeId` before returning |
| Organizer modifying another organizer's competition | If multiple organizers exist, cross-org modification is possible without ownership checks | Add `createdBy` column to competitions; verify ownership in all organizer server functions |
| Missing auth check in score submission server function | Any authenticated user (athlete) could submit a score for any entry by calling the server function directly | Check `userRole === 'judge'` and `assignedEntryId === entryId` in the score submission server function |
| Public registration endpoint accepts any `compId` | Enumeration attack: attacker submits registrations for competitions that are not yet open | Check `status === 'open'`, deadline not passed, and max registrants not exceeded server-side before processing any registration data |
| Serial numbers generated client-side or derived from predictable patterns | Athlete could predict another athlete's serial and submit a fake video under that serial | Serials are server-assigned only; never expose the generation logic or current count to the client; the UNIQUE constraint is the final guard |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No countdown visual before recording starts | Athlete is not ready; first seconds of set are wasted; timer and recording are misaligned | Show a prominent 3-2-1 countdown with audio beep; do not start `MediaRecorder` or the timer until countdown completes |
| No persistent recording indicator | Athlete is unsure if recording is active; may stop early thinking it failed | Show a pulsing red dot + elapsed time throughout the set; never hide the recording state indicator |
| Offering download before in-app playback review | Athlete has no way to verify the overlay baked in correctly before uploading to YouTube | Always show the recorded video in a `<video>` element first; download button appears only after review |
| Timer drifting from real elapsed time due to rAF throttle | Overlay timer shows wrong time if tab is briefly backgrounded; video and timer are desynchronized | Drive the overlay timer from `Date.now() - recordingStartTime` on each frame draw, not from a frame counter |
| Rep counter tap target too small on mobile | Judge misses taps or double-counts during fast-paced sets | Minimum tap target for rep counter: 80×80px; add 200ms debounce to prevent accidental double-taps |
| No "copy to clipboard" confirmation for YouTube description | Athlete pastes the wrong thing; YouTube description lacks required metadata | Show a "Copied!" toast for 2 seconds after clipboard write; pre-fill all fields including serial number |
| Registration form submits silently with stale event fields | Athlete registered for events they unchecked | Call `unregister()` when an event is deselected; server action validates entries match checked events |
| CSV import error shown as single pass/fail | Organizer cannot identify which rows failed | Return per-row error list with row numbers and failure reasons; show import summary before committing |
| Timetable "Generate" button enabled with 0 registrants | Scheduler runs on empty input; returns empty output with no error | Disable generate button until `registrantCount >= 1`; show placeholder state with instructions when no registrants exist |
| Serial numbers displayed on timetable | Athletes can look up each other's serials and potentially identify who is being judged | Serials are NOT displayed on the timetable per spec; verify this during timetable build |

---

## "Looks Done But Isn't" Checklist

- [ ] **Canvas recorder on iOS:** Appears to work (camera preview loads) but `canvas.captureStream` is not supported — verify `captureStream` is called successfully and `MediaRecorder.state` reaches `"recording"` before marking the recorder feature complete
- [ ] **WebM export seeking:** Video plays from start to end correctly but duration shows `Infinity` and seeking is broken — verify `video.duration` is a finite number on the exported Blob before marking export complete
- [ ] **Wake Lock during recording:** Recording works in a 30-second test but fails at 5 minutes when the screen auto-dims — test with screen timeout set to 30 seconds and verify the wake lock re-acquires after visibility events
- [ ] **Clerk auth in server functions:** Server function appears to work in development (dev mode may be more permissive with headers) but auth is null in production — verify `auth()` returns a non-null `userId` in a production build before shipping
- [ ] **Rear camera lock:** Front/rear camera selector appears to work on desktop but silently falls back to front camera on iOS — test on a physical iPhone with the rear camera explicitly selected; verify `facingMode` vs `deviceId` approach
- [ ] **Rep counter accuracy under rapid tapping:** Single-tap counting works but rapid tapping produces duplicate counts — test with >3 taps per second and verify the debounce prevents over-counting
- [ ] **YouTube embed autoplay on iOS:** Video embed loads and plays in Chrome desktop but stalls on iOS Safari — test with `mute=1&playsinline=1` parameters and verify playback starts without user interaction for the judge review flow
- [ ] **Score submission authorization:** Judge can submit a score — but can they submit a score for an entry not assigned to them? Test by calling the server action with a different entry ID
- [ ] **Serial race condition:** Registration works in isolation — but do two simultaneous registrations produce duplicate serials? Test with concurrent requests before launch
- [ ] **Drizzle migration journal:** New migration runs cleanly on production — but does it generate `CREATE TABLE scores` (already exists)? Verify generated SQL contains only the 3 new tables before applying
- [ ] **Biathlon rest conflict boundary:** Scheduler correctly flags block gap of 1 but not gap of 2 — unit test both cases explicitly with `minRestBlocks=2`
- [ ] **CSV BOM handling:** CSV import works with a file created in a text editor — but does it work with an Excel export from Windows? Test with an actual Excel-exported file before calling CSV import done
- [ ] **Print layout:** Timetable looks correct in browser — but does it print without navigation, without cut-off columns, and with colored rows visible? Check in browser print preview at A4 size
- [ ] **Stale form fields:** Registration form correctly excludes unchecked events on submit — confirm by: check LC, fill in "2x24", uncheck LC, submit, verify no LC entry in database

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| iOS captureStream discovered after launch | HIGH | Ship a clear "Record on Chrome/Android or Desktop" message; build iOS path (record native camera → upload video → extract frames for overlay baking) — this is a significant separate feature |
| WebM seeking bug discovered after athletes export | LOW | Add `webm-fix-duration` post-processing to export step; all future exports are fixed; existing athlete exports need manual re-recording |
| Wake Lock omission causing bad recordings | MEDIUM | Add Wake Lock to existing recorder component; communicate to athletes to re-record any sets where the screen locked |
| Clerk auth missing from server functions | HIGH | Audit every server function; add auth checks; redeploy; if any unauthorized submissions were made they must be reviewed manually |
| Middleware renamed back to `middleware.ts` | LOW | Rename back to `proxy.ts`; redeploy; routes were unprotected during the window — review logs for suspicious access |
| WebM mimeType not checked causing Safari MP4 recording | LOW | Add runtime mimeType detection; Safari 18.4+ actually supports webm, so the risk is mainly older Safari versions |
| Serial collision discovered after athletes registered | HIGH | All affected entries must be identified and re-assigned; athletes must be notified of new serial numbers; any judge sessions in progress must be paused. Prevent by adding retry loop before launch. |
| Drizzle migration journal mismatch applies wrong SQL | HIGH | Restore from Turso point-in-time backup; fix journal; regenerate clean migration; reapply. Prevention: always verify generated SQL contains only expected tables before applying. |
| Orphan registrant rows from partial insert | MEDIUM | Write a cleanup script to delete registrant rows with zero entries; add `db.batch()` to prevent recurrence; communicate to affected athletes to re-register |
| Coach conflict detection misses real conflicts | LOW | Coach conflicts are soft warnings; the organizer is the final arbiter. If false negatives are found, improve normalization in the scheduler function without any data migration needed |
| CSV BOM corruption discovered after import | MEDIUM | Delete affected registrant rows; re-import cleaned CSV; re-assign serials. Prevention: add BOM strip before any import processing. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| canvas.captureStream not on iOS | Phase 1 (Recorder) | Capability check shows correct "unsupported" message on a real iPhone before any recording attempt |
| iOS PWA camera permission loss | Phase 1 (Recorder) | Test camera re-acquisition after backgrounding app on a real iPhone; no repeated prompts in Safari mode |
| WebM no duration metadata | Phase 1 (Recorder) | Exported file has finite `video.duration`; scrubbing works in browser `<video>` element |
| Screen lock during recording | Phase 1 (Recorder) | Test with 30s screen timeout; wake lock prevents dim; if lock occurs, warning message appears |
| proxy.ts / Clerk auth architecture | Phase 1 (Foundation) | Every server function that mutates data throws 401 when called without a valid Clerk session |
| Server functions defined in client components | Phase 1 (Onboarding) | All server functions are in `app/actions/` files; zero inline `'use server'` inside `'use client'` files |
| WebM mimeType not checked | Phase 1 (Recorder) | `MediaRecorder.isTypeSupported()` called before recorder init; graceful error if no supported type found |
| Rear camera iOS facingMode | Phase 1 (Recorder) | Camera lock works correctly on a physical iPhone using `deviceId` approach |
| Wake Lock in PWA vs Safari mode | Phase 1 (Recorder) | Document iOS 18.4 requirement; test in both modes |
| YouTube embed autoplay on iOS | Phase 2 (Judge) | Video plays without manual interaction on a real iPhone in the judge interface |
| Score submission authorization | Phase 2 (Judge) | Attempting to submit score for unassigned entry returns 403 |
| Turso edge import variant | Phase 1 (Foundation) | DB queries work in Vercel Edge-adjacent environment; no import errors in build |
| Drizzle migration journal mismatch | Pre-work / Phase 0 | Generated migration SQL contains only `competitions`, `registrants`, `registration_entries` — not scores or profiles |
| Serial number race condition | v2.0 Phase 1 (Registration) | Concurrent registration test (20 parallel requests) produces no duplicate serials; UNIQUE constraint present |
| Partial registrant insert (orphan rows) | v2.0 Phase 1 (Registration) | DB failure during entries insert leaves no registrant row; confirmed with simulated batch failure |
| Stale form fields on submit | v2.0 Phase 1 (Registration Form) | Checking then unchecking an event and submitting produces zero entries for that event in DB |
| Biathlon rest conflict boundary | v2.0 Phase 2 (Scheduler) | Unit tests cover block gaps of 1, 2, and 3 with `minRestBlocks=2`; exact boundary confirmed |
| Coach conflict string normalization | v2.0 Phase 2 (Scheduler) | Unit test: "S. Merkulin" vs "Sergei Merkulin" — no false negative; "merkulin" vs "Merkulin" — correctly detected |
| CSV BOM and encoding | v2.0 Phase 3 (Dashboard/Import) | Import test with Excel-generated UTF-8-BOM file produces correct first-column header parsing |
| Print CSS cutting off columns | v2.0 Phase 3 (Timetable View) | Browser print preview at A4 shows all columns; no nav elements visible; event row colors visible |
| searchParams in layout vs page | v2.0 Phase 2 (Timetable View) | `compId` and `startTime` read only from `page.tsx` searchParams; no `useSearchParams()` in child components without Suspense |

---

## Sources

- WebKit Bug 181663 (canvas captureStream on iOS): https://bugs.webkit.org/show_bug.cgi?id=181663
- WebKit Bug 229611 (MediaRecorder + canvas captureStream blank video — resolved duplicate): https://bugs.webkit.org/show_bug.cgi?id=229611
- WebKit Bug 215884 (recurring camera permission prompts in standalone PWA): https://bugs.webkit.org/show_bug.cgi?id=215884
- Can I Use — Media Capture from DOM Elements (canvas.captureStream): https://caniuse.com/mediacapture-fromelement — iOS Safari: Not Supported
- Can I Use — MediaRecorder API: https://caniuse.com/mediarecorder
- WebKit Blog — MediaRecorder API (Safari MP4 support): https://webkit.org/blog/11353/mediarecorder-api/
- STRICH Knowledge Base — iOS PWA Camera Issues: https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa
- addpipe.com — Dealing With Huge MediaRecorder Chunks: https://blog.addpipe.com/dealing-with-huge-mediarecorder-slices/
- mat-sz/webm-fix-duration (TypeScript): https://github.com/mat-sz/webm-fix-duration
- yusitnikov/fix-webm-duration: https://github.com/yusitnikov/fix-webm-duration
- MDN — Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- web.dev — Screen Wake Lock supported in all browsers: https://web.dev/blog/screen-wake-lock-supported-in-all-browsers
- Next.js 16 local docs — proxy.ts file convention: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- Next.js 16 local docs — use client directive: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
- Next.js 16 local docs — use server directive: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`
- Next.js 16 local docs — lazy loading (ssr: false): `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`
- Clerk Docs — Server Actions auth pattern: https://clerk.com/docs/reference/nextjs/app-router/server-actions
- Turso + Drizzle official docs: https://docs.turso.tech/sdk/ts/orm/drizzle
- Drizzle ORM connect-turso: https://orm.drizzle.team/docs/connect-turso
- Drizzle ORM Batch API: https://orm.drizzle.team/docs/batch-api
- Drizzle ORM Transactions: https://orm.drizzle.team/docs/transactions
- drizzle-kit push fails with Turso/libSQL — "cannot commit — no transaction is active" (Issue #5489): https://github.com/drizzle-team/drizzle-orm/issues/5489
- Turso — Beyond the Single-Writer Limitation with Concurrent Writes (MVCC): https://turso.tech/blog/beyond-the-single-writer-limitation-with-tursos-concurrent-writes
- Drizzle ORM — 3 Biggest Mistakes: https://medium.com/@lior_amsalem/3-biggest-mistakes-with-drizzle-orm-1327e2531aff
- React Hook Form — shouldUnregister stale values (Issue #4950): https://github.com/react-hook-form/react-hook-form/issues/4950
- React Hook Form — conditional fields and reset (Issue #1041): https://github.com/react-hook-form/react-hook-form/issues/1041
- PapaParse — UTF-8 BOM first header incorrectly enclosed (Issue #840): https://github.com/mholt/PapaParse/issues/840
- PapaParse — Windows MIME type issue (Issue #518): https://github.com/mholt/PapaParse/issues/518
- MDN — requestAnimationFrame throttling: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- addpipe.com — getUserMedia video constraints: https://blog.addpipe.com/getusermedia-video-constraints/
- progressier.com — front/back camera stream (deviceId workaround): https://progressier.com/choose-front-back-camera-stream
- Google Developers — YouTube Embedded Players and Player Parameters: https://developers.google.com/youtube/player_parameters
- Tailwind CSS — break-inside utility: https://tailwindcss.com/docs/break-inside
- Jacob Paris — CSS Print Styles with Tailwind: https://www.jacobparis.com/content/css-print-styles
- Next.js — useSearchParams requires Suspense: https://nextjs.org/docs/app/api-reference/functions/use-search-params

---
*Pitfalls research for: PWA canvas-based video recorder + judge interface + competition management (Kova)*
*v1 Researched: 2026-03-24 | v2.0 Queue System Researched: 2026-04-02*
