import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { RecordProvider } from '@/lib/record-context'
import { generateSerial } from '@/lib/serial'

interface RecordLayoutProps {
  children: React.ReactNode
}

export default async function RecordLayout({ children }: RecordLayoutProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const name = user?.publicMetadata?.name as string | undefined

  if (!name) redirect('/onboarding')

  const serial = await generateSerial()

  return (
    <RecordProvider athleteName={name} serial={serial}>
      {children}
    </RecordProvider>
  )
}
