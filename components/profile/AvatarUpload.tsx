'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import { updateAvatar } from '@/lib/actions/profile'

interface AvatarUploadProps {
  currentUrl?: string | null
  clerkImageUrl?: string
  name: string
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round((h * maxSize) / w); w = maxSize }
          else { w = Math.round((w * maxSize) / h); h = maxSize }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas not supported')); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function AvatarUpload({ currentUrl, clerkImageUrl, name }: AvatarUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const avatarSrc = currentUrl || clerkImageUrl || null

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const base64 = await resizeImage(file, 200)
      const result = await updateAvatar(base64)
      if ('error' in result) {
        alert(result.error)
      } else {
        router.refresh()
      }
    } catch {
      alert('Failed to upload image')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="relative h-16 w-16 flex-shrink-0">
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={name}
          className="h-16 w-16 rounded-full border-2 border-raw-steel/20 object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-raw-steel/20 bg-charcoal">
          <span className="text-lg font-bold text-patina-bronze">{getInitials(name)}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-raw-steel/30 bg-charcoal text-raw-steel transition-colors hover:text-parchment hover:border-patina-bronze/40 disabled:opacity-50"
      >
        <Camera className="h-3.5 w-3.5" />
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
