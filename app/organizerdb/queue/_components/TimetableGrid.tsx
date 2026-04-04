'use client'

import { useState } from 'react'
import type { TimeBlock, Conflict, PlatformSlot } from '@/lib/queue/types'
import { detectConflicts } from '@/lib/queue/detectConflicts'
import { saveQueue, clearQueue } from '@/lib/actions/competitions'
import { TimetableCell } from './TimetableCell'
import { ConflictPanel } from './ConflictPanel'
import { InsertBlockRow } from './InsertBlockRow'

interface TimetableGridProps {
  initialTimeBlocks: TimeBlock[]
  numPlatforms: number
  initialConflicts: Conflict[]
  minRestBlocks: number
  compId: string
  savedAt: Date | null
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function getRowTintClass(block: TimeBlock): string {
  const events = block.platforms.filter(Boolean).map(s => s!.event)
  if (events.length === 0) return ''
  const counts: Record<string, number> = {}
  for (const e of events) counts[e] = (counts[e] ?? 0) + 1
  const majority = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  // Only tint if majority > 50% of filled slots
  if (majority[1] <= events.length / 2) return '' // mixed block — neutral
  switch (majority[0]) {
    case 'LC': return 'bg-blue-950/40'
    case 'JERK': return 'bg-amber-950/40'
    case 'SNATCH': return 'bg-green-950/40'
    default: return ''
  }
}

type CellCoords = { blockIdx: number; platformIdx: number }

export function TimetableGrid({
  initialTimeBlocks,
  numPlatforms,
  initialConflicts,
  minRestBlocks,
  compId,
  savedAt: initialSavedAt,
}: TimetableGridProps) {
  const [timeBlocks, setTimeBlocks] = useState(initialTimeBlocks)
  const [conflicts, setConflicts] = useState(initialConflicts)
  const [dragSource, setDragSource] = useState<CellCoords | null>(null)
  const [dragOver, setDragOver] = useState<CellCoords | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(initialSavedAt)

  // Build conflict lookup: entryId -> Conflict[] for quick lookup in cells
  const conflictsByEntry = new Map<string, Conflict[]>()

  for (const c of conflicts) {
    if (c.type === 'REST') {
      for (const block of timeBlocks) {
        for (const slot of block.platforms) {
          if (!slot) continue
          if (
            `${slot.firstName} ${slot.lastName}` === c.athleteName &&
            c.blockNumbers.includes(block.blockNumber)
          ) {
            const existing = conflictsByEntry.get(slot.entryId) ?? []
            existing.push(c)
            conflictsByEntry.set(slot.entryId, existing)
          }
        }
      }
    } else if (c.type === 'COACH') {
      for (const block of timeBlocks) {
        if (block.blockNumber !== c.blockNumber) continue
        for (const slot of block.platforms) {
          if (!slot) continue
          const fullName = `${slot.firstName} ${slot.lastName}`
          if (fullName === c.studentName || fullName === c.coachName) {
            const existing = conflictsByEntry.get(slot.entryId) ?? []
            existing.push(c)
            conflictsByEntry.set(slot.entryId, existing)
          }
        }
      }
    } else if (c.type === 'JUDGE') {
      // Match judge conflicts to the slot with the matching athlete name in the matching block
      for (const block of timeBlocks) {
        if (block.blockNumber !== c.blockNumber) continue
        for (const slot of block.platforms) {
          if (!slot) continue
          const fullName = `${slot.firstName} ${slot.lastName}`
          if (fullName === c.athleteName) {
            const existing = conflictsByEntry.get(slot.entryId) ?? []
            existing.push(c)
            conflictsByEntry.set(slot.entryId, existing)
          }
        }
      }
    }
  }

  function handleDragStart(coords: CellCoords) {
    setDragSource(coords)
  }

  function handleDragOver(e: React.DragEvent, coords: CellCoords) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(coords)
  }

  function handleDragEnter(coords: CellCoords) {
    setDragOver(coords)
  }

  function handleDragLeave() {
    setDragOver(null)
  }

  function handleDrop(e: React.DragEvent, dest: CellCoords) {
    e.preventDefault()
    if (!dragSource) return
    if (dragSource.blockIdx === dest.blockIdx && dragSource.platformIdx === dest.platformIdx) {
      setDragSource(null)
      setDragOver(null)
      return
    }

    const newBlocks = structuredClone(timeBlocks)
    const srcBlock = newBlocks[dragSource.blockIdx]
    const dstBlock = newBlocks[dest.blockIdx]
    const temp = srcBlock.platforms[dragSource.platformIdx]
    srcBlock.platforms[dragSource.platformIdx] = dstBlock.platforms[dest.platformIdx]
    dstBlock.platforms[dest.platformIdx] = temp

    setTimeBlocks(newBlocks)
    const newConflicts = detectConflicts(newBlocks, minRestBlocks)
    setConflicts(newConflicts)
    setDragSource(null)
    setDragOver(null)
    setIsDirty(true)
  }

  function handleDragEnd() {
    setDragSource(null)
    setDragOver(null)
  }

  function handleInsertBlock(afterIndex: number) {
    const newBlocks = structuredClone(timeBlocks)
    const prevBlock = newBlocks[afterIndex]
    // Create empty block — start/end times will be renumbered below
    const emptyBlock: TimeBlock = {
      blockNumber: 0, // placeholder, renumbered below
      startTime: 0,
      endTime: 0,
      platforms: Array.from({ length: numPlatforms }, () => null),
    }
    newBlocks.splice(afterIndex + 1, 0, emptyBlock)

    // Renumber all blocks sequentially
    for (let i = 0; i < newBlocks.length; i++) {
      newBlocks[i].blockNumber = i + 1
    }

    // Recalculate start/end times — first block keeps original startTime
    // Each subsequent block: startTime = previous endTime, endTime = startTime + blockDuration
    // Infer blockDuration from the first block (endTime - startTime)
    const blockDuration =
      newBlocks.length > 0 && newBlocks[0].endTime > newBlocks[0].startTime
        ? newBlocks[0].endTime - newBlocks[0].startTime
        : 10
    const transitionDuration = 5

    for (let i = 1; i < newBlocks.length; i++) {
      newBlocks[i].startTime = newBlocks[i - 1].endTime + transitionDuration
      newBlocks[i].endTime = newBlocks[i].startTime + blockDuration
    }
    // First block keeps its original startTime/endTime (from the initial schedule)
    // but we need to set the emptyBlock's times if it was inserted at position 0
    if (afterIndex === -1) {
      // Insert before first — rare but handle gracefully
      newBlocks[0].startTime = prevBlock.startTime - (blockDuration + transitionDuration)
      newBlocks[0].endTime = newBlocks[0].startTime + blockDuration
      for (let i = 1; i < newBlocks.length; i++) {
        newBlocks[i].startTime = newBlocks[i - 1].endTime + transitionDuration
        newBlocks[i].endTime = newBlocks[i].startTime + blockDuration
      }
    }

    setTimeBlocks(newBlocks)
    const newConflicts = detectConflicts(newBlocks, minRestBlocks)
    setConflicts(newConflicts)
    setIsDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await saveQueue(compId, timeBlocks)
      if ('error' in result) {
        console.error('[TimetableGrid] saveQueue error:', result.error)
        return
      }
      setIsDirty(false)
      setSavedAt(result.savedAt)
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate() {
    const result = await clearQueue(compId)
    if ('error' in result) {
      console.error('[TimetableGrid] clearQueue error:', result.error)
      return
    }
    window.location.reload()
  }

  function isDragSource(blockIdx: number, platformIdx: number): boolean {
    return dragSource?.blockIdx === blockIdx && dragSource?.platformIdx === platformIdx
  }

  function isDragOverCoords(blockIdx: number, platformIdx: number): boolean {
    return dragOver?.blockIdx === blockIdx && dragOver?.platformIdx === platformIdx
  }

  const totalCols = 2 + numPlatforms

  return (
    <>
      {/* Save/Regenerate header bar */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        {savedAt ? (
          <p className="text-xs text-raw-steel">
            Showing saved queue — last saved {new Date(savedAt).toLocaleString()}
          </p>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {isDirty && <span className="text-xs text-amber-400">Unsaved changes</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-patina-bronze px-4 py-1.5 text-xs font-bold text-parchment hover:bg-bright-bronze disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Queue'}
          </button>
          <button
            onClick={handleRegenerate}
            className="rounded-xl border border-raw-steel/30 px-4 py-1.5 text-xs text-raw-steel hover:text-parchment hover:border-parchment/50"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Color + Conflict Legend */}
      <div className="mb-4 rounded-lg border border-raw-steel/20 bg-charcoal p-4 print:hidden">
        {/* Row 1: Event colors */}
        <div className="mb-2 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-6 rounded bg-blue-950/80 border border-blue-800/40" />
            <span className="text-xs text-raw-steel">LC (Long Cycle)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-6 rounded bg-amber-950/80 border border-amber-800/40" />
            <span className="text-xs text-raw-steel">Jerk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-6 rounded bg-green-950/80 border border-green-800/40" />
            <span className="text-xs text-raw-steel">Snatch</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-6 rounded bg-charcoal border border-raw-steel/20" />
            <span className="text-xs text-raw-steel">Mixed / Empty</span>
          </div>
        </div>

        {/* Row 2: Conflict pills */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-950/40 text-red-400">REST</span>
            <span className="text-xs text-raw-steel">Insufficient rest between sets</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-950/40 text-amber-400">COACH</span>
            <span className="text-xs text-raw-steel">Coach competing same block as student</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-violet-950/40 text-violet-400">JUDGE</span>
            <span className="text-xs text-raw-steel">Judge assignment issue (own student / same club / unavailable)</span>
          </div>
        </div>
      </div>

      <ConflictPanel conflicts={conflicts} />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-raw-steel/20">
              <th className="px-2 py-2 text-left text-xs font-normal text-raw-steel w-16">Time</th>
              <th className="px-2 py-2 text-left text-xs font-normal text-raw-steel w-12">Block</th>
              {Array.from({ length: numPlatforms }, (_, i) => (
                <th key={i} className="px-2 py-2 text-left text-xs font-normal text-raw-steel">
                  Platform {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeBlocks.map((block, blockIdx) => (
              <>
                <tr
                  key={block.blockNumber}
                  className={`border-b border-raw-steel/20 ${getRowTintClass(block)} print:bg-transparent`}
                >
                  <td className="px-2 py-2 text-xs text-raw-steel align-top">
                    {formatTime(block.startTime)}
                  </td>
                  <td className="px-2 py-2 text-xs text-raw-steel align-top">
                    {block.blockNumber}
                  </td>
                  {block.platforms.map((slot: PlatformSlot | null, platformIdx: number) => {
                    const isSource = isDragSource(blockIdx, platformIdx)
                    const isOver = isDragOverCoords(blockIdx, platformIdx)
                    const isDraggable = slot != null

                    return (
                      <td
                        key={platformIdx}
                        className={[
                          'px-2 py-2 align-top transition-colors',
                          isDraggable ? 'cursor-grab' : '',
                          isSource ? 'opacity-50' : '',
                          isOver && dragSource ? 'border-2 border-dashed border-parchment/40 rounded' : '',
                        ].filter(Boolean).join(' ')}
                        draggable={isDraggable}
                        onDragStart={isDraggable ? () => handleDragStart({ blockIdx, platformIdx }) : undefined}
                        onDragOver={(e) => handleDragOver(e, { blockIdx, platformIdx })}
                        onDragEnter={() => handleDragEnter({ blockIdx, platformIdx })}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, { blockIdx, platformIdx })}
                        onDragEnd={handleDragEnd}
                      >
                        {slot ? (
                          <TimetableCell
                            slot={slot}
                            conflicts={conflictsByEntry.get(slot.entryId) ?? []}
                          />
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
                <InsertBlockRow
                  key={`insert-${blockIdx}`}
                  afterIndex={blockIdx}
                  colSpan={totalCols}
                  onInsertBlock={handleInsertBlock}
                />
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
