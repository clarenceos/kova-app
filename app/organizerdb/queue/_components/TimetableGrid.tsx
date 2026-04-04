'use client'

import { useState } from 'react'
import type { TimeBlock, Conflict, PlatformSlot } from '@/lib/queue/types'
import { detectConflicts } from '@/lib/queue/detectConflicts'
import { TimetableCell } from './TimetableCell'
import { ConflictPanel } from './ConflictPanel'

interface TimetableGridProps {
  initialTimeBlocks: TimeBlock[]
  numPlatforms: number
  initialConflicts: Conflict[]
  minRestBlocks: number
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
}: TimetableGridProps) {
  const [timeBlocks, setTimeBlocks] = useState(initialTimeBlocks)
  const [conflicts, setConflicts] = useState(initialConflicts)
  const [dragSource, setDragSource] = useState<CellCoords | null>(null)
  const [dragOver, setDragOver] = useState<CellCoords | null>(null)

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
      // Dropped on self — no-op
      setDragSource(null)
      setDragOver(null)
      return
    }

    const newBlocks = structuredClone(timeBlocks)
    const srcBlock = newBlocks[dragSource.blockIdx]
    const dstBlock = newBlocks[dest.blockIdx]
    // Swap the two slots (handles null <-> filled and filled <-> filled)
    const temp = srcBlock.platforms[dragSource.platformIdx]
    srcBlock.platforms[dragSource.platformIdx] = dstBlock.platforms[dest.platformIdx]
    dstBlock.platforms[dest.platformIdx] = temp

    setTimeBlocks(newBlocks)
    // Recalculate conflicts live after swap
    const newConflicts = detectConflicts(newBlocks, minRestBlocks)
    setConflicts(newConflicts)
    setDragSource(null)
    setDragOver(null)
  }

  function handleDragEnd() {
    setDragSource(null)
    setDragOver(null)
  }

  function isDragSource(blockIdx: number, platformIdx: number): boolean {
    return dragSource?.blockIdx === blockIdx && dragSource?.platformIdx === platformIdx
  }

  function isDragOver(blockIdx: number, platformIdx: number): boolean {
    return dragOver?.blockIdx === blockIdx && dragOver?.platformIdx === platformIdx
  }

  return (
    <>
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
                  const isOver = isDragOver(blockIdx, platformIdx)
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
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
