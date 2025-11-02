import { NextRequest, NextResponse } from 'next/server'

const HERE_API_KEY = process.env.HERE_API_KEY

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'autosuggest'
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
    }
    
    if (!HERE_API_KEY) {
      return NextResponse.json({ error: 'HERE API key not configured' }, { status: 500 })
    }
    
    let url: string
    
    if (type === 'autosuggest') {
      // Address autocomplete
      url = `https://autosuggest.search.hereapi.com/v1/autosuggest?q=${encodeURIComponent(query)}&apiKey=${HERE_API_KEY}&limit=5`
    } else if (type === 'geocode') {
      // Full geocoding
      url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&apiKey=${HERE_API_KEY}`
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
    
    const response = await fetch(url)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Geocoding service error' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}