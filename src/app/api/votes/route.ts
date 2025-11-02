import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { shop_id, submission_id, vote_type, value } = body
    
    // Validate vote value
    if (value !== 1 && value !== -1) {
      return NextResponse.json({ error: 'Invalid vote value' }, { status: 400 })
    }
    
    // Validate vote type
    const validVoteTypes = ['shop_quality', 'bitcoin_verified', 'submission_accuracy']
    if (!validVoteTypes.includes(vote_type)) {
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
    }
    
    // Upsert vote (update if exists, insert if not)
    const { data, error } = await supabase
      .from('votes')
      .upsert({
        shop_id: shop_id || null,
        submission_id: submission_id || null,
        user_id: user.id,
        vote_type,
        value
      }, {
        onConflict: 'user_id,shop_id,submission_id,vote_type'
      })
      .select()
      .single()
    
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const voteId = searchParams.get('id')
    
    if (!voteId) {
      return NextResponse.json({ error: 'Vote ID required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('id', voteId)
      .eq('user_id', user.id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}