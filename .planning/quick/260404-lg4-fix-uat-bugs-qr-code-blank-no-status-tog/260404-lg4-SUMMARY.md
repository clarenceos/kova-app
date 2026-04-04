---
phase: quick
plan: 260404-lg4
subsystem: organizer-dashboard
tags: [bugfix, qr-code, competition-status, serial-prefix, uat]
dependency_graph:
  requires: []
  provides: [qr-code-visible, status-cycle-ui, serial-prefix-display]
  affects: [app/organizerdb]
tech_stack:
  added: []
  patterns: [toDataURL-over-toCanvas, useTransition-for-server-actions]
key_files:
  created: []
  modified:
    - app/organizerdb/_components/QRCodeModal.tsx
    - lib/actions/competitions.ts
    - app/organizerdb/_components/DashboardClient.tsx
decisions:
  - "Use QRCode.toDataURL() over toCanvas() — Dialog mounts content lazily; canvasRef is null when the effect fires on open=true; toDataURL is pure in-memory with no DOM dependency"
  - "StatusBadge duplicated locally in DashboardClient — original is private to CompetitionSelector, not exported; duplication is correct here"
  - "window.location.reload() after status cycle — server component data (competition.status) must be re-fetched; revalidatePath alone does not re-render the client until navigation"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-04"
  tasks_completed: 2
  files_changed: 3
---

# Quick Task 260404-lg4: Fix UAT Bugs — QR Code Blank, No Status Toggle, Hidden Serial Prefix

**One-liner:** Fixed blank QR modal by switching to in-memory toDataURL, added draft/open/closed status cycle button with RefreshCw, and surfaced serial prefix in the organizer dashboard action bar.

## What Was Done

### Task 1: Fix QR Code Rendering and Download
**File:** `app/organizerdb/_components/QRCodeModal.tsx`
**Commit:** `abe2d9a`

The root cause was that shadcn's `<Dialog>` mounts `<DialogContent>` lazily — the canvas DOM element doesn't exist yet when the `useEffect` fires on `open=true`, so `canvasRef.current` was always `null` and `QRCode.toCanvas()` silently failed.

Fix: replaced `canvasRef` + `QRCode.toCanvas()` with `useState<string | null>` + `QRCode.toDataURL()`. The `toDataURL` API is entirely in-memory and returns a `Promise<string>` — no DOM element required. The data URL is then rendered as a plain `<img>` tag. While loading, an `animate-pulse` skeleton is shown. The download handler uses the data URL directly from state rather than reading `canvas.toDataURL()`.

### Task 2: Status Cycle Button + Serial Prefix Display
**Files:** `lib/actions/competitions.ts`, `app/organizerdb/_components/DashboardClient.tsx`
**Commit:** `6745402`

**Server action:** Added `updateCompetitionStatus(compId, newStatus)` to `lib/actions/competitions.ts`. Imports `eq` from `drizzle-orm` (previously absent from this file). Validates both arguments, runs `db.update(...).set({ status }).where(eq(id, compId))`, calls `revalidatePath('/organizerdb')`, returns `{ success: true }` or `{ error: string }`.

**Dashboard UI:** Added to `DashboardClient.tsx`:
- `StatusBadge` local function (green=open, red=closed, gray=draft using shadcn `Badge`)
- `STATUS_CYCLE` map: `draft -> open -> closed -> draft`
- `handleStatusCycle` using `useTransition` for pending state — disables the cycle button during the async server action call and then calls `window.location.reload()` to re-fetch server component data
- New row below "Share this link": status badge + `RefreshCw` cycle button + serial prefix in `font-mono`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx next build` passes with zero errors, all 22 routes compiled
- QR modal: `<img>` tag with pulse skeleton replaces `<canvas>` — timing-safe across Dialog lazy mounts
- Status cycle: `draft -> open -> closed -> draft` cycle with disabled state during transition
- Serial prefix: visible in monospace next to status controls

## Self-Check: PASSED

- FOUND: app/organizerdb/_components/QRCodeModal.tsx
- FOUND: lib/actions/competitions.ts
- FOUND: app/organizerdb/_components/DashboardClient.tsx
- FOUND commit abe2d9a: fix(quick-260404-lg4): replace canvas QR with toDataURL to fix blank modal
- FOUND commit 6745402: feat(quick-260404-lg4): add status cycle button and serial prefix to dashboard
