'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Check, X } from 'lucide-react'
import { YouTubeEmbed } from '@/components/judge/YouTubeEmbed'
import type { Rep } from '@/components/judge/RepCounter'

interface GhostReplayProps {
  videoId: string
  repTaps: Rep[]
}

interface ActiveIndicator {
  type: 'rep' | 'no-rep'
  key: number
}

export function GhostReplay({ videoId, repTaps }: GhostReplayProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null)
  const [activeIndicator, setActiveIndicator] = useState<ActiveIndicator | null>(null)
  const lastProcessedIndexRef = useRef<number>(0)
  const animFrameRef = useRef<number>(0)

  function triggerIndicator(type: 'rep' | 'no-rep') {
    setActiveIndicator({ type, key: Date.now() })
    setTimeout(() => setActiveIndicator(null), 600)
  }

  const pollReplay = useCallback(() => {
    if (!playerRef.current) return
    const currentTime = playerRef.current.getCurrentTime() as number

    // Handle seek backward: if currentTime is before the last processed tap, reset index
    const lastIdx = lastProcessedIndexRef.current
    if (
      lastIdx > 0 &&
      repTaps[lastIdx - 1]?.time !== null &&
      currentTime < (repTaps[lastIdx - 1].time! - 0.5)
    ) {
      // Seek backward detected — find the correct index for currentTime
      let newIdx = 0
      for (let i = 0; i < repTaps.length; i++) {
        if (repTaps[i].time !== null && repTaps[i].time! <= currentTime) {
          newIdx = i + 1
        } else {
          break
        }
      }
      lastProcessedIndexRef.current = newIdx
    }

    // Process any taps that should have fired by now
    while (lastProcessedIndexRef.current < repTaps.length) {
      const tap = repTaps[lastProcessedIndexRef.current]
      if (tap.time !== null && tap.time <= currentTime) {
        triggerIndicator(tap.type)
        lastProcessedIndexRef.current++
      } else {
        break
      }
    }

    animFrameRef.current = requestAnimationFrame(pollReplay)
  }, [repTaps])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handlePlayerReady(player: any) {
    playerRef.current = player
    lastProcessedIndexRef.current = 0
    animFrameRef.current = requestAnimationFrame(pollReplay)
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <div className="relative">
      <YouTubeEmbed videoId={videoId} onPlayerReady={handlePlayerReady} />

      {/* Ghost replay overlay */}
      {activeIndicator && (
        <div
          key={activeIndicator.key}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ animation: 'ghost-fade 600ms ease-out forwards' }}
        >
          {activeIndicator.type === 'rep' ? (
            <Check className="h-20 w-20 text-patina-bronze drop-shadow-lg" strokeWidth={3} />
          ) : (
            <X className="h-20 w-20 text-raw-steel drop-shadow-lg" strokeWidth={3} />
          )}
        </div>
      )}
    </div>
  )
}
