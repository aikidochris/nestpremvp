import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'

type UsePropertyFollowsResult = {
  followedIds: Set<string>
  isFollowed: (propertyId?: string | null) => boolean
  toggleFollow: (propertyId: string) => Promise<void>
  loading: boolean
}

export function usePropertyFollows(): UsePropertyFollowsResult {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          if (isMounted) setLoading(false)
          return
        }
        const { data, error } = await supabase
          .from('follows')
          .select('property_id')
          .eq('user_id', user.id)
          .eq('follow_type', 'property')

        if (error) {
          console.error('[usePropertyFollows] load error', error)
          if (isMounted) setLoading(false)
          return
        }

        const ids = new Set<string>((data ?? []).map((row) => row.property_id).filter(Boolean))
        if (isMounted) {
          setFollowedIds(ids)
          setLoading(false)
        }
      } catch (err) {
        console.error('[usePropertyFollows] unexpected load error', err)
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [supabase])

  const isFollowed = useCallback(
    (propertyId?: string | null) => {
      if (!propertyId) return false
      return followedIds.has(propertyId)
    },
    [followedIds]
  )

  const toggleFollow = useCallback(
    async (propertyId: string) => {
      if (!propertyId) return
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('Sign in to save this home.')
        router.push('/auth/login?redirect=/')
        return
      }

      const currentlyFollowed = followedIds.has(propertyId)
      const optimistic = new Set(followedIds)
      if (currentlyFollowed) {
        optimistic.delete(propertyId)
      } else {
        optimistic.add(propertyId)
      }
      setFollowedIds(optimistic)

      try {
        if (currentlyFollowed) {
          const { error } = await supabase
            .from('follows')
            .delete()
            .eq('property_id', propertyId)
            .eq('follow_type', 'property')
            .eq('user_id', user.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('follows')
            .insert({ user_id: user.id, property_id: propertyId, follow_type: 'property' })

          if (error) throw error
        }
      } catch (err) {
        console.error('[usePropertyFollows] toggle error', err)
        // revert
        setFollowedIds(new Set(followedIds))
      }
    },
    [followedIds, router, supabase]
  )

  return useMemo(
    () => ({
      followedIds,
      isFollowed,
      toggleFollow,
      loading,
    }),
    [followedIds, isFollowed, toggleFollow, loading]
  )
}
