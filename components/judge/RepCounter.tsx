'use client'

function formatMMSS(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface RepCounterProps {
  reps: number[]
  onRep: () => void
  onUndo: () => void
}

export function RepCounter({ reps, onRep, onUndo }: RepCounterProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Rep count display */}
      <div className="text-center py-4">
        <span className="text-8xl font-bold text-white tabular-nums">
          {reps.length}
        </span>
        <p className="text-zinc-400 text-sm mt-1">reps</p>
      </div>

      {/* Large tap target */}
      <button
        type="button"
        onClick={onRep}
        className="w-full min-h-40 bg-white text-zinc-950 font-bold text-2xl rounded-2xl active:bg-zinc-200 transition-colors select-none touch-manipulation"
        aria-label="Count rep"
      >
        TAP
      </button>

      {/* Undo button */}
      <button
        type="button"
        onClick={onUndo}
        disabled={reps.length === 0}
        className="w-full py-3 border border-zinc-700 rounded-xl text-zinc-300 text-sm font-medium hover:border-zinc-600 hover:text-white active:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Undo Last Rep
      </button>

      {/* Rep log */}
      {reps.length > 0 && (
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Rep Log</p>
          </div>
          <div className="overflow-y-auto max-h-48">
            {reps.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 last:border-b-0"
              >
                <span className="text-sm text-zinc-300">Rep {i + 1}</span>
                <span className="text-sm text-zinc-500 font-mono">
                  {t > 0 ? formatMMSS(t) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
