# Quick Task 260327-sxi: Entry detail — 80% video width, top-align, time-sync highlighting

## What Changed
- Video column width increased from 65% to 80%
- Right column (rep pills) now top-aligned instead of centered
- Time-sync rep highlighting: polls YouTube player time every second, highlights the current rep pill with a parchment ring, auto-scrolls it into view
- Graceful degradation if YouTube API unavailable

## Files Modified
- `components/profile/EntryDetailClient.tsx`
