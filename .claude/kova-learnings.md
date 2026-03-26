# Kova — Session Learnings

This file is a self-learning log. After sessions involving significant decisions, bugs fixed, or approaches that failed, log them here.
Every mistake becomes a rule. Every good pattern gets captured. The system gets smarter over time.

At the start of each session, read this file to avoid repeating past mistakes.
At the end of significant sessions, update it.

---

## Format

### [Date] — [Topic]
**What happened:** Brief description.
**What worked:** What approach succeeded.
**What didn't work:** What we tried that failed and why.
**Rule going forward:** The instruction to follow next time.

---

## Log

### 2026-03-25 — System Setup
**What happened:** Set up the agentic operating system for Kova — context files, brand file, decisions file, patterns file, and this learnings file. Updated project instructions to load these at session start.
**What worked:** Separating context into focused files (context, brand, decisions, patterns, learnings) keeps each one lean and purposeful.
**What didn't work:** N/A — initial setup session.
**Rule going forward:** At the start of every coding session, read `.claude/kova-context.md`, `.claude/kova-decisions.md`, and `.claude/kova-learnings.md` before doing anything else. Update this file at the end of sessions where bugs were fixed or significant decisions were made.

---

### 2026-03-25 — Full UI Redesign (Brand-Aligned)
**What happened:** Full UI redesign across all 4 phases using GSD plan-then-execute workflow. Established brand token system, global nav shell, and judge session layout overhaul.
**What worked:** Running `/gsd:plan-phase` with a detailed design brief before touching any files. Claude Code discovered Tailwind v4 (CSS-only, no config file) during planning — would have broken execution if we hadn't planned first. Wave-based parallel execution kept context clean across 10+ files.
**What didn't work:** Safari on localhost had YouTube iframe issues that Chrome didn't — always test YouTube embed on Chrome first in dev. The `aspect-video` container assumption failed for portrait competition videos.
**Rule going forward:** Always run GSD plan mode for any task touching more than 3 files. For YouTube embeds, use `aspect-[9/16]` container since competition videos are consistently portrait. Tailwind v4 projects have no `tailwind.config.ts` — all tokens go in `globals.css` via `@theme` blocks.

### 2026-03-25 — Judge Session UX Fixes
**What happened:** Fixed three judge session issues: timestamp reliability (playerReady guard + null fallback), Exit modal (shadcn AlertDialog with double confirmation), video player sizing (inline style required for YouTube iframe API, Tailwind classes alone not reliable).
**What worked:** Adding `style={{ width: '100%', height: '100%' }}` inline on the containerRef div — the YT IFrame API reads inline styles when sizing the iframe it creates. Tailwind classes alone don't work for this.
**What didn't work:** Tailwind classes on the YouTube container div — the YT API ignores them when creating the iframe.
**Rule going forward:** YouTube iframe API requires inline styles on the container div for sizing. Never rely on Tailwind classes alone for the YouTube player container.

### 2026-03-25 — Judge Session Landscape Layout
**What happened:** Added three-mode responsive layout to judge session: phone portrait (unchanged), phone landscape (blocked with rotate prompt), tablet/desktop landscape (two-column: video left, action deck right).
**What worked:** CSS `landscape:max-md:flex` for the phone landscape block overlay. Extracting SessionHeader as a local component to avoid JSX duplication across portrait and landscape modes.
**What didn't work:** N/A — clean first execution.
**Rule going forward:** Judge session has three layout modes. Never collapse them into one. Phone landscape is intentionally blocked — do not remove that guard.

### 2026-03-25 — Serial Number Format Change
**What happened:** Changed serial number format from long UUID-style to `XXX-0000` (3 uppercase letters + hyphen + 4 digits). Added case-insensitive + whitespace-stripped input normalization for judge serial entry.
**What worked:** Short serial format dramatically reduces judge friction. 175M combinations is sufficient; can scale to 4.5B by adding a 4th letter.
**What didn't work:** N/A.
**Rule going forward:** Serial format is `XXX-0000`. Normalization (strip whitespace, uppercase) happens at input validation, not at storage. Existing records keep old serials — no migration needed.

### 2026-03-26 — Recorder UI Fixes
**What happened:** Fixed three recorder issues: canvas overlay font sizing (too large on mobile), stop button redesigned to circular 56px lower-right at 75% opacity, duration-aware stop confirmation using lib/disciplines.ts.
**What worked:** Extracting discipline durations into lib/disciplines.ts as a Record<Discipline, number> map — makes all duration logic future-proof for any new discipline. Failing open (calling stopRecording directly) when discipline not found — never blocks the user.
**What didn't work:** Hardcoding "10 minutes" as the duration check — immediately breaks when 5-min disciplines are added. Always use the discipline duration map.
**Rule going forward:** Never hardcode discipline durations anywhere. All duration checks must reference lib/disciplines.ts. Circular stop button stays lower-right at 75% opacity — do not move or enlarge.

