'use client'

import { useClerk } from '@clerk/nextjs'

export function SignOutButton() {
  const { signOut } = useClerk()

  return (
    <button
      onClick={() => signOut({ redirectUrl: '/sign-in' })}
      className="text-sm text-raw-steel transition-colors hover:text-parchment"
    >
      Sign Out
    </button>
  )
}
