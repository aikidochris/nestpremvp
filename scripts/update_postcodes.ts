/**
 * UPDATE SCRIPT (Merged Data Version)
 * Reads BOTH 'properties_raw.csv' (for Lat/Lon) and 'property_postcodes.csv' (for Address)
 * to create a valid database record for upsert.
 */
import { createSupabaseAdminClient } from '../src/lib/supabaseAdmin'
import fs from 'fs'
import path from 'path'

// Helper to read CSV simply
function readCsv(filePath: string) {
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim() !== '')
  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map(line => {
    const values = line.split(',')
    const record: any = {}
    headers.forEach((h, i) => record[h] = values[i]?.trim())
    return record
  })
}

async function updatePostcodes() {
  const supabase = createSupabaseAdminClient()
  const rawPath = path.join(process.cwd(), 'data', 'properties_raw.csv')
  const matchPath = path.join(process.cwd(), 'data', 'property_postcodes.csv')

  console.log('1. Reading Raw Properties (for Lat/Lon)...')
  const rawProps = readCsv(rawPath)
  // Create a quick lookup map: ID -> {lat, lon}
  const locMap = new Map()
  rawProps.forEach((p: any) => locMap.set(p.id, { lat: p.lat, lon: p.lon }))

  console.log('2. Reading Postcode Matches...')
  const matches = readCsv(matchPath)

  console.log(`3. Merging Data for ${matches.length} updates...`)

  // Update in batches
  const chunkSize = 1000
  for (let i = 0; i < matches.length; i += chunkSize) {
    const chunk = matches.slice(i, i + chunkSize)

    const updates = chunk
      .map((row: any) => {
        const loc = locMap.get(row.property_id)
        if (!loc || !loc.lat) return null // Skip if we lost the location data

        return {
          id: row.property_id,
          postcode: row.postcode,
          lat: parseFloat(loc.lat), // REQUIRED by DB
          lon: parseFloat(loc.lon), // REQUIRED by DB
          updated_at: new Date().toISOString()
        }
      })
      .filter(u => u !== null)

    if (updates.length > 0) {
      const { error } = await supabase
        .from('properties')
        .upsert(updates, { onConflict: 'id' })

      if (error) {
        console.error('❌ Error updating chunk:', error.message)
      } else {
        console.log(`✅ Updated rows ${i} to ${i + updates.length}`)
      }
    }
  }

  console.log('🎉 Update Complete. Map is now fully populated.')
}

updatePostcodes()