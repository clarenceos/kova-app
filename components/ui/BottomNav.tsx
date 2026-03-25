'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Trophy, Video, BarChart2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_TABS = [
  { id: 'home', label: 'HOME', icon: Home, href: '/dashboard', locked: false },
  { id: 'competitions', label: 'COMPS', icon: Trophy, href: null, locked: true },
  { id: 'records', label: 'RECORDS', icon: Video, href: '/record', locked: false },
  { id: 'leaderboard', label: 'LEADERS', icon: BarChart2, href: '/leaderboard', locked: false },
  { id: 'profile', label: 'PROFILE', icon: User, href: null, locked: true },
] as const

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-raw-steel/20 bg-charcoal',
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_TABS.map((tab) => {
        const Icon = tab.icon

        if (tab.locked) {
          return (
            <div
              key={tab.id}
              className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-raw-steel opacity-40 cursor-default select-none"
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
            </div>
          )
        }

        const isActive =
          tab.href !== null &&
          (pathname === tab.href || pathname.startsWith(tab.href + '/'))

        return (
          <Link
            key={tab.id}
            href={tab.href!}
            className={cn(
              'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
              isActive ? 'text-patina-bronze' : 'text-raw-steel hover:text-parchment'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
