'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRecord } from '@/lib/record-context'
import type { Discipline } from '@/lib/record-context'

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
    // canvas.captureStream is the key API needed for recording
    const canvas = document.createElement('canvas')
    setSupported(typeof canvas.captureStream === 'function')
  }, [])

  // Loading state — render nothing until detection is complete
  if (supported === null) {
    return null
  }

  // Unsupported browser (iOS pre-18.4 or any browser without captureStream)
  if (supported === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-4">Browser Not Supported</h1>
          <p className="text-zinc-400 mb-8">
            Kova recorder requires Chrome on Android or a desktop browser. iOS is not supported.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-zinc-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 active:bg-zinc-600"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Supported browser — show discipline selection
  function handleSelect(id: Discipline, label: string) {
    setDiscipline(id)
    setDisciplineLabel(label)
    router.push('/record/recording')
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 px-4 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-8 text-2xl font-bold text-white">Select Discipline</h1>
        <div className="flex flex-col gap-4">
          {disciplines.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleSelect(id, label)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-8 text-center text-xl font-semibold text-white transition-colors hover:border-zinc-600 active:bg-zinc-800"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
