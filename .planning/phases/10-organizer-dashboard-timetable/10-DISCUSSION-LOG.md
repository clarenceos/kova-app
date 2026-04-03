# Phase 10: Organizer Dashboard & Timetable - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 10-organizer-dashboard-timetable
**Areas discussed:** Dashboard evolution, Remove & CSV import, Timetable display, Print layout

---

## Dashboard Evolution

### Dashboard Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown-first | Competition dropdown at top. Selecting one loads analytics bar + registrations table below. 'New Competition' button beside dropdown. | ✓ |
| Tabs per competition | Horizontal tabs for each competition, like browser tabs. | |
| Card list + expand | Keep current card list, each card expands inline to reveal dashboard content. | |

**User's choice:** Dropdown-first
**Notes:** User emphasized this must be intuitive for non-techy organizers.

### Empty State (Before Selection)

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt to select | Dropdown visible with placeholder, gentle message below to select. Empty state when no competitions. | ✓ |
| Auto-select latest | Auto-select most recent competition on page load. | |
| Auto-select latest open | Auto-select most recent 'open' competition. | |

**User's choice:** Prompt to select

### Data Loading Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side | Load all registrants in one fetch. Sort/filter in JavaScript. Fast interactions. | ✓ |
| Server-side paginated | Fetch 25-50 rows at a time. Sort/filter params sent to server. | |
| You decide | Claude picks based on scale. | |

**User's choice:** Client-side

### Registration Link Placement

| Option | Description | Selected |
|--------|-------------|----------|
| In dropdown item | Separate 'Copy Registration Link' button near dropdown area. | ✓ |
| In analytics bar | Registration link embedded in analytics summary row. | |
| You decide | Claude picks. | |

**User's choice:** In dropdown item
**Notes:** User added: "there should also be a QR code generated which the organizer can share via exporting the QR code." Copy link button beside save/copy QR code button.

### QR Code Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Next to Copy Link button | 'QR Code' button beside 'Copy Registration Link'. Opens modal with QR and download PNG button. | ✓ |
| Always visible in analytics bar | Small QR thumbnail always visible, click to enlarge. | |
| You decide | Claude picks. | |

**User's choice:** Next to Copy Link button
**Notes:** Copy link button beside save/copy QR code button.

### URL State Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Query param | /organizerdb?compId=xxx. Bookmarkable, shareable, browser back works. | ✓ |
| Client state only | Selection in React state only. Lost on refresh. | |
| You decide | Claude picks. | |

**User's choice:** Query param

### Dropdown Item Display

| Option | Description | Selected |
|--------|-------------|----------|
| Name + date + badge | Each item shows competition name, formatted date, colored status badge. | ✓ |
| Name only | Just name in dropdown. Status/date in analytics bar after selection. | |
| You decide | Claude picks. | |

**User's choice:** Name + date + badge

### Contextual Guidance

| Option | Description | Selected |
|--------|-------------|----------|
| Inline hints | Subtle gray helper text: 'Share this link with athletes', 'No registrations yet', etc. Always-present, not dismissible. | ✓ |
| No hints | Clean minimal dashboard. Labels speak for themselves. | |
| Dismissible tour | First-time tooltip tour. Dismiss once, never shows again. | |

**User's choice:** Inline hints
**Notes:** User said "I want this to feel so easy, like an onboarding for first timers but not annoying for repeat users."

### Analytics Bar Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Stat cards in a row | Horizontal row of compact stat cards. Each has number + label. Wraps on narrow screens. | ✓ |
| Single dense bar | One-line horizontal bar with all stats. Compact but harder to scan. | |
| You decide | Claude picks. | |

**User's choice:** Stat cards in a row

---

## Remove & CSV Import

### Remove Registrant Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm dialog | Dialog shows name, affected serials, "cannot be undone" warning. Cancel/Remove buttons. | ✓ |
| Instant with undo | Remove immediately, toast with 5-second undo window. | |
| You decide | Claude picks. | |

**User's choice:** Confirm dialog

### CSV Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Preview all, import valid only | Show ALL rows with valid=green, invalid=red+error. "Import N valid rows" button. | ✓ |
| Block until all valid | Must fix CSV and re-upload until 100% valid. | |
| Import all, skip bad silently | Import valid, skip invalid, show summary after. | |

**User's choice:** Preview all, import valid only

### CSV Import UI Location

| Option | Description | Selected |
|--------|-------------|----------|
| Button opens modal | 'Import CSV' button opens modal with file picker, preview, import/cancel. | ✓ |
| Inline section | Always-visible section below registrations table. | |
| You decide | Claude picks. | |

**User's choice:** Button opens modal

---

## Timetable Display

### Cell Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked lines | 2-3 lines: Name (bold), Event · bell · weight class, Club (muted). Conflict pill top-right. | ✓ |
| Single dense line | One line per cell with all info. Compact but hard to scan. | |
| You decide | Claude picks. | |

**User's choice:** Stacked lines

### Event Row Tinting

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle event tints | LC=blue, Jerk=amber, Snatch=green. 10-15% opacity. Mixed blocks use majority or neutral. | ✓ |
| Event badge in cell only | No row tinting. Small colored badge per cell. | |
| You decide | Claude picks. | |

**User's choice:** Subtle event tints

### Conflict Panel

| Option | Description | Selected |
|--------|-------------|----------|
| Top panel, collapsible | Between header and grid. Expanded by default. Count + individual conflict lines. REST=red, COACH=amber. | ✓ |
| Sidebar panel | Fixed right sidebar. Always visible while scrolling. | |
| You decide | Claude picks. | |

**User's choice:** Top panel, collapsible

### Generate Queue Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Simple modal | Start time input (HH:MM, default 09:00), registrant/platform summary, est. finish. Generate/Cancel. | ✓ |
| Inline start time | No modal. Start time input inline next to button. | |
| You decide | Claude picks. | |

**User's choice:** Simple modal

---

## Print Layout

### Paper Orientation

| Option | Description | Selected |
|--------|-------------|----------|
| Landscape | @page { size: landscape; }. Wide timetable fits naturally on A4/Letter. | ✓ |
| Portrait | Standard portrait. Columns may be narrow for 3+ platforms. | |
| You decide | Claude picks. | |

**User's choice:** Landscape
**Notes:** User added: "black and white to make it print friendly."

### B&W Event Differentiation

| Option | Description | Selected |
|--------|-------------|----------|
| Event label only | No background tints on print. Event code (LC/JK/SN) in each cell is sufficient. Clean, minimal ink. | ✓ |
| Dotted/dashed borders | Different border styles per event group. May look cluttered. | |
| You decide | Claude picks. | |

**User's choice:** Event label only

### Conflict Panel in Print

| Option | Description | Selected |
|--------|-------------|----------|
| Print conflicts too | Conflict panel prints above timetable in bold text (no colors). Needed at venue. | ✓ |
| Screen only | Hide conflict panel on print. | |
| You decide | Claude picks. | |

**User's choice:** Print conflicts too

---

## Claude's Discretion

- Component architecture (dashboard split into sub-components)
- CSV parsing approach (papaparse vs manual)
- QR code generation library
- Dropdown implementation (shadcn Select vs Popover+Command)
- Table internals (library vs hand-built)
- Estimated finish time calculation in Generate Queue modal
- Server action shapes for fetching/deleting registrants
- "Back to Dashboard" link behavior from timetable page

## Deferred Ideas

None — discussion stayed within phase scope
