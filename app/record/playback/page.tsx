'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRecord } from '@/lib/record-context'
import { GlobalHeader } from '@/components/ui/GlobalHeader'

export default function PlaybackPage() {
  const router = useRouter()
  const { recordedBlob, serial, discipline, disciplineLabel, athleteName, weightKg, mimeType } =
    useRecord()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!recordedBlob) {
      router.replace('/record')
      return
    }
    const url = URL.createObjectURL(recordedBlob)
    setBlobUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [recordedBlob, router])

  function handleExport() {
    if (!recordedBlob || !blobUrl) return
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
    const nameSlug = athleteName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    const disciplineSlug = discipline ?? 'unknown'
    const filename = `kova-${disciplineSlug}-${nameSlug}-${serial}.${ext}`
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.click()
  }

  if (!recordedBlob) return null

  return (
    <div className="min-h-screen bg-forge-black">
      <GlobalHeader />
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-parchment">Review Your Recording</h1>
        <p className="mt-1 text-sm text-raw-steel">Serial: {serial}</p>

        {blobUrl && (
          <video
            src={blobUrl}
            controls
            playsInline
            className="mt-4 w-full rounded-xl bg-charcoal"
          />
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleExport}
            className="w-full rounded-xl bg-patina-bronze px-6 py-3 font-semibold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80"
          >
            Render and Export
          </button>

          <button
            onClick={() => router.push('/record/instructions')}
            className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-6 py-3 font-semibold text-parchment transition-colors hover:border-patina-bronze/40 active:opacity-80"
          >
            Next: Upload to YouTube &rarr;
          </button>
        </div>

        {(disciplineLabel || weightKg) && (
          <div className="mt-6 space-y-1 rounded-xl border border-raw-steel/20 bg-charcoal p-4 text-sm">
            {disciplineLabel && (
              <p className="text-raw-steel">
                Discipline: <span className="text-parchment">{disciplineLabel}</span>
              </p>
            )}
            {weightKg && (
              <p className="text-raw-steel">
                Weight: <span className="text-parchment">{weightKg} kg</span>
              </p>
            )}
            <p className="text-raw-steel">
              Athlete: <span className="text-parchment">{athleteName}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
