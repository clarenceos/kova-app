'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, X, Download } from 'lucide-react'
import { YouTubeEmbed } from '@/components/judge/YouTubeEmbed'
import type { Rep } from '@/components/judge/RepCounter'

interface EntryDetailClientProps {
  videoId: string
  repTaps: Rep[]
  serial: string | null
  disciplineLabel: string
  weightKg: number
  isJudged: boolean
  repCount: number
}

const DISCIPLINE_ABBR: Record<string, string> = {
  'Long Cycle': 'LC',
  'Jerk': 'JRK',
  'Snatch': 'SN',
}

function formatMMSS(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function exportCSV(repTaps: Rep[], serial: string | null) {
  const header = 'Rep,Timestamp,Verdict\n'
  const rows = repTaps.map((tap, i) => {
    const time = tap.time !== null ? formatMMSS(tap.time) : '--:--'
    const verdict = tap.type === 'rep' ? 'rep' : 'no-rep'
    return `${i + 1},${time},${verdict}`
  }).join('\n')
  const csv = header + rows
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kova-${serial ?? 'entry'}-reps.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function EntryDetailClient({
  videoId,
  repTaps,
  serial,
  disciplineLabel,
  weightKg,
  isJudged,
  repCount,
}: EntryDetailClientProps) {
  const [flashVisible, setFlashVisible] = useState(true)
  const [activeRepIdx, setActiveRepIdx] = useState<number>(-1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pillRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const lastTap = repTaps.length > 0 ? repTaps[repTaps.length - 1] : null
  const abbr = DISCIPLINE_ABBR[disciplineLabel] ?? disciplineLabel.slice(0, 3).toUpperCase()

  // Flash the last verdict for 1 second then fade
  useEffect(() => {
    if (!lastTap) return
    const timer = setTimeout(() => setFlashVisible(false), 1000)
    return () => clearTimeout(timer)
  }, [lastTap])

  // Time-sync: poll player time and highlight the current rep
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlayerReady = useCallback((player: any) => {
    playerRef.current = player
    intervalRef.current = setInterval(() => {
      try {
        const currentTime = player.getCurrentTime() as number
        let lastIdx = -1
        for (let i = 0; i < repTaps.length; i++) {
          if (repTaps[i].time !== null && repTaps[i].time! <= currentTime) {
            lastIdx = i
          } else {
            break
          }
        }
        setActiveRepIdx(lastIdx)
      } catch {
        // Player not ready or destroyed — ignore
      }
    }, 1000)
  }, [repTaps])

  // Auto-scroll the active pill into view
  useEffect(() => {
    if (activeRepIdx >= 0 && pillRefs.current[activeRepIdx] && scrollContainerRef.current) {
      pillRefs.current[activeRepIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeRepIdx])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      {/* Two-column layout: video + rep log — both top-aligned */}
      <div className="flex items-start gap-2" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
        {/* Left: YouTube embed */}
        <div className="w-[80%] h-full flex-shrink-0 overflow-hidden rounded-xl bg-charcoal">
          <div className="relative h-full w-full">
            <YouTubeEmbed videoId={videoId} onPlayerReady={handlePlayerReady} />
          </div>
        </div>

        {/* Right: flash verdict + rep pills — anchored to top */}
        <div className="flex h-full flex-1 flex-col gap-1 min-w-0">
          {/* Flash verdict indicator */}
          {lastTap && (
            <div
              className={`flex h-12 flex-shrink-0 items-center justify-center rounded-lg bg-charcoal transition-opacity duration-500 ${
                flashVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {lastTap.type === 'rep' ? (
                <Check className="h-8 w-8 text-green-500" strokeWidth={3} />
              ) : (
                <X className="h-8 w-8 text-red-400" strokeWidth={3} />
              )}
            </div>
          )}

          {/* Rep count header */}
          {isJudged && (
            <div className="flex-shrink-0 text-center py-1">
              <span className="text-xl font-bold text-patina-bronze">{repCount}</span>
              <span className="ml-1 text-[10px] uppercase tracking-wider text-raw-steel">reps</span>
            </div>
          )}

          {/* Scrollable rep pills */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden rounded-lg bg-charcoal">
            {repTaps.length > 0 ? (
              <div className="flex flex-col gap-0.5 p-1">
                {repTaps.map((tap, idx) => {
                  const isRep = tap.type === 'rep'
                  const isActive = idx === activeRepIdx
                  return (
                    <div
                      key={idx}
                      ref={(el) => { pillRefs.current[idx] = el }}
                      className={`flex items-center gap-1 rounded-md border border-patina-bronze/15 bg-patina-bronze/5 px-1.5 py-1 transition-all duration-200 ${
                        isActive ? 'ring-2 ring-parchment/60 border-parchment/40' : ''
                      }`}
                    >
                      {isRep ? (
                        <Check className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-2.5 w-2.5 text-red-400 flex-shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-medium text-parchment/80">{idx + 1}</span>
                        <span className="font-mono text-[9px] text-raw-steel/50 leading-none">
                          {tap.time !== null ? formatMMSS(tap.time) : '--:--'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-2 text-center">
                <p className="text-[10px] text-raw-steel/40">No rep data</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom strip: compact card + export */}
      <div className="flex items-center justify-between rounded-xl border border-raw-steel/20 bg-charcoal px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-sm font-bold text-parchment truncate">{serial ?? '—'}</span>
          <span className="text-xs text-raw-steel flex-shrink-0">{abbr} {weightKg}kg</span>
          {isJudged ? (
            <span className="rounded-full border border-patina-bronze/40 bg-patina-bronze/20 px-2 py-0.5 text-[10px] font-semibold text-patina-bronze flex-shrink-0">
              JUDGED
            </span>
          ) : (
            <span className="rounded-full border border-raw-steel/40 bg-raw-steel/20 px-2 py-0.5 text-[10px] font-semibold text-raw-steel flex-shrink-0">
              PENDING
            </span>
          )}
        </div>

        {repTaps.length > 0 && (
          <button
            type="button"
            onClick={() => exportCSV(repTaps, serial)}
            className="flex items-center gap-1 rounded-lg border border-raw-steel/20 px-2.5 py-1.5 text-xs text-raw-steel transition-colors hover:text-parchment hover:border-raw-steel/40 flex-shrink-0"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        )}
      </div>
    </div>
  )
}
