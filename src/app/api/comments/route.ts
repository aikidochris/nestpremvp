import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shop_id')
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    const { data, error } = await (supabase as any)
      .from('comments')
      .select(`
        *,
        profiles (display_name, avatar_url)
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
    
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
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { shop_id, content, comment_type, parent_id } = body
    
    // Validate content length
    if (!content || content.length < 1 || content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment must be between 1 and 2000 characters' },
        { status: 400 }
      )
    }
    
    const { data, error } = await (supabase as any)
      .from('comments')
      .insert({
        shop_id,
        user_id: user.id,
        content,
        comment_type: comment_type || 'general',
        parent_id: parent_id || null
      })
      .select(`
        *,
        profiles (display_name, avatar_url)
      `)
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