import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { submissionId, action, notes } = await request.json()
    
    if (action === 'approve') {
      // Get submission data
      const { data: submission, error: fetchError } = await (supabase as any)
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single()
      
      if (fetchError || !submission) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
      }
      
      // Create shop from submission
      const { data: shop, error: shopError } = await (supabase as any)
        .from('shops')
        .insert({
          name: submission.name,
          description: submission.description,
          address: submission.address,
          latitude: submission.latitude,
          longitude: submission.longitude,
          crypto_accepted: submission.crypto_accepted,
          website: submission.website,
          phone: submission.phone,
          hours: submission.hours,
          approved: true,
          submitted_by: submission.submitted_by,
          approved_by: user.id
        })
        .select()
        .single()
      
      if (shopError) {
        return NextResponse.json({ error: shopError.message }, { status: 500 })
      }
      
      // Copy images from submission to shop
      const { data: submissionImages } = await (supabase as any)
        .from('submission_images')
        .select('*')
        .eq('submission_id', submissionId)
      
      if (submissionImages && submissionImages.length > 0) {
        const shopImages = submissionImages.map((img: any, index: number) => ({
          shop_id: shop.id,
          image_url: img.image_url,
          thumbnail_url: img.image_url, // TODO: Generate actual thumbnail
          is_primary: index === 0,
          uploaded_by: submission.submitted_by
        }))
        
        await (supabase as any).from('shop_images').insert(shopImages)
      }
      
      // Update submission status
      const { error: updateError } = await (supabase as any)
        .from('submissions')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes
        })
        .eq('id', submissionId)
      
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      
      return NextResponse.json({ data: shop })
    } else if (action === 'reject') {
      // Update submission status to rejected
      const { error } = await (supabase as any)
        .from('submissions')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes
        })
        .eq('id', submissionId)
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}