import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  
  // URL to redirect to after sign in process completes
  // Use NEXT_PUBLIC_SITE_URL if available, otherwise fall back to request origin
  const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin
  return NextResponse.redirect(redirectUrl)
}