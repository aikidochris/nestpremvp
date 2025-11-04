import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = searchParams.get('radius') || '10'
    const crypto = searchParams.get('crypto')
    
    const supabase = await createClient()
    
    // If lat/lng provided, get nearby shops
    if (lat && lng) {
      const { data, error } = await (supabase as any)
        .rpc('get_nearby_shops', {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius_km: parseFloat(radius)
        })
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({ data })
    }
    
    // Otherwise get all approved shops
    let query = supabase
      .from('shops')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false })
    
    // Filter by crypto type if provided
    if (crypto) {
      query = query.contains('crypto_accepted', [crypto])
    }
    
    const { data, error } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is admin
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    
    const { data, error } = await (supabase as any)
      .from('shops')
      .insert({
        ...body,
        approved: true,
        submitted_by: user.id,
        approved_by: user.id
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}