import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Uploads images for a given property to the home-stories bucket and returns public URLs.
 */
export async function uploadHomeStoryImages(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  files: File[]
): Promise<string[]> {
  const bucket = 'home-stories'
  const uploadedUrls: string[] = []

  for (const file of files) {
    const ext = file.name.includes('.') ? file.name.split('.').pop() : undefined
    const safeExt = ext ? `.${ext}` : ''
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`
    const filePath = `${propertyId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: false })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    uploadedUrls.push(data.publicUrl)
  }

  return uploadedUrls
}
