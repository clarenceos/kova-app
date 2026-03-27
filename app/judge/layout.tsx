import type { Metadata, Viewport } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { JudgeSessionProvider } from '@/lib/judge-context'
import { ensureProfile } from '@/lib/actions/profile'

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kova',
  },
}

export const viewport: Viewport = {
  themeColor: '#0D0D0D',
  viewportFit: 'cover',
}

export default async function JudgeLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profile = await ensureProfile()
  if (!profile) redirect('/dashboard')

  return <JudgeSessionProvider>{children}</JudgeSessionProvider>
}
