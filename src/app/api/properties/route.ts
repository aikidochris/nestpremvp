// src/app/api/properties/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const url = new URL(req.url)

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    console.error('FATAL: Missing SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const north = parseFloat(url.searchParams.get('north') ?? '')
    const south = parseFloat(url.searchParams.get('south') ?? '')
    const east = parseFloat(url.searchParams.get('east') ?? '')
    const west = parseFloat(url.searchParams.get('west') ?? '')

    const filterOpen = url.searchParams.get('filter_open')
    const filterForSale = url.searchParams.get('filter_for_sale')
    const filterForRent = url.searchParams.get('filter_for_rent')
    const filterClaimed = url.searchParams.get('filter_claimed')

    const LIMIT = 15000

    const hasBounds =
      !Number.isNaN(north) &&
      !Number.isNaN(south) &&
      !Number.isNaN(east) &&
      !Number.isNaN(west)

    console.log('[API /properties] params', {
      north,
      south,
      east,
      west,
      filterOpen,
      filterForSale,
      filterForRent,
      filterClaimed,
      hasBounds,
    })

    // FIX: Changed from 'properties_public_view' to 'property_public_view'
    let query = supabase
      .from('property_public_view')
      .select(
        `
        id:property_id,  
        lat,
        lon,
        postcode,
        street,
        house_number,
        is_claimed,
        is_open_to_talking,
        is_for_sale,
        is_for_rent
      `
      )
    // Note: We map 'property_id' back to 'id' so the frontend doesn't break

    // Data Fence: North Tyneside Coast Launch
    query = query.or('postcode.ilike.NE25%,postcode.ilike.NE26%,postcode.ilike.NE27%,postcode.ilike.NE29%,postcode.ilike.NE30%')

    if (hasBounds) {
      query = query.gte('lat', south).lte('lat', north).gte('lon', west).lte('lon', east)
    }

    // Filters (OR logic for discovery)
    const orConditions: string[] = []

    if (filterOpen === 'true') orConditions.push('is_open_to_talking.eq.true')
    if (filterForSale === 'true') orConditions.push('is_for_sale.eq.true')
    if (filterForRent === 'true') orConditions.push('is_for_rent.eq.true')
    if (filterClaimed === 'claimed') orConditions.push('is_claimed.eq.true')

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','))
    } else if (filterClaimed === 'unclaimed') {
      // Explicit negative filter if requested alone
      query = query.eq('is_claimed', false)
    }

    query = query
      .order('is_open_to_talking', { ascending: false })
      .order('is_claimed', { ascending: false })
      .order('property_id', { ascending: true }) // Use property_id for sorting
      .limit(LIMIT)

    const { data, error } = await query

    if (error) {
      console.error('[API /properties] Supabase error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const truncated = Array.isArray(data) && data.length === LIMIT

    return NextResponse.json(
      {
        data: data ?? [],
        truncated,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API /properties] Unexpected error', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}