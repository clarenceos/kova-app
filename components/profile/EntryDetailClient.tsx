'use client'

import { useState, useEffect } from 'react'
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

  const lastTap = repTaps.length > 0 ? repTaps[repTaps.length - 1] : null
  const abbr = DISCIPLINE_ABBR[disciplineLabel] ?? disciplineLabel.slice(0, 3).toUpperCase()

  // Flash the last verdict for 1 second then fade
  useEffect(() => {
    if (!lastTap) return
    const timer = setTimeout(() => setFlashVisible(false), 1000)
    return () => clearTimeout(timer)
  }, [lastTap])

  return (
    <div className="flex flex-col gap-3">
      {/* Two-column layout: video + rep log */}
      <div className="flex gap-2" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
        {/* Left: YouTube embed 9:16 */}
        <div className="w-[65%] flex-shrink-0 overflow-hidden rounded-xl bg-charcoal">
          <div className="relative h-full w-full">
            <YouTubeEmbed videoId={videoId} onPlayerReady={() => {}} />
          </div>
        </div>

        {/* Right: flash verdict + rep pills */}
        <div className="flex flex-1 flex-col gap-2 min-w-0">
          {/* Flash verdict indicator */}
          {lastTap && (
            <div
              className={`flex h-16 flex-shrink-0 items-center justify-center rounded-xl bg-charcoal transition-opacity duration-500 ${
                flashVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {lastTap.type === 'rep' ? (
                <Check className="h-10 w-10 text-green-500" strokeWidth={3} />
              ) : (
                <X className="h-10 w-10 text-red-400" strokeWidth={3} />
              )}
            </div>
          )}

          {/* Rep count header */}
          {isJudged && (
            <div className="flex-shrink-0 text-center">
              <span className="text-2xl font-bold text-patina-bronze">{repCount}</span>
              <span className="ml-1 text-xs uppercase tracking-wider text-raw-steel">reps</span>
            </div>
          )}

          {/* Scrollable rep pills */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-xl bg-charcoal">
            {repTaps.length > 0 ? (
              <div className="flex flex-col gap-1 p-2">
                {repTaps.map((tap, idx) => {
                  const isRep = tap.type === 'rep'
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${
                        isRep
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-red-400/10 border border-red-400/20'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isRep ? (
                          <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="h-3 w-3 text-red-400 flex-shrink-0" />
                        )}
                        <span className={`text-xs font-medium ${isRep ? 'text-green-400' : 'text-red-300'}`}>
                          {idx + 1}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-raw-steel/60">
                        {tap.time !== null ? formatMMSS(tap.time) : '--:--'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-xs text-raw-steel/40">No rep data</p>
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
