import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const submissionId = formData.get('submission_id') as string
    const shopId = formData.get('shop_id') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }
    
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      )
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${submissionId || shopId}/${fileName}`
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await (supabase as any)
      .storage
      .from('shop-images')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('shop-images')
      .getPublicUrl(filePath)
    
    // Save image record to database
    if (submissionId) {
      const { data, error } = await (supabase as any)
        .from('submission_images')
        .insert({
          submission_id: submissionId,
          image_url: publicUrl
        })
        .select()
        .single()
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({ data })
    } else if (shopId) {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await (supabase as any)
        .from('shop_images')
        .insert({
          shop_id: shopId,
          image_url: publicUrl,
          thumbnail_url: publicUrl, // TODO: Generate actual thumbnail
          uploaded_by: user?.id
        })
        .select()
        .single()
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({ data })
    } else {
      return NextResponse.json(
        { error: 'Either submission_id or shop_id required' },
        { status: 400 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}