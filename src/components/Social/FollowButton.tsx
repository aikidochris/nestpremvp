'use client'

'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { togglePropertyFollow } from '@/app/actions/toggleFollow'

interface FollowButtonProps {
  propertyId: string
  initialIsFollowed: boolean
  isCompact?: boolean
  isFollowed?: boolean
  onToggleFollow?: () => Promise<void> | void
  onToggleSuccess?: (isNowFollowed: boolean) => void
}

export default function FollowButton({
  propertyId,
  initialIsFollowed,
  isCompact = false,
  isFollowed: controlledIsFollowed,
  onToggleFollow,
}: FollowButtonProps) {
  const isControlled = controlledIsFollowed !== undefined
  const [internalFollowed, setInternalFollowed] = useState(initialIsFollowed)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isControlled && controlledIsFollowed !== undefined) {
      setInternalFollowed(controlledIsFollowed)
    }
  }, [controlledIsFollowed, isControlled])

  const currentFollowed = isControlled ? controlledIsFollowed ?? false : internalFollowed

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 300)

    if (onToggleFollow) {
      await onToggleFollow()
      onToggleSuccess?.(!currentFollowed)
      clearTimeout(timer)
      setIsAnimating(false)
      return
    }

    const next = !currentFollowed
    setInternalFollowed(next)

    const result = await togglePropertyFollow(propertyId, !next)
    if (!result?.success) {
      setInternalFollowed(!next) // revert on failure
    } else {
      onToggleSuccess?.(next)
    }

    clearTimeout(timer)
    setIsAnimating(false)
  }

  const baseClasses = `group relative flex items-center justify-center transition-all duration-200 ease-out ${
    isCompact ? 'p-2' : 'p-3 rounded-full bg-white/80 backdrop-blur-md shadow-sm hover:bg-white hover:scale-105 active:scale-95'
  }`

  const heartClassNames = `h-5 w-5 transition-colors duration-150 ${
    isAnimating ? 'animate-pulse-scale' : ''
  } ${
    currentFollowed
      ? 'fill-[#007C7C] stroke-[#007C7C]'
      : 'fill-transparent stroke-slate-600 group-hover:stroke-[#007C7C]'
  }`.trim()

  return (
    <button
      type="button"
      onClick={handleClick}
      className={baseClasses}
      aria-pressed={currentFollowed}
      aria-label={currentFollowed ? 'Unfollow property' : 'Follow property'}
    >
      <Heart className={heartClassNames} strokeWidth={2.4} />
    </button>
  )
}
