import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    let id: string | null = null

    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split('/')[0]
    } else if (u.hostname.replace(/^(www\.|m\.)/, '').endsWith('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) {
        id = u.pathname.replace('/shorts/', '').split('/')[0]
      } else {
        id = u.searchParams.get('v')
      }
    }

    if (id && /^[\w-]{11}$/.test(id)) return id
    return null
  } catch {
    return null
  }
}
