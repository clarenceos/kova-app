# Quick Task 260327-s4j: Show full serial in CompactEntryRow

## What Changed
- Removed `.slice(0, 6)` truncation from serial display in `CompactEntryRow.tsx`
- Stacked serial and date vertically (flex-col) on the right side to fit full serial without horizontal overflow
- Date font size reduced to `text-[10px]` to keep the row compact

## Files Modified
- `components/profile/CompactEntryRow.tsx`
