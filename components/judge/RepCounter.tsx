'use client'

import { useState } from 'react'
import { Check, X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Rep = { time: number | null; type: 'rep' | 'no-rep' }

function formatMMSS(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface RepCounterProps {
  reps: Rep[]
  playerReady: boolean
  onRep: () => void
  onNoRep: () => void
  onUndo: () => void
}

export function RepCounter({ reps, playerReady, onRep, onNoRep, onUndo }: RepCounterProps) {
  const [pulsing, setPulsing] = useState(false)

  const repCount = reps.filter(r => r.type === 'rep').length

  function handleRep() {
    navigator.vibrate?.(30)
    setPulsing(true)
    setTimeout(() => setPulsing(false), 150)
    onRep()
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Rep count */}
      <div className="py-2 text-center">
        <span className="text-7xl font-bold tabular-nums leading-none text-parchment">
          {repCount}
        </span>
        <p className="mt-1 text-sm uppercase tracking-widest text-raw-steel">reps</p>
      </div>

      {/* REP — primary action */}
      <button
        type="button"
        onClick={handleRep}
        disabled={!playerReady}
        className={cn(
          'w-full min-h-[72px] rounded-2xl text-2xl font-bold text-parchment select-none touch-manipulation transition-all',
          !playerReady
            ? 'bg-patina-bronze opacity-40 cursor-not-allowed'
            : pulsing
              ? 'bg-bright-bronze scale-[0.99]'
              : 'bg-patina-bronze hover:bg-bright-bronze active:scale-[0.98]'
        )}
        aria-label="Count rep"
      >
        REP
      </button>

      {/* NO REP + UNDO */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onNoRep}
          disabled={!playerReady}
          className={cn(
            'min-h-[48px] rounded-xl border text-sm font-semibold transition-colors touch-manipulation select-none',
            !playerReady
              ? 'border-raw-steel/30 text-raw-steel opacity-40 cursor-not-allowed'
              : 'border-raw-steel/50 text-raw-steel hover:border-raw-steel hover:text-parchment active:bg-raw-steel/10'
          )}
          aria-label="No rep"
        >
          NO REP
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={reps.length === 0}
          className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-raw-steel/20 text-sm font-medium text-raw-steel/60 transition-colors hover:border-raw-steel/50 hover:text-raw-steel active:bg-raw-steel/5 touch-manipulation select-none disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Undo last entry"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          UNDO
        </button>
      </div>

      {/* Rep log */}
      {reps.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-xl bg-charcoal">
          <div className="border-b border-raw-steel/10 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-raw-steel">
              Rep Log
            </p>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {[...reps].reverse().map((rep, revIdx) => {
              const seqNum = reps.length - revIdx
              const isRep = rep.type === 'rep'
              return (
                <div
                  key={reps.length - 1 - revIdx}
                  className="flex items-center justify-between border-b border-raw-steel/10 px-3 py-2 last:border-b-0"
                >
                  <span className="text-sm text-raw-steel">#{seqNum}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-raw-steel/60">
                      {rep.time !== null ? formatMMSS(rep.time) : '--:--'}
                    </span>
                    {isRep
                      ? <Check className="h-4 w-4 text-patina-bronze" />
                      : <X className="h-4 w-4 text-raw-steel" />
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
