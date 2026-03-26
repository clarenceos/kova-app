'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Smartphone, ArrowLeft } from 'lucide-react'
import { useRecord } from '@/lib/record-context'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { YouTubeUploader } from '@/components/record/YouTubeUploader'
import { buildYouTubeDescription } from '@/lib/youtube-description'

export default function PlaybackPage() {
  const router = useRouter()
  const { recordedBlob, serial, discipline, disciplineLabel, athleteName, weightKg, mimeType } =
    useRecord()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const [canPlayback, setCanPlayback] = useState(true)
  const [uploadStarted, setUploadStarted] = useState(false)
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)

  // Redirect to /record only if there's no blob AND upload hasn't started
  useEffect(() => {
    if (!recordedBlob && !uploadStarted) {
      router.replace('/record')
      return
    }
    if (!recordedBlob) return

    const url = URL.createObjectURL(recordedBlob)
    setBlobUrl(url)

    // iOS: always skip playback — canvas-recorded blobs are unreliable on iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isIOS) {
      setCanPlayback(false)
      return () => { URL.revokeObjectURL(url) }
    }

    // Detect MIME type mismatch on other platforms
    const testVideo = document.createElement('video')
    const support = testVideo.canPlayType(mimeType)
    if (support === '') {
      setCanPlayback(false)
    }

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [recordedBlob, router, mimeType, uploadStarted])

  // Warn if user tries to close/refresh while upload is in progress
  useEffect(() => {
    if (!showUploader || uploadComplete) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [showUploader, uploadComplete])

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

  const title = `KOVA | ${disciplineLabel ?? 'Lift'} | ${weightKg ?? ''}KG | ${athleteName} | ${serial}`
  const description = buildYouTubeDescription({
    athleteName,
    disciplineLabel: disciplineLabel ?? '',
    weightKg: weightKg ?? 0,
    serial,
  })
  const disciplineDb = discipline?.replace('-', '_') ?? 'long_cycle'

  return (
    <div className="min-h-screen bg-forge-black">
      <div className="flex h-14 items-center border-b border-raw-steel/20 px-4">
        <button
          type="button"
          onClick={() => {
            if (uploadComplete) {
              router.push('/record')
            } else {
              setShowLeaveWarning(true)
            }
          }}
          className="flex items-center gap-1 text-sm text-raw-steel hover:text-parchment transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-parchment">Review Your Recording</h1>
        <p className="mt-1 text-sm text-raw-steel">Serial: {serial}</p>

        {blobUrl && canPlayback && (
          <video
            src={blobUrl}
            controls
            playsInline
            className="mt-4 w-full rounded-xl bg-charcoal"
          />
        )}

        {blobUrl && !canPlayback && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-charcoal px-6 py-10 text-center">
            <Smartphone className="h-10 w-10 text-raw-steel" />
            <p className="text-parchment">Playback not supported on this device</p>
            <p className="text-sm text-raw-steel">
              Your video was recorded successfully. Tap Upload to YouTube to save it.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {!showUploader && !uploadComplete && (
            <>
              <button
                onClick={() => { setShowUploader(true); setUploadStarted(true) }}
                className="w-full rounded-xl bg-patina-bronze px-6 py-3 font-semibold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80"
              >
                Upload to YouTube
              </button>
              <button
                onClick={() => router.push('/record/instructions')}
                className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-6 py-3 font-semibold text-parchment transition-colors hover:border-patina-bronze/40 active:opacity-80"
              >
                Upload Manually
              </button>
            </>
          )}

          {uploadComplete && (
            <>
              <a
                href="/profile"
                className="block w-full rounded-xl bg-patina-bronze px-6 py-3 text-center font-semibold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80"
              >
                Done &mdash; Go to Profile
              </a>
              <button
                onClick={handleExport}
                className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-6 py-3 font-semibold text-parchment transition-colors hover:border-patina-bronze/40 active:opacity-80"
              >
                Save video file
              </button>
            </>
          )}
        </div>

        {showUploader && recordedBlob && (
          <div className="mt-4">
            <YouTubeUploader
              blob={recordedBlob}
              mimeType={mimeType}
              title={title}
              description={description}
              serial={serial}
              athleteName={athleteName}
              discipline={disciplineDb}
              weightKg={weightKg ?? 0}
              onUploadComplete={(url, id) => setUploadComplete(true)}
            />
          </div>
        )}

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

      <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this page?</AlertDialogTitle>
            <AlertDialogDescription>
              Your recording will be lost if you go back now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push('/record')}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Leave anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
