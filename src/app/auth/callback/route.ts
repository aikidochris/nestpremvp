import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Redirect to landing page or the page they were on
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
            console.error('Auth Callback Error:', error.message)
            console.error('Full Error Object:', error)
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
        }
        return NextResponse.redirect(`${origin}${next}`)
    }

    // Return the user to an error page with instructions
    console.error('Auth Callback: No code provided')
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`)
}
