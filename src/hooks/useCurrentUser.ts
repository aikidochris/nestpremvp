import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

export function useCurrentUser() {
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [authLoading, setAuthLoading] = useState(true)
    const supabase = getSupabaseClient()

    useEffect(() => {
        let mounted = true

        async function loadUser() {
            setAuthLoading(true) 
            try {
                const { data, error } = await supabase.auth.getUser()
                if (!mounted) return

                if (!error) {
                    setCurrentUser(data.user ?? null)
                } else {
                    // Suppress error log for expected "Auth session missing" in guest mode
                    // console.error('[Auth] getUser error', error) 
                    setCurrentUser(null)
                }
            } catch (err) {
                console.warn('[Auth] Session missing or unexpected error', err)
                if (mounted) setCurrentUser(null)
            } finally {
                if (mounted) setAuthLoading(false)
            }
        }

        const { data: subscription } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!mounted) return
                setCurrentUser(session?.user ?? null)
            }
        )

        loadUser()

        return () => {
            mounted = false
            subscription?.subscription?.unsubscribe()
        }
    }, [supabase])

    const logout = async () => {
        await supabase.auth.signOut()
        setCurrentUser(null)
    }

    return {
        currentUser,
        setCurrentUser, // Exposed in case we need to manually update it or pass it around, though usually read-only
        authLoading,
        logout
    }
}
