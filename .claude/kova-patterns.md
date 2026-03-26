# Kova — Code Patterns

This file grows over time. Each time we establish a pattern worth reusing, it gets logged here.
Do NOT invent new patterns that conflict with what's documented below.

---

## Auth & Middleware

_Patterns to be documented as they are established._

## Drizzle ORM Queries

_Patterns to be documented as they are established._

## Clerk Role Checks

_Patterns to be documented as they are established._

## Next.js App Router Conventions

_Patterns to be documented as they are established._

## Component Structure

_Patterns to be documented as they are established._

## Judge Interface

### Judge Session — Three Layout Modes
The judge session page has three distinct layout modes. Never collapse them.
- **Phone portrait** (default): video top 2/3, action deck bottom 1/3, stacked
- **Phone landscape** (blocked): `landscape:max-md:flex` fixed overlay with RotateCcw icon + "Rotate your device" message
- **Tablet/desktop landscape** (`md:` breakpoint): two-column, video left (~45%), action deck right (~55%), `md:border-r border-raw-steel/20` divider
- SessionHeader extracted as local component to avoid JSX duplication across modes

### YouTube Iframe API — Sizing
Always use inline styles on the containerRef div. Tailwind classes alone are ignored by the YT IFrame API when it creates the iframe.
```tsx
<div ref={containerRef} style={{ width: '100%', height: '100%' }} />
```
Reason: YT API reads inline styles when sizing the iframe it creates; Tailwind classes are not inline styles.

### YouTube Embed — Portrait Video Container
Use `aspect-[9/16]` for the video container, not `aspect-video`. Competition videos are consistently shot in portrait on mobile.

## Canvas Video Overlay

### Recording Overlay Layout
The canvas overlay drawn on competition recordings follows this exact spec:
- **Top-left**: Discipline name (Tomorrow 600, 22px, parchment) + Timer MM:SS (Tomorrow 700, 80px, white) — 24px from left, 32px from top
- **Top-right**: "KOVA" wordmark (Tomorrow 600, 36px, parchment) — right-aligned, vertically centered on timer span
- **Bottom-left**: Athlete name as "F. Lastname" (Tomorrow 700, 42px, white) + Serial + Weight line (Tomorrow 600, 24px, parchment, em-spaces between serial and weight) — 24px from left, 32px from bottom
- **Top gradient**: `rgba(0,0,0,0.72)` → `rgba(0,0,0,0)` over 180px from top, full width — drawn before text
- **Bottom gradient**: `rgba(0,0,0,0)` → `rgba(0,0,0,0.72)` over last 220px, full width — drawn before text

### Canvas Font Loading (Tomorrow)
Load Tomorrow via FontFace API before first canvas draw. Use memoized promise to load once per page.
```ts
const ensureTomorrowFonts = (() => {
  let promise: Promise<void> | null = null
  return () => {
    if (!promise) promise = loadTomorrowFonts()
    return promise
  }
})()
// Call: await ensureTomorrowFonts() before captureStream
```
Reason: Canvas context requires fonts loaded via FontFace API — Google Fonts CSS @import does not work on canvas.

## Serial Numbers

### Format
`XXX-0000` — 3 uppercase letters + hyphen + 4 zero-padded digits. Generated server-side in `lib/serial.ts` with DB collision check.

### Input Normalization
Strip whitespace and uppercase before DB lookup. Handles `kva3847`, `kva-3847`, ` KVA 3847 ` → `KVA-3847`.
```ts
serial.replace(/\s/g, '').toUpperCase()
```
Applied at input validation only. Stored serials are always `XXX-0000` format.

---

## How to Update This File

When we establish a clear, reusable pattern during a session, add it here with:
- A short title
- The pattern itself (code snippet or description)
- Why we chose it (one line)

Example format:
```
### Drizzle: Fetch entry with judge assignment
\`\`\`ts
// pattern code here
\`\`\`
Reason: Avoids N+1 queries by joining assignment at the query level.
```
