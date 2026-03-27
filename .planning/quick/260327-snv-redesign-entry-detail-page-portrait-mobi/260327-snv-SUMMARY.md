# Quick Task 260327-snv: Redesign entry detail page — portrait mobile layout

## What Changed
- Replaced the old stacked entry detail page with a two-column portrait layout
- Left column (~65%): YouTube embed filling the viewport height
- Right column: flash verdict indicator (last rep's verdict fades after 1s), rep count, scrollable rep pills
- Rep pills: green-tinted for REP (check icon), red-tinted for NO REP (X icon), with timestamps
- Bottom strip: compact card with serial + discipline abbreviation + weight + status badge + Export CSV button
- CSV export: downloads rep number, timestamp, and verdict for every rep
- Responsive: works on mobile portrait, iPad, and desktop

## Files Created
- `components/profile/EntryDetailClient.tsx` — new client component

## Files Modified
- `app/(app)/profile/[id]/page.tsx` — rewritten to use EntryDetailClient
