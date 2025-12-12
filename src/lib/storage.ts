import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Uploads images for a given property to the home-stories bucket and returns public URLs.
 */
/**
 * Uploads images to 'property-images' bucket.
 * Structure:
 * - public/{propertyId}/hero/*
 * - private/{propertyId}/{albumName}/*
 */
export async function uploadPropertyImage(
    supabase: SupabaseClient<Database>,
    propertyId: string,
    albumName: string, // 'hero' treated as public, others private
    files: File[]
): Promise<string[]> {
    const bucket = 'property-images'
    const isPublic = albumName === 'hero'
    const basePath = isPublic ? `public/${propertyId}/hero` : `private/${propertyId}/${albumName}`

    const uploadedUrls: string[] = []

    for (const file of files) {
        const ext = file.name.includes('.') ? file.name.split('.').pop() : undefined
        const safeExt = ext ? `.${ext}` : ''
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`
        const filePath = `${basePath}/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, { upsert: false })

        if (uploadError) {
            console.error('Upload Error:', uploadError)
            throw new Error(uploadError.message)
        }

        if (isPublic) {
            const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
            uploadedUrls.push(data.publicUrl)
        } else {
            // Private uploads don't return a URL immediately, caller must request signed URL later
            // Or we can return a temporary signed URL now for UI feedback
            const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600) // 1 hour
            if (data?.signedUrl) uploadedUrls.push(data.signedUrl)
        }
    }

    return uploadedUrls
}

export async function listAlbums(
    supabase: SupabaseClient<Database>,
    propertyId: string
): Promise<string[]> {
    const bucket = 'property-images'
    const basePath = `private/${propertyId}` // Root of private albums

    const { data, error } = await supabase.storage
        .from(bucket)
        .list(basePath)

    if (error) {
        console.error('List Albums Error:', error)
        return []
    }

    // Filter for folders or infer from files if flattened?
    // Supabase storage folders are virtual. We get items.
    // However, if we uploaded `private/id/album/file`, `list(private/id)` should return `album` as a folder (if using delimiter? default list recursive is false).
    // The response `data` contains `name` and metadata. 
    // If it's a folder, `id` is null (sometimes) or we just see the name.

    // Actually, checking Supabase Storage API:
    // .list('folder') returns items in that folder. Subfolders appear as items.

    return data
        .filter(item => !item.name.startsWith('.')) // Hide .emptyFolderPlaceholder
        .map(item => item.name)
}

export async function listAlbumFiles(
    supabase: SupabaseClient<Database>,
    propertyId: string,
    albumName: string
): Promise<{ name: string; url: string; isPublic: boolean }[]> {
    const bucket = 'property-images'
    const isPublic = albumName === 'hero'
    const basePath = isPublic ? `public/${propertyId}/hero` : `private/${propertyId}/${albumName}`

    const { data, error } = await supabase.storage
        .from(bucket)
        .list(basePath)

    if (error) {
        console.error('List Error:', error)
        return []
    }

    // Map to URLs
    const files = await Promise.all(data.map(async (file) => {
        const filePath = `${basePath}/${file.name}`
        let url = ''

        if (isPublic) {
            const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath)
            url = pubData.publicUrl
        } else {
            const { data: signData } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600)
            url = signData?.signedUrl || ''
        }

        return {
            name: file.name,
            url,
            isPublic
        }
    }))

    return files
}

/**
 * Upload images for home story (hero images)
 * This is an alias for uploadPropertyImage with 'hero' album
 */
export async function uploadHomeStoryImages(
    supabase: SupabaseClient<Database>,
    propertyId: string,
    files: File[]
): Promise<string[]> {
    return uploadPropertyImage(supabase, propertyId, 'hero', files)
}
