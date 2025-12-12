import { useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { uploadPropertyImage, listAlbumFiles, listAlbums } from '@/lib/storage'

export interface AlbumImage {
    name: string
    url: string
    isPublic: boolean
}

export function usePropertyAlbums(propertyId: string) {
    const [uploading, setUploading] = useState(false)
    const [loadingImages, setLoadingImages] = useState(false)

    // Owner: Upload to a specific album
    const uploadToAlbum = useCallback(async (albumName: string, files: File[]) => {
        setUploading(true)
        try {
            const supabase = getSupabaseClient()
            const urls = await uploadPropertyImage(supabase, propertyId, albumName, files)
            return urls
        } catch (error) {
            console.error('Upload failed:', error)
            throw error
        } finally {
            setUploading(false)
        }
    }, [propertyId])

    // Owner: List available albums
    const getAlbums = useCallback(async () => {
        try {
            const supabase = getSupabaseClient()
            return await listAlbums(supabase, propertyId)
        } catch (error) {
            console.error('List albums failed:', error)
            return []
        }
    }, [propertyId])

    // Owner: List images in an album
    const getOwnerAlbumImages = useCallback(async (albumName: string): Promise<AlbumImage[]> => {
        setLoadingImages(true)
        try {
            const supabase = getSupabaseClient()
            const images = await listAlbumFiles(supabase, propertyId, albumName)
            return images
        } catch (error) {
            console.error('List images failed:', error)
            return []
        } finally {
            setLoadingImages(false)
        }
    }, [propertyId])

    // Buyer: View Shared Album (Via API)
    const getViewSharedAlbum = useCallback(async (albumName: string) => {
        setLoadingImages(true)
        try {
            const response = await fetch('/api/albums/view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId, albumName })
            })

            if (!response.ok) throw new Error('Failed to fetch album')
            
            const data = await response.json()
            return data.urls as string[]
        } catch (error) {
            console.error('Fetch shared album failed:', error)
            return []
        } finally {
            setLoadingImages(false)
        }
    }, [propertyId])

    return {
        uploading,
        loadingImages,
        uploadToAlbum,
        getAlbums,
        getOwnerAlbumImages,
        getViewSharedAlbum
    }
}
