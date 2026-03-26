'use client'

import { useEffect, useRef, useState } from 'react'
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
import { restoreRecording, clearRecording } from '@/lib/recording-store'

export default function PlaybackPage() {
  const router = useRouter()
  const { recordedBlob, setRecordedBlob, serial, discipline, disciplineLabel, athleteName, weightKg, mimeType, setMimeType } =
    useRecord()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const [canPlayback, setCanPlayback] = useState(true)
  const [uploadStarted, setUploadStarted] = useState(false)
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [uploadFailed, setUploadFailed] = useState(false)
  const [recovering, setRecovering] = useState(false)

  // Refs to track latest values for delayed redirect timeout check
  const recordedBlobRef = useRef(recordedBlob)
  const uploadStartedRef = useRef(uploadStarted)
  useEffect(() => { recordedBlobRef.current = recordedBlob }, [recordedBlob])
  useEffect(() => { uploadStartedRef.current = uploadStarted }, [uploadStarted])

  // Redirect guard with IndexedDB recovery fallback
  useEffect(() => {
    if (recordedBlob) {
      // Normal path: blob exists, create URL
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
      if (support === '') setCanPlayback(false)

      return () => { URL.revokeObjectURL(url) }
    }

    if (uploadStarted) return  // Upload in progress, blob consumed -- don't redirect

    // No blob, no upload -- try IndexedDB recovery
    let cancelled = false
    setRecovering(true)

    restoreRecording().then(restored => {
      if (cancelled) return
      if (restored) {
        setRecordedBlob(restored.blob)
        setMimeType(restored.mimeType)
        setRecovering(false)
      } else {
        // Not in IndexedDB either -- wait 1s for slow context propagation
        setTimeout(() => {
          if (cancelled) return
          setRecovering(false)
          if (!recordedBlobRef.current && !uploadStartedRef.current) {
            router.replace('/record')
          }
        }, 1000)
      }
    })

    return () => { cancelled = true }
  }, [recordedBlob, router, mimeType, uploadStarted, setRecordedBlob, setMimeType])

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

  if (!recordedBlob) {
    if (recovering) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-forge-black">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-patina-bronze/30 border-t-patina-bronze" />
            <p className="text-sm text-raw-steel">Recovering recording...</p>
          </div>
        </div>
      )
    }
    return null
  }

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
                onClick={() => setShowDiscardDialog(true)}
                className="w-full rounded-xl border border-red-600/30 bg-charcoal px-6 py-3 font-semibold text-red-400 transition-colors hover:border-red-600/50 active:opacity-80"
              >
                Discard recording
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
              {mimeType.includes('webm') && (
                <button
                  onClick={handleExport}
                  className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-6 py-3 font-semibold text-parchment transition-colors hover:border-patina-bronze/40 active:opacity-80"
                >
                  Save video file
                </button>
              )}
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
              onUploadComplete={(url, id) => { setUploadComplete(true); void clearRecording() }}
              onUploadError={() => setUploadFailed(true)}
            />
          </div>
        )}

        {uploadFailed && !uploadComplete && (
          <div className="mt-3">
            <button
              onClick={() => router.push('/record/instructions')}
              className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-6 py-3 font-semibold text-parchment transition-colors hover:border-patina-bronze/40 active:opacity-80"
            >
              Upload Manually
            </button>
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

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this recording?</AlertDialogTitle>
            <AlertDialogDescription>
              This recording will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { void clearRecording(); setRecordedBlob(null); router.push('/record') }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