### 2026-03-26 — Serial DB Collision Check Crashing /record in Production
**What happened:** generateSerial() ran a DB collision check on every /record page load. The query failed intermittently in Vercel serverless, causing 500s.
**What worked:** Wrapping the collision check in try-catch — if the query throws, fall through and return the generated serial anyway. 175M combinations makes skipping one check negligible risk.
**What didn't work:** Unguarded DB queries in layout/page server components — serverless cold starts can fail DB connections.
**Rule going forward:** Any DB query in a layout or page component must have try-catch with a sensible fallback. Never let a non-critical query crash a page load.

---

### 2026-03-26 — Recorder + Playback UX Polish
**What happened:** 9 fixes across recording/page.tsx and playback/page.tsx. Front camera is now the default. Rear camera no longer mirrored. Beeps now captured in the recorded video by routing AudioContext through a MediaStreamDestinationNode mixed into the canvas stream before passing to MediaRecorder. Numpad inputs via inputMode="decimal"/"numeric". Countdown minimum 5s enforced with inline error. iOS always hides the video player (UA detection before canPlayType). Back button on playback shows a leave-warning dialog instead of silently discarding the recording. Upload flow restructured — single tap starts upload, buttons hidden during upload, export offered only after completion.
**What worked:** `MediaStreamDestinationNode` pattern for capturing audio into video — create in startSession (user gesture), connect gainNode to both `ctx.destination` (speakers) and `audioDestRef.current`, then `new MediaStream([...canvasStream.getVideoTracks(), ...audioDestRef.current.stream.getAudioTracks()])` for MediaRecorder. iOS detection: `/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)`. YouTubeUploader auto-starts on mount via useEffect — no second tap needed.
**What didn't work:** N/A — clean first execution.
**Rule going forward:** Always route AudioContext through MediaStreamDestinationNode so beeps land in the recorded file, not just speakers. Always detect iOS before canPlayType — iOS with MP4 mimeType would pass canPlayType but still show a broken player. Never show "Render and Export" before upload — it encourages the wrong flow and risks losing the recording.

---

### 2026-03-26 — Judge Session UI Overhaul + Complete Page Rep Log
**What happened:** Redesigned judge session for portrait mobile — removed header, fixed 60vh video height, moved rep count to overlay on right side of video, made 3-button compact row (NO REP | UNDO | REP half-width), submit only visible when paused/ended. Fixed REP button being active before video plays by adding `onStateChange` to YouTubeEmbed, tracking `isPlaying` state, gating buttons with `canJudge = playerReady && isPlaying`. Redesigned complete page with full rep log (timestamps + type icons), rep count hero, and Judge Again / Finalize buttons. Required adding `RepEntry[]` to `LastSubmission` type in `judge-context.tsx`.
**What worked:** `h-[60vh]` on video container instead of `aspect-[9/16]` — gives predictable height on all phones. YouTube IFrame API `onStateChange` state `1` = playing, used to gate judge buttons. Passing full `repTaps` array through context to the complete page for display.
**What didn't work:** `aspect-[9/16]` pushed controls off screen on standard phone heights. `playerReady` alone is insufficient to gate buttons — it fires on player init, not on play start.
**Rule going forward:** Judge video container uses `h-[60vh]`, never `aspect-[9/16]`. REP/NO REP buttons must be gated on `isPlaying` (YouTube state 1), not just `playerReady`. `LastSubmission` carries full `repTaps: RepEntry[]` — always pass it when calling `setLastSubmission`.

---

### 2026-03-26 — createEntry DB Insert Failing Silently in Production
**What happened:** YouTube uploads succeeded (videos appeared on YouTube) but `createEntry` always returned `{ error: 'Failed to create entry' }` and nothing saved to the DB. Vercel logs showed the pre-insert log firing but no success or error log visible — because Vercel's log table only shows the first log per request, hiding the actual error message.
**What worked:** Two changes together fixed it: (1) switching `lib/db.ts` from `@libsql/client` (WebSocket) to `@libsql/client/http` — the HTTP client is stateless per query, correct for serverless; (2) stripping the `Bearer ` prefix from `TURSO_AUTH_TOKEN` using `rawToken.replace(/^Bearer\s+/i, '').trim()`. The env var in Vercel had `Bearer eyJ...` as its value (with prefix), plus likely invisible characters like a trailing newline. The WebSocket client tolerated this; the HTTP client enforces strict HTTP header validation and rejected it. The `.trim()` handles any invisible chars.
**What didn't work:** Simple `startsWith('Bearer ')` check — failed because the env var likely had invisible characters (trailing newline etc.) that `startsWith` doesn't strip. `@libsql/client` (WebSocket) in Vercel serverless also unreliable — stale connection on warm container reuse. `db.$client?.execute` in diagnostic logs causes a TypeScript build error with the HTTP client — remove it.
**Rule going forward:** Always use `@libsql/client/http` in `lib/db.ts` with `rawToken.replace(/^Bearer\s+/i, '').trim()` to sanitize the auth token. Never use the WebSocket client. TURSO_AUTH_TOKEN in Vercel should ideally be set WITHOUT the `Bearer ` prefix, but the code strips it defensively either way. Vercel MCP logs show only the first log per request — to debug silent failures, temporarily return the actual error in the response so it appears in the UI.

---
