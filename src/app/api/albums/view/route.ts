import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { propertyId, albumName } = await request.json()
    
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Authorization Check
    let isAuthorized = false

    // A. Check if Owner
    const { data: ownerClaim } = await supabase
        .from('property_claims')
        .select('id')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .eq('status', 'APPROVED')
        .single()

    if (ownerClaim) {
        isAuthorized = true
    } else {
        // B. Check if Buyer with Share
        // Find thread where this user is the buyer
        const { data: thread } = await supabase
            .from('message_threads')
            .select('id')
            .eq('property_id', propertyId)
            .eq('buyer_id', user.id)
            .single()

        if (thread) {
            // Check for valid share
            const { data: share } = await supabase
                .from('album_shares')
                .select('id')
                .eq('thread_id', thread.id)
                .eq('album_type', albumName)
                .is('revoked_at', null)
                .single()
            
            if (share) {
                isAuthorized = true
            }
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Access Denied' }, { status: 403 })
    }

    // 3. Generate Signed URLs
    // Use Service Role to bypass storage RLS (since we verified app-level permission manually)
    const admin = createServiceRoleClient()
    const bucket = 'property-images'
    const path = `private/${propertyId}/${albumName}` // No trailing slash for list?
    
    // List files
    const { data: files, error: listError } = await admin.storage
        .from(bucket)
        .list(path)

    if (listError) {
        console.error('Storage List Error:', listError)
        return NextResponse.json({ error: 'Storage Error' }, { status: 500 })
    }

    // Create URLs
    const urls = await Promise.all(files.map(async (file) => {
        // Skip placeholders or folders if any
        if (file.name === '.emptyFolderPlaceholder') return null
        
        const { data } = await admin.storage
            .from(bucket)
            .createSignedUrl(`${path}/${file.name}`, 3600) // 1 hour validity

        return data?.signedUrl
    }))

    return NextResponse.json({ urls: urls.filter(Boolean) })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
