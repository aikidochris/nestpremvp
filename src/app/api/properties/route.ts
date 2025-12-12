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
    const north = parseFloat(url.searchParams.get('north') ?? '')
    const south = parseFloat(url.searchParams.get('south') ?? '')
    const east = parseFloat(url.searchParams.get('east') ?? '')
    const west = parseFloat(url.searchParams.get('west') ?? '')
    const LIMIT = 15000
    const hasBounds = !Number.isNaN(north) && !Number.isNaN(south)

    // FIX: Select ALL enrichment columns
    let query = supabase
      .from('property_public_view')
      .select(`
        id:property_id,
        lat,
        lon,
        postcode,
        street,
        house_number,
        display_label,
        last_sale_price,
        last_sale_date,
        energy_rating,
        epc_floor_area,
        epc_property_type,
        is_claimed,
        claimed_by_user_id,
        is_open_to_talking,
        is_for_sale,
        is_for_rent
      `)

    // Bounds Filter
    if (hasBounds) {
      query = query.gte('lat', south).lte('lat', north).gte('lon', west).lte('lon', east)
    } else {
      // Pilot Area Fallback
      query = query.or('postcode.ilike.NE25%,postcode.ilike.NE26%,postcode.ilike.NE27%,postcode.ilike.NE29%,postcode.ilike.NE30%')
    }

    // Status Filters
    const filterOpen = url.searchParams.get('filter_open')
    const filterForSale = url.searchParams.get('filter_for_sale')
    const filterForRent = url.searchParams.get('filter_for_rent')
    const filterClaimed = url.searchParams.get('filter_claimed')

    const orConditions: string[] = []
    if (filterOpen === 'true') orConditions.push('is_open_to_talking.eq.true')
    if (filterForSale === 'true') orConditions.push('is_for_sale.eq.true')
    if (filterForRent === 'true') orConditions.push('is_for_rent.eq.true')
    if (filterClaimed === 'claimed') orConditions.push('is_claimed.eq.true')

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','))
    } else if (filterClaimed === 'unclaimed') {
      query = query.eq('is_claimed', false)
    }

    query = query.order('property_id', { ascending: true }).limit(LIMIT)

    const { data, error } = await query

    if (error) {
      console.error('[API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      truncated: (data?.length ?? 0) === LIMIT
    })

  } catch (error) {
    console.error('[API] Unexpected error', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}