import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is admin
    const { data: profile } = user ? await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single() : { data: null }
    
    let query = supabase
      .from('submissions')
      .select('*, submission_images (*)')
      .order('created_at', { ascending: false })
    
    // Non-admins can only see their own submissions
    if (!profile?.is_admin) {
      if (user) {
        query = query.eq('submitted_by', user.id)
      } else {
        return NextResponse.json({ data: [] })
      }
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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        ...body,
        submitted_by: user?.id || null,
        status: 'pending'
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