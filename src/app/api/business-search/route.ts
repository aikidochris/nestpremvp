import { NextRequest, NextResponse } from 'next/server'

const VALUESERP_API_KEY = process.env.VALUESERP_API_KEY

/**
 * Convert GPS coordinates to a location string for ValueSerp API
 * This is a simple reverse geocoding approximation for major US cities
 */
function coordinatesToLocation(lat: string, lng: string): string {
  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)
  
  // Simple mapping for major cities (can be expanded)
  // San Francisco area
  if (latitude >= 37.7 && latitude <= 37.8 && longitude >= -122.5 && longitude <= -122.4) {
    return 'San Francisco,California,United States'
  }
  // Los Angeles area
  if (latitude >= 33.9 && latitude <= 34.2 && longitude >= -118.5 && longitude <= -118.0) {
    return 'Los Angeles,California,United States'
  }
  // New York area
  if (latitude >= 40.6 && latitude <= 40.9 && longitude >= -74.1 && longitude <= -73.9) {
    return 'New York,New York,United States'
  }
  // Chicago area
  if (latitude >= 41.8 && latitude <= 42.0 && longitude >= -87.8 && longitude <= -87.5) {
    return 'Chicago,Illinois,United States'
  }
  
  // Default fallback - just use United States
  console.warn(`[WARNING] Could not map coordinates ${lat},${lng} to a known city, using United States as fallback`)
  return 'United States'
}

/**
 * Search for business names using ValueSerp API
 * This endpoint is specifically for autocomplete suggestions of business names
 */
async function searchBusinessNames(
  query: string,
  location?: string,
  lat?: string,
  lng?: string
) {
  if (!VALUESERP_API_KEY) {
    throw new Error('ValueSerp API key not configured')
  }

  const url = new URL('https://api.valueserp.com/search')
  url.searchParams.set('api_key', VALUESERP_API_KEY)
  
  // CRITICAL: Use search_type=places for local business results
  url.searchParams.set('search_type', 'places')
  url.searchParams.set('q', query)
  
  // Determine location string
  let locationString: string
  if (lat && lng) {
    // Convert GPS coordinates to location string format
    locationString = coordinatesToLocation(lat, lng)
    console.log(`[INFO] Converted coordinates (${lat},${lng}) to location: ${locationString}`)
  } else if (location) {
    // Use provided location string
    locationString = location
    console.log(`[INFO] Using provided location: ${locationString}`)
  } else {
    // Default fallback
    locationString = 'United States'
    console.log('[INFO] Using default location: United States')
  }
  
  url.searchParams.set('location', locationString)
  url.searchParams.set('google_domain', 'google.com')
  url.searchParams.set('gl', 'us')
  url.searchParams.set('hl', 'en')
  url.searchParams.set('num', '5')
  url.searchParams.set('output', 'json')

  console.log('[INFO] ValueSerp API call:', {
    search_type: 'places',
    query,
    location: locationString,
    url: url.toString().replace(/api_key=[^&]+/, 'api_key=REDACTED')
  })

  const response = await fetch(url.toString())
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[ERROR] ValueSerp API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    })
    throw new Error(`ValueSerp API error: ${response.status}`)
  }

  const data = await response.json()
  
  // Log response for debugging
  console.log('[INFO] ValueSerp response:', {
    hasLocalResults: !!data.local_results,
    localResultsCount: data.local_results?.length || 0,
    firstResult: data.local_results?.[0] ? {
      title: data.local_results[0].title,
      address: data.local_results[0].address,
      city: data.local_results[0].city,
      state: data.local_results[0].state
    } : null
  })

  return data
}

/**
 * Transform ValueSerp results to simplified format for name suggestions
 */
function transformBusinessResults(valueSerpData: any) {
  const places = valueSerpData.local_results || []
  
  return places.map((place: any) => ({
    name: place.title || place.name,
    address: place.address || `${place.city || ''}, ${place.state || ''}`.trim(),
    rating: place.rating,
    reviews: place.reviews,
    type: place.business_type,
  }))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const location = searchParams.get('location')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
    }

    if (!VALUESERP_API_KEY) {
      return NextResponse.json({ error: 'ValueSerp API key not configured' }, { status: 500 })
    }
    
    // Search for business names with location context
    const valueSerpData = await searchBusinessNames(
      query,
      location ?? undefined,
      lat ?? undefined,
      lng ?? undefined
    )
    const results = transformBusinessResults(valueSerpData)
    
    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('Business search API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}