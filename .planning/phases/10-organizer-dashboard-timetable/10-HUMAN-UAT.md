---
status: pending
phase: 10-organizer-dashboard-timetable
includes_fixes: [260404-lg4]
reset: 2026-04-04
---

## UAT Checklist — Phase 10: Organizer Dashboard & Timetable

Run the dev server (`npm run dev`) and go through each test in order.
Mark each result as **pass**, **fail**, or **skip** (skip only if blocked by a prerequisite).

---

### A. Create Competition (`/organizerdb/create`)

**A1. Form renders and serial prefix updates live**
- Go to `/organizerdb/create`
- Type a competition name (e.g. "Girya Pilipinas Cup")
- Expected: serial prefix hint appears below the name field in bronze color (e.g. `GPC`)
- result: [pending]

**A2. Validation fires on empty submit**
- Clear the name and date fields, click Create Competition
- Expected: inline error messages appear for required fields; no network request made
- result: [pending]

**A3. Competition created and redirects to dashboard**
- Fill in name, date, set status to Open, leave max/deadline blank, keep default bell weights
- Click Create Competition
- Expected: redirects to `/organizerdb`; new competition appears in the selector dropdown
- result: [pending]

---

### B. Dashboard — Competition Selector & Analytics (`/organizerdb`)

**B1. Competition selector dropdown works**
- On `/organizerdb`, click the competition selector
- Expected: dropdown opens showing all competitions with name, date, status badge
- Select the competition created in A3
- Expected: URL updates to `?compId=...`; analytics bar appears
- result: [pending]

**B2. Analytics bar shows correct counts**
- With a competition selected that has registrants
- Expected: total count, per-event counts (LC / Jerk / Snatch), Male/Female split shown as stat cards
- If max registrants was set: Spots Remaining card visible
- If deadline was set: Deadline countdown visible
- result: [pending]

**B3. Status cycle button (lg4 fix)**
- With a competition selected, locate the status badge + RefreshCw button row (below the share link)
- Expected: current status badge visible (gray=draft, green=open, red=closed)
- Click the RefreshCw button
- Expected: page reloads; status cycles to the next value (draft→open→closed→draft)
- Cycle through all three states
- result: [pending]

**B4. Serial prefix display (lg4 fix)**
- With a competition selected, look at the same row as the status button
- Expected: competition serial prefix is shown in monospace font
- result: [pending]

---

### C. Registrations Table

**C1. Table renders with sort**
- With a competition that has registrants, scroll to the registrations table
- Expected: columns visible — Name, Event, Gender, Bodyweight, Club, Registered
- Click the Name column header
- Expected: rows sort alphabetically; click again to reverse sort
- Try Bodyweight column sort
- result: [pending]

**C2. Filter by event**
- Click the JERK pill filter
- Expected: table updates to show only athletes with JERK entries
- Click ALL to reset
- Expected: all registrants visible again
- result: [pending]

**C3. Filter by gender**
- Click the Female pill filter
- Expected: table updates to show only female athletes
- Combine with JERK filter: click JERK then Female
- Expected: only female JERK athletes shown; count is non-zero if DB has records
- result: [pending]

**C4. Remove registrant**
- Click the remove/trash icon on any registrant row
- Expected: confirmation dialog opens with athlete name and a red Delete button
- Confirm deletion
- Expected: dialog closes; registrant no longer appears in table; analytics bar total decrements
- result: [pending]

---

### D. QR Code Modal (lg4 fix)

**D1. QR code renders as image**
- With a competition selected, click the QR Code button
- Expected: dialog opens; a QR code image renders (not blank, not a canvas — an `<img>` element with a data URL)
- While loading: animated pulse skeleton visible briefly
- result: [pending]

**D2. QR code is scannable**
- Scan the displayed QR code with a phone camera
- Expected: resolves to the public registration URL for the competition
- result: [pending]

**D3. Download QR as PNG**
- Click "Download QR as PNG"
- Expected: file download triggers; file opens as a valid PNG image
- result: [pending]

---

### E. CSV Import Modal

**E1. File upload and validation preview**
- Click Import CSV
- Upload a CSV with 3 valid rows and 1 invalid row (e.g. missing gender field)
- Expected: preview table shows 3 green rows and 1 red row with an error message on the bad row
- result: [pending]

**E2. Import commits valid rows**
- With the preview showing above, click Import (or equivalent confirm button)
- Expected: modal closes; registrations table refreshes; 3 new registrants appear; analytics bar total increments by 3; the invalid row is not imported
- result: [pending]

**E3. Duplicate/error handling**
- Attempt to import the same CSV again
- Expected: either duplicate rows blocked with an error, or table shows them as duplicates — no silent double-import
- result: [pending]

---

### F. Generate Queue Modal

**F1. Button disabled with no registrants**
- Select a competition with zero registrants (or create one without importing)
- Expected: Generate Queue button is disabled or shows a message explaining why
- result: [pending]

**F2. Queue generation with registrants**
- Select a competition with 3+ registrants spanning at least 2 events
- Click Generate Queue
- Expected: modal opens with a start time input
- Set start time to 09:00, click Generate/Confirm
- Expected: redirect to `/organizerdb/queue?compId=...&startTime=09:00`
- result: [pending]

---

### G. Timetable Page (`/organizerdb/queue`)

**G1. Grid renders with all required fields**
- On the timetable page (reached from Generate Queue)
- Expected: grid visible with columns: Time, Block, Platform
- Each cell shows: LAST, First / event label (LC/JK/SN) · bell weight · weight class / Club
- result: [pending]

**G2. Conflict panel**
- Expected: conflict panel visible; shows "No conflicts" if none, OR:
  - REST conflicts in red with athlete name and block numbers
  - COACH conflicts in amber with athlete name and block numbers
- result: [pending]

**G3. Print layout**
- Open browser print preview (Cmd+P / Ctrl+P)
- Expected:
  - Landscape A4 orientation
  - Back link and Generate Queue button are hidden
  - Conflict panel body is visible
  - Timetable rows without colored event tint (B&W)
  - Table fits page width with visible cell borders
  - Font is readable (~10px)
- result: [pending]

---

## Summary

total: 21
passed: 0
failed: 0
skipped: 0
pending: 21

## Notes

_Add any observations, unexpected behavior, or environment-specific issues here._
