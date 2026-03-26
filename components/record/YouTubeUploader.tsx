'use client'

import { useState, useEffect, useRef } from 'react'
import { getYouTubeToken } from '@/lib/actions/youtube'
import { createEntry } from '@/lib/actions/entries'

interface YouTubeUploaderProps {
  blob: Blob
  mimeType: string
  title: string
  description: string
  serial: string
  athleteName: string
  discipline: string // underscored format: 'long_cycle'
  weightKg: number
  onUploadComplete: (youtubeUrl: string, youtubeId: string) => void
}

type UploadStatus =
  | 'idle'
  | 'authenticating'
  | 'uploading'
  | 'saving'
  | 'complete'
  | 'error'
  | 'google_not_connected'

export function YouTubeUploader({
  blob,
  mimeType,
  title,
  description,
  serial,
  athleteName,
  discipline,
  weightKg,
  onUploadComplete,
}: YouTubeUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)
  const uploadStartedRef = useRef(false)

  // Auto-start upload on mount — no second tap required
  useEffect(() => {
    if (!uploadStartedRef.current) {
      uploadStartedRef.current = true
      handleUpload()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpload() {
    setStatus('authenticating')
    setErrorMessage('')
    setProgress(0)

    // Step 1 — Get OAuth token
    const tokenResult = await getYouTubeToken()

    if ('error' in tokenResult) {
      if (tokenResult.error === 'google_not_connected') {
        setStatus('google_not_connected')
        return
      }
      setStatus('error')
      setErrorMessage(tokenResult.error)
      return
    }

    const { token } = tokenResult

    // Step 2 — Initiate resumable upload
    setStatus('uploading')
    setProgress(0)

    let uploadUri: string
    try {
      const initResponse = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Length': String(blob.size),
            'X-Upload-Content-Type': mimeType,
          },
          body: JSON.stringify({
            snippet: {
              title,
              description,
              tags: ['kova', 'kettlebell', discipline.replace('_', ' '), 'competition'],
              categoryId: '17',
            },
            status: {
              privacyStatus: 'unlisted',
            },
          }),
        }
      )

      if (!initResponse.ok) {
        const text = await initResponse.text()
        setStatus('error')
        setErrorMessage(`Failed to start upload: ${initResponse.status} ${initResponse.statusText}. ${text}`)
        return
      }

      const location = initResponse.headers.get('Location')
      if (!location) {
        setStatus('error')
        setErrorMessage('YouTube did not return an upload URI. Please try again.')
        return
      }
      uploadUri = location
    } catch (err) {
      setStatus('error')
      setErrorMessage('Network error while starting upload. Check your connection and try again.')
      return
    }

    // Step 3 — Upload blob with progress via XMLHttpRequest
    let videoId: string
    try {
      videoId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUri)
        xhr.setRequestHeader('Content-Type', mimeType)

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              const data = JSON.parse(xhr.responseText)
              if (!data.id) {
                reject(new Error('YouTube response missing video ID'))
              } else {
                resolve(data.id)
              }
            } catch {
              reject(new Error('Failed to parse YouTube response'))
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`))
          }
        }

        xhr.onerror = () => {
          reject(new Error('Network error during upload'))
        }

        xhr.send(blob)
      })
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      return
    }

    const uploadedUrl = `https://youtube.com/watch?v=${videoId}`

    // Step 4 — Save entry to DB
    setStatus('saving')

    const saveResult = await createEntry({
      athleteName,
      discipline,
      weightKg,
      serial,
      youtubeUrl: uploadedUrl,
      youtubeId: videoId,
    })

    if ('error' in saveResult) {
      setStatus('error')
      setErrorMessage(`Upload succeeded but failed to save entry: ${saveResult.error}`)
      return
    }

    setStatus('complete')
    setYoutubeUrl(uploadedUrl)
    onUploadComplete(uploadedUrl, videoId)
  }

  if (status === 'idle') {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-patina-bronze/60 px-6 py-3 font-semibold text-parchment"
      >
        Connecting to YouTube...
      </button>
    )
  }

  if (status === 'authenticating') {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-patina-bronze/60 px-6 py-3 font-semibold text-parchment"
      >
        Connecting to YouTube...
      </button>
    )
  }

  if (status === 'uploading') {
    return (
      <div className="rounded-xl border border-raw-steel/20 bg-charcoal p-4 space-y-3">
        <p className="text-sm font-semibold text-parchment">Uploading to YouTube...</p>
        <div className="h-3 w-full rounded-full bg-forge-black overflow-hidden">
          <div
            className="h-full rounded-full bg-patina-bronze transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-raw-steel text-right">{progress}%</p>
      </div>
    )
  }

  if (status === 'saving') {
    return (
      <div className="rounded-xl border border-raw-steel/20 bg-charcoal p-4">
        <p className="text-sm text-raw-steel">Saving entry...</p>
      </div>
    )
  }

  if (status === 'complete' && youtubeUrl) {
    return (
      <div className="rounded-2xl border border-patina-bronze/30 bg-charcoal p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg text-patina-bronze">&#10003;</span>
          <p className="font-semibold text-parchment">Upload Complete</p>
        </div>
        <p className="text-xs text-raw-steel font-mono">{serial}</p>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl bg-patina-bronze px-6 py-3 text-center font-semibold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80"
        >
          View on YouTube
        </a>
      </div>
    )
  }

  if (status === 'google_not_connected') {
    return (
      <div className="rounded-xl border border-raw-steel/20 bg-charcoal p-4 space-y-3">
        <p className="text-sm text-parchment font-semibold">Connect your Google account first</p>
        <p className="text-sm text-raw-steel">
          Link your Google account to enable direct YouTube uploads.
        </p>
        <a
          href="/user-profile"
          className="block w-full rounded-xl bg-patina-bronze px-6 py-3 text-center font-semibold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80"
        >
          Connect Google Account
        </a>
        <a
          href="/record/instructions"
          className="block w-full rounded-xl border border-raw-steel/30 bg-forge-black px-6 py-3 text-center font-semibold text-parchment transition-colors hover:border-patina-bronze/40 active:opacity-80"
        >
          Skip — Upload Manually
        </a>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl border border-raw-steel/20 bg-charcoal p-4 space-y-3">
        <p className="text-sm font-semibold text-parchment">Upload failed</p>
        <p className="text-sm text-raw-steel">{errorMessage}</p>
        <button
          onClick={handleUpload}
          className="w-full rounded-xl bg-patina-bronze px-6 py-3 font-semibold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80"
        >
          Retry
        </button>
      </div>
    )
  }

  return null
}
