'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { KovaWordmark } from '@/components/ui/KovaWordmark'

const ROOT_PATHS = ['/dashboard', '/record', '/judge', '/leaderboard']

export function GlobalHeader() {
  const pathname = usePathname()
  const router = useRouter()

  const isRootPath = ROOT_PATHS.some(p => pathname === p || pathname === p + '/')

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-raw-steel/20 bg-charcoal px-4">
      <div className="flex w-full items-center justify-between">
        <KovaWordmark height={20} className="text-parchment" />
        {!isRootPath && (
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-raw-steel transition-colors hover:text-parchment active:bg-raw-steel/10"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  )
}
