import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kova - Organizer',
  description: 'Kova competition organizer dashboard',
}

export default function OrganizerLayout({
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
