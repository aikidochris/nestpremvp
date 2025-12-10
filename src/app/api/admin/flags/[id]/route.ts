import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceKey || !supabaseUrl) {
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    try {
        const body = await req.json()
        const { status } = body

        if (!status || !['reviewed', 'dismissed'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const { error } = await supabase
            .from('property_flags')
            .update({
                status,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) {
            console.error('[API] Error updating flag:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[API] Unexpected error', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
