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

    const LIMIT = 2000

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

    let query = supabase
      .from('properties_public_view')
      .select(
        `
        id,
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

    if (hasBounds) {
      query = query.gte('lat', south).lte('lat', north).gte('lon', west).lte('lon', east)
    }

    // Filters
    if (filterOpen === 'true') {
      query = query.eq('is_open_to_talking', true)
    }

    if (filterForSale === 'true') {
      query = query.eq('is_for_sale', true)
    }

    if (filterForRent === 'true') {
      query = query.eq('is_for_rent', true)
    }

    if (filterClaimed === 'claimed') {
      query = query.eq('is_claimed', true)
    } else if (filterClaimed === 'unclaimed') {
      query = query.eq('is_claimed', false)
    }

    query = query
      .order('is_open_to_talking', { ascending: false })
      .order('is_claimed', { ascending: false })
      .order('id', { ascending: true })
      .limit(LIMIT)

    const { data, error } = await query

    if (error) {
      console.error('[API /properties] Supabase error', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      console.error(error.message, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const truncated = Array.isArray(data) && data.length === LIMIT

    console.log('[API /properties] result', {
      count: data?.length ?? 0,
      truncated,
    })

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
