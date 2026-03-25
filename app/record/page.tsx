'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRecord } from '@/lib/record-context'
import type { Discipline } from '@/lib/record-context'
import { GlobalHeader } from '@/components/ui/GlobalHeader'
import { BottomNav } from '@/components/ui/BottomNav'

const disciplines: { id: Discipline; label: string }[] = [
  { id: 'long-cycle', label: '10 Min. Long Cycle' },
  { id: 'jerk', label: '10 Min. Jerk' },
  { id: 'snatch', label: '10 Min. Snatch' },
]

export default function RecordPage() {
  const router = useRouter()
  const { setDiscipline, setDisciplineLabel } = useRecord()
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    setSupported(typeof canvas.captureStream === 'function')
  }, [])

  if (supported === null) return null

  if (supported === false) {
    return (
      <div className="flex min-h-screen flex-col bg-forge-black">
        <GlobalHeader />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
          <h1 className="mb-4 text-2xl font-bold text-parchment">Browser Not Supported</h1>
          <p className="mb-8 text-raw-steel">
            Kova recorder requires Chrome on Android or a desktop browser. iOS is not supported.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-xl border border-raw-steel/30 px-6 py-3 text-sm font-medium text-parchment transition-colors hover:border-patina-bronze/40 active:bg-charcoal"
          >
            Back to Dashboard
          </Link>
        </main>
        <BottomNav />
      </div>
    )
  }

  function handleSelect(id: Discipline, label: string) {
    setDiscipline(id)
    setDisciplineLabel(label)
    router.push('/record/recording')
  }

  return (
    <div className="flex min-h-screen flex-col bg-forge-black">
      <GlobalHeader />
      <main className="flex-1 px-4 py-8 pb-20">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="mb-8 text-2xl font-bold text-parchment">Select Discipline</h1>
          <div className="flex flex-col gap-4">
            {disciplines.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleSelect(id, label)}
                className="w-full rounded-2xl border border-raw-steel/20 bg-charcoal px-6 py-8 text-center text-xl font-semibold text-parchment transition-all hover:border-patina-bronze/40 active:scale-[0.98]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
