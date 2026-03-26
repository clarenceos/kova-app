'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

// Module-level state — persists across component mounts, prevents double-init
let ytApiState: 'idle' | 'loading' | 'ready' = 'idle'
const pendingInits: Array<() => void> = []

interface YouTubeEmbedProps {
  videoId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPlayerReady: (player: any) => void
  onPlayingChange?: (isPlaying: boolean) => void
}

export function YouTubeEmbed({ videoId, onPlayerReady, onPlayingChange }: YouTubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    function initPlayer() {
      if (!mountedRef.current || !containerRef.current) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 0, controls: 1, rel: 0 },
        events: {
          onReady: () => {
            if (mountedRef.current) onPlayerReady(playerRef.current)
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (event: any) => {
            if (mountedRef.current && onPlayingChange) {
              onPlayingChange(event.data === 1) // 1 = YT.PlayerState.PLAYING
            }
          },
        },
      })
    }

    if (ytApiState === 'ready') {
      initPlayer()
    } else if (ytApiState === 'idle') {
      ytApiState = 'loading'
      window.onYouTubeIframeAPIReady = () => {
        ytApiState = 'ready'
        pendingInits.forEach(fn => fn())
        pendingInits.length = 0
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
      pendingInits.push(initPlayer)
    } else {
      // still loading — queue for when the callback fires
      pendingInits.push(initPlayer)
    }

    return () => {
      mountedRef.current = false
      playerRef.current?.destroy()
      playerRef.current = null
    }
  // videoId intentionally not in deps — player is initialized once per mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="w-full h-full bg-charcoal overflow-hidden">
      <div ref={containerRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
