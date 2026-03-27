import type { Metadata, Viewport } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { RecordProvider } from '@/lib/record-context'
import { generateSerial } from '@/lib/serial'
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

interface RecordLayoutProps {
  children: React.ReactNode
}

export default async function RecordLayout({ children }: RecordLayoutProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profile = await ensureProfile()
  if (!profile) redirect('/dashboard')

  const serial = await generateSerial()

  return (
    <RecordProvider athleteName={profile.name} serial={serial}>
      {children}
    </RecordProvider>
  )
}
