'use client'

import { useTransition } from 'react'
import { togglePropertyFollow } from '@/app/actions/toggleFollow'

interface UnfollowButtonProps {
  propertyId: string
}

export function UnfollowButton({ propertyId }: UnfollowButtonProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await togglePropertyFollow(propertyId, true)
        })
      }
      className="text-sm text-slate-600 hover:text-slate-900 underline disabled:opacity-50"
      disabled={isPending}
    >
      Unfollow
    </button>
  )
}
