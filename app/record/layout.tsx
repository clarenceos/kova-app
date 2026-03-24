import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { RecordProvider } from '@/lib/record-context'

interface RecordLayoutProps {
  children: React.ReactNode
}

export default async function RecordLayout({ children }: RecordLayoutProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const name = user?.publicMetadata?.name as string | undefined

  if (!name) redirect('/onboarding')

  return (
    <RecordProvider athleteName={name}>
      {children}
    </RecordProvider>
  )
}
