import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 1. Query the new "World Class" Data View
    const { data, error } = await supabase
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
        is_for_sale
      `)
      .eq('property_id', id)
      .single()

    if (error) {
      console.error('API Error:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // 2. Return the data with a default votes object (to prevent frontend errors)
    return NextResponse.json({
      data: {
        ...data,
        votes: { quality_score: 0, bitcoin_verified_score: 0, total_votes: 0 }
      }
    })

  } catch (error) {
    console.error('Server Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}