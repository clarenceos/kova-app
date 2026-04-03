---
status: partial
phase: 10-organizer-dashboard-timetable
source: [10-VERIFICATION.md]
started: 2026-04-03T18:45:00+08:00
updated: 2026-04-03T18:45:00+08:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Filter with real data
expected: Click JERK and Female pills on the registrations table — results filter correctly to matching registrants (non-empty when DB has records of that type)
result: [pending]

### 2. QR Code modal
expected: Click QR Code button → canvas renders a scannable QR code → PNG download produces a valid file
result: [pending]

### 3. Print layout
expected: Open browser print preview (Cmd+P) on /organizerdb/queue → A4 landscape format, nav hidden, B&W colors, readable 10px table font
result: [pending]

### 4. End-to-end timetable
expected: Seed DB with registrants → navigate to Generate Queue → confirm time-blocked grid renders with event-tinted rows and conflict panel shows correctly
result: [pending]

### 5. CSV import round-trip
expected: Import a CSV with mixed valid/invalid rows → validation preview shows green/red rows → after import, registrations table refreshes with new entries
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
