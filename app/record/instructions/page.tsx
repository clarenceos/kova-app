'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRecord } from '@/lib/record-context'

export default function InstructionsPage() {
  const router = useRouter()
  const { serial, disciplineLabel, athleteName, weightKg } = useRecord()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!serial) {
      router.replace('/record')
    }
  }, [serial, router])

  const today = new Date().toISOString().split('T')[0]

  const description = `Athlete: ${athleteName}
Discipline: ${disciplineLabel ?? ''}
Kettlebell Weight: ${weightKg ?? ''} kg
Date: ${today}
Serial: ${serial}
Competition: TBD

Recorded with KOVA — Kettlebell Sport Competition Platform`

  async function handleCopy() {
    await navigator.clipboard.writeText(description)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!serial) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-white">Upload to YouTube</h1>

        <ol className="mt-6 space-y-3 text-sm text-zinc-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <span>
              Open YouTube at{' '}
              <span className="text-white font-medium">youtube.com</span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span>
              Click <span className="text-white font-medium">&ldquo;Create&rdquo;</span>{' '}
              &rarr; <span className="text-white font-medium">&ldquo;Upload video&rdquo;</span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span>Select your recorded video file</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center text-xs font-bold">
              4
            </span>
            <span>
              Set visibility to{' '}
              <span className="text-white font-medium">&ldquo;Unlisted&rdquo;</span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center text-xs font-bold">
              5
            </span>
            <span>
              Copy and paste the description below into the video description
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center text-xs font-bold">
              6
            </span>
            <span>
              Click <span className="text-white font-medium">&ldquo;Save&rdquo;</span>
            </span>
          </li>
        </ol>

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Video Description
          </h2>
          <textarea
            readOnly
            value={description}
            rows={10}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-white px-4 py-3 text-sm resize-none focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="mt-3 w-full py-3 px-6 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-200 active:bg-zinc-300 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

        <hr className="border-zinc-800 my-8" />

        <Link
          href="/dashboard"
          className="block w-full py-3 px-6 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 active:bg-zinc-600 transition-colors border border-zinc-700 text-center"
        >
          Done
        </Link>
      </div>
    </div>
  )
}
