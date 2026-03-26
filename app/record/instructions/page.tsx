'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRecord } from '@/lib/record-context'
import { GlobalHeader } from '@/components/ui/GlobalHeader'
import { buildYouTubeDescription } from '@/lib/youtube-description'

export default function InstructionsPage() {
  const router = useRouter()
  const { serial, disciplineLabel, athleteName, weightKg, recordedBlob } = useRecord()
  const [copied, setCopied] = useState(false)

  // serial is always set by the layout (never falsy); use recordedBlob as the guard for direct navigation
  useEffect(() => {
    if (!recordedBlob) {
      router.replace('/record')
    }
  }, [recordedBlob, router])

  const description = buildYouTubeDescription({
    athleteName,
    disciplineLabel: disciplineLabel ?? '',
    weightKg: weightKg ?? 0,
    serial,
  })

  async function handleCopy() {
    await navigator.clipboard.writeText(description)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!recordedBlob) return null

  const stepClass =
    'flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full border border-patina-bronze/30 bg-charcoal text-xs font-bold text-parchment'

  return (
    <div className="min-h-screen bg-forge-black">
      <GlobalHeader />
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-parchment">Upload to YouTube</h1>

        <ol className="mt-6 space-y-3 text-sm text-raw-steel">
          <li className="flex gap-3">
            <span className={stepClass}>1</span>
            <span>
              Open YouTube at{' '}
              <span className="font-medium text-parchment">youtube.com</span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className={stepClass}>2</span>
            <span>
              Click <span className="font-medium text-parchment">&ldquo;Create&rdquo;</span>{' '}
              &rarr; <span className="font-medium text-parchment">&ldquo;Upload video&rdquo;</span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className={stepClass}>3</span>
            <span>Select your recorded video file</span>
          </li>
          <li className="flex gap-3">
            <span className={stepClass}>4</span>
            <span>
              Set visibility to{' '}
              <span className="font-medium text-parchment">&ldquo;Unlisted&rdquo;</span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className={stepClass}>5</span>
            <span>Copy and paste the description below into the video description</span>
          </li>
          <li className="flex gap-3">
            <span className={stepClass}>6</span>
            <span>
              Click <span className="font-medium text-parchment">&ldquo;Save&rdquo;</span>
            </span>
          </li>
        </ol>

        <div className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-raw-steel">
            Video Description
          </h2>
          <textarea
            readOnly
            value={description}
            rows={10}
            className="w-full resize-none rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-sm text-parchment focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="mt-3 w-full rounded-xl bg-patina-bronze px-6 py-3 font-semibold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

        <hr className="my-8 border-raw-steel/20" />

        <Link
          href="/dashboard"
          className="block w-full rounded-xl border border-raw-steel/30 bg-charcoal px-6 py-3 text-center font-semibold text-parchment transition-colors hover:border-patina-bronze/40 active:opacity-80"
        >
          Done
        </Link>
      </div>
    </div>
  )
}
