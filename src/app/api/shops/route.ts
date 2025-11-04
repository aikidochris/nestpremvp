import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = searchParams.get('radius') || '10'
    const swLat = searchParams.get('swLat')
    const swLng = searchParams.get('swLng')
    const neLat = searchParams.get('neLat')
    const neLng = searchParams.get('neLng')
    const crypto = searchParams.get('crypto')
    const count = searchParams.get('count') === 'true'
    
    console.log('[/api/shops] GET request params:', { lat, lng, radius, swLat, swLng, neLat, neLng, crypto, count })
    
    const supabase = await createClient()
    
    // If bounding box provided, get shops in bounds
    if (swLat && swLng && neLat && neLng) {
      console.log('[/api/shops] Calling get_shops_in_bounds RPC with:', {
        swLat: parseFloat(swLat),
        swLng: parseFloat(swLng),
        neLat: parseFloat(neLat),
        neLng: parseFloat(neLng)
      })
      
      const { data, error } = await (supabase as any)
        .rpc('get_shops_in_bounds', {
          sw_lat: parseFloat(swLat),
          sw_lng: parseFloat(swLng),
          ne_lat: parseFloat(neLat),
          ne_lng: parseFloat(neLng)
        })
      
      if (error) {
        console.error('[/api/shops] RPC error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      console.log('[/api/shops] RPC success, returned', data?.length || 0, 'shops')
      return NextResponse.json({ data })
    }
    
    // If lat/lng provided, get nearby shops (legacy support)
    if (lat && lng) {
      console.log('[/api/shops] Calling get_nearby_shops RPC with:', {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_km: parseFloat(radius)
      })
      
      // DIAGNOSTIC: First, let's check what's in the shops table directly
      const { data: directShops, error: directError } = await supabase
        .from('shops')
        .select('id, name, latitude, longitude, approved')
        .eq('approved', true)
      
      console.log('[/api/shops] DIAGNOSTIC - Direct table query results:', {
        count: directShops?.length || 0,
        shops: directShops?.map((s: any) => ({
          id: s.id,
          name: s.name,
          lat: s.latitude,
          lng: s.longitude,
          approved: s.approved
        }))
      })
      
      if (directError) {
        console.error('[/api/shops] DIAGNOSTIC - Direct query error:', directError)
      }
      
      const { data, error } = await (supabase as any)
        .rpc('get_nearby_shops', {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius_km: parseFloat(radius)
        })
      
      if (error) {
        console.error('[/api/shops] RPC error:', error)
        console.error('[/api/shops] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      console.log('[/api/shops] RPC success, returned', data?.length || 0, 'shops')
      console.log('[/api/shops] Sample data structure:', data?.[0])
      
      // Log all shop IDs and names for debugging
      if (data && data.length > 0) {
        console.log('[/api/shops] All shops returned:', data.map((s: any) => ({
          id: s.id,
          name: s.name,
          distance_km: s.distance_km,
          approved: s.approved
        })))
      } else {
        console.log('[/api/shops] DIAGNOSTIC - RPC returned empty but direct query found', directShops?.length || 0, 'shops')
        console.log('[/api/shops] DIAGNOSTIC - This suggests RLS or distance calculation issue')
      }
      
      return NextResponse.json({ data })
    }
    
    // Otherwise get all approved shops
    let query = supabase
      .from('shops')
      .select(count ? '*' : '*', { count: count ? 'exact' : undefined })
      .eq('approved', true)
    
    if (!count) {
      query = query.order('created_at', { ascending: false })
    }
    
    // Filter by crypto type if provided
    if (crypto) {
      query = query.contains('crypto_accepted', [crypto])
    }
    
    const { data, error, count: totalCount } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // If count requested, return just the count
    if (count) {
      return NextResponse.json({ count: totalCount })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[/api/shops] Unexpected error:', error)
    console.error('[/api/shops] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
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