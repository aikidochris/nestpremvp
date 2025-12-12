import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
    const url = new URL(req.url)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceKey || !supabaseUrl) {
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    try {
        const status = url.searchParams.get('status') || 'pending'

        const { data, error } = await supabase
            .from('property_flags')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[API] Error fetching flags:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
    } catch (error) {
        console.error('[API] Unexpected error', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
