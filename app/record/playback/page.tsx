'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRecord } from '@/lib/record-context'

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

  if (!recordedBlob) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-white">Review Your Recording</h1>
        <p className="mt-1 text-sm text-zinc-400">Serial: {serial}</p>

        {blobUrl && (
          <video
            src={blobUrl}
            controls
            playsInline
            className="w-full rounded-xl mt-4 bg-zinc-900"
          />
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleExport}
            className="w-full py-3 px-6 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-200 active:bg-zinc-300 transition-colors"
          >
            Render and Export
          </button>

          <button
            onClick={() => router.push('/record/instructions')}
            className="w-full py-3 px-6 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 active:bg-zinc-600 transition-colors border border-zinc-700"
          >
            Next: Upload to YouTube &rarr;
          </button>
        </div>

        {(disciplineLabel || weightKg) && (
          <div className="mt-6 rounded-xl border border-zinc-800 p-4 text-sm text-zinc-400 space-y-1">
            {disciplineLabel && (
              <p>
                Discipline: <span className="text-zinc-200">{disciplineLabel}</span>
              </p>
            )}
            {weightKg && (
              <p>
                Weight: <span className="text-zinc-200">{weightKg} kg</span>
              </p>
            )}
            <p>
              Athlete: <span className="text-zinc-200">{athleteName}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
