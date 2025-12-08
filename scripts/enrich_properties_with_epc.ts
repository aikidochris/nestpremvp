/**
 * EPC ENRICHMENT SCRIPT (Fixed)
 * 1. Fetches ALL properties (pagination fix).
 * 2. Includes Lat/Lon in update (database fix).
 */
import { createSupabaseAdminClient } from '../src/lib/supabaseAdmin'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

// --- Configuration ---
const TARGET_POSTCODE_PREFIXES = ['NE25', 'NE26', 'NE27', 'NE28', 'NE29', 'NE30']
const INPUT_FILE = path.join(process.cwd(), 'data', 'certificates.csv')

// --- Helpers ---
function parseCSVLine(line: string): string[] {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') { inQuotes = !inQuotes }
        else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
        } else { current += char }
    }
    result.push(current.trim())
    return result
}

async function main() {
    const supabase = createSupabaseAdminClient()

    console.log('1. Fetching ALL existing properties from DB...')

    // We need ID, Postcode, AND Lat/Lon (to satisfy upsert requirements)
    const propMap = new Map<string, any[]>()
    let totalLoaded = 0
    let start = 0
    const FETCH_SIZE = 1000 // Max allowed by Supabase per request

    while (true) {
        const { data: props, error } = await supabase
            .from('properties')
            .select('id, postcode, lat, lon')
            .range(start, start + FETCH_SIZE - 1)

        if (error) {
            console.error('❌ DB Error:', error)
            break
        }
        if (!props || props.length === 0) break

        // Map Props by Postcode
        props.forEach(p => {
            if (!p.postcode) return
            const pc = p.postcode.replace(/\s/g, '').toUpperCase()
            if (!propMap.has(pc)) propMap.set(pc, [])

            // Store the WHOLE object (so we have lat/lon later)
            propMap.get(pc)?.push({
                id: p.id,
                lat: p.lat,
                lon: p.lon
            })
        })

        totalLoaded += props.length
        start += FETCH_SIZE
        process.stdout.write(`\r   Loaded ${totalLoaded} properties...`)
    }

    console.log(`\n   ✅ Database ready. Indexed ${totalLoaded} homes.`)
    console.log('2. Processing EPC CSV stream...')

    const fileStream = fs.createReadStream(INPUT_FILE)
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

    let headers: string[] = []
    let isHeader = true
    let matchCount = 0
    let updates: any[] = []
    const BATCH_SIZE = 500

    for await (const line of rl) {
        if (!line.trim()) continue
        const cols = parseCSVLine(line)

        if (isHeader) {
            headers = cols
            isHeader = false
            continue
        }

        const row: any = {}
        headers.forEach((h, i) => row[h] = cols[i])

        // Filter Area
        const postcodeRaw = row['POSTCODE'] || ''
        if (!TARGET_POSTCODE_PREFIXES.some(prefix => postcodeRaw.startsWith(prefix))) continue

        const postcodeClean = postcodeRaw.replace(/\s/g, '').toUpperCase()
        const availableProps = propMap.get(postcodeClean)

        if (availableProps && availableProps.length > 0) {
            // Grab a "Ghost" property
            const targetProp = availableProps.pop()

            updates.push({
                id: targetProp.id,
                // CRITICAL: We must send these back or Supabase rejects the row
                lat: targetProp.lat,
                lon: targetProp.lon,
                postcode: row['POSTCODE'], // Keep original format

                // Enriched Data
                display_label: row['ADDRESS'],
                house_number: row['ADDRESS1']?.split(',')[0] || row['ADDRESS1'],
                street: row['ADDRESS2'] || row['ADDRESS1'],
                uprn: row['UPRN'],
                epc_floor_area: parseFloat(row['TOTAL_FLOOR_AREA']) || null,
                epc_property_type: row['PROPERTY_TYPE'],
                energy_rating: row['CURRENT_ENERGY_RATING'],

                has_address_data: true,
                has_size_data: !!row['TOTAL_FLOOR_AREA'],
                updated_at: new Date().toISOString()
            })

            matchCount++
        }

        if (updates.length >= BATCH_SIZE) {
            await processBatch(supabase, updates)
            updates = []
            process.stdout.write(`\r   Matched & Updated: ${matchCount} homes...`)
        }
    }

    if (updates.length > 0) await processBatch(supabase, updates)

    console.log(`\n🎉 DONE! Enriched ${matchCount} properties with EPC data.`)
}

async function processBatch(supabase: any, batch: any[]) {
    const { error } = await supabase
        .from('properties')
        .upsert(batch, { onConflict: 'id' })

    if (error) console.error('\n❌ Error saving batch:', error.message)
}

main().catch(console.error)