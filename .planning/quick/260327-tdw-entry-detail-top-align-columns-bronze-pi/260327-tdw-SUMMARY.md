# Quick Task 260327-tdw: Entry detail — top-align columns, bronze pills, remove centering

## What Changed
- Two-column flex row uses `items-start` so video and rep column top-align exactly
- All pill backgrounds changed to unified `patina-bronze/5` with `patina-bronze/15` border — only icons carry color (green check, red X)
- Pill sizing reduced (px-1.5 py-1, text-[10px]) with stacked rep number + timestamp to prevent overflow in narrow column
- Flash indicator and rep count header sizes reduced for the narrow column
- Removed all `items-center`/`items-stretch` from right column

## Files Modified
- `components/profile/EntryDetailClient.tsx`
