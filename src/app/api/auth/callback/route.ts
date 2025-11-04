import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('[AUTH CALLBACK] Session exchange error:', sessionError)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=auth_failed`)
    }
    
    if (sessionData.session?.user) {
      const userId = sessionData.session.user.id
      const userEmail = sessionData.session.user.email
      
      // Check if profile exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
      
      // If profile doesn't exist, create it
      if (!existingProfile && profileCheckError?.code !== 'PGRST116') {
        console.log('[AUTH CALLBACK] Profile not found, creating profile for user:', userId)
        
        const { error: insertError } = await supabase
          .from('profiles')
          // @ts-ignore - Supabase type inference issue with server client
          .insert({
            id: userId,
            email: userEmail ?? null,
            is_admin: false
          })
        
        if (insertError) {
          console.error('[AUTH CALLBACK] Failed to create profile:', insertError)
          // Don't block login if profile creation fails, but log it
        } else {
          console.log('[AUTH CALLBACK] Profile created successfully for user:', userId)
        }
      } else if (existingProfile) {
        console.log('[AUTH CALLBACK] Profile already exists for user:', userId)
      }
    }
  }
  
  // URL to redirect to after sign in process completes
  // Use NEXT_PUBLIC_SITE_URL if available, otherwise fall back to request origin
  const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin
  return NextResponse.redirect(redirectUrl)
}