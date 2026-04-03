import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kova - Registration',
  description: 'Register for a Kova kettlebell sport competition',
}

export default function RegistrationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {children}
    </main>
  )
}
