/**
 * SOLD PRICE ENRICHMENT SCRIPT (Fixed)
 * Injects 'last_sale_price' and 'last_sale_date'.
 * FIX: Includes Lat/Lon in the update payload to satisfy DB constraints.
 */
import { createSupabaseAdminClient } from '../src/lib/supabaseAdmin'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const INPUT_FILE = path.join(process.cwd(), 'data', 'sold_prices_ne.csv')

function parseCSVLine(line: string): string[] {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') { inQuotes = !inQuotes }
        else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''))
            current = ''
        } else { current += char }
    }
    result.push(current.trim().replace(/^"|"$/g, ''))
    return result
}

async function main() {
    const supabase = createSupabaseAdminClient()

    console.log('1. Fetching properties for matching...')

    // FETCH FIX: Get Lat/Lon as well
    const propMap = new Map<string, any[]>()
    let totalLoaded = 0
    let start = 0
    const FETCH_SIZE = 1000

    while (true) {
        const { data: props, error } = await supabase
            .from('properties')
            .select('id, postcode, house_number, street, display_label, lat, lon')
            .not('postcode', 'is', null)
            .range(start, start + FETCH_SIZE - 1)

        if (error) break
        if (!props || props.length === 0) break

        props.forEach(p => {
            const pc = p.postcode.replace(/\s/g, '').toUpperCase()
            if (!propMap.has(pc)) propMap.set(pc, [])
            propMap.get(pc)?.push(p)
        })

        totalLoaded += props.length
        start += FETCH_SIZE
        process.stdout.write(`\r   Loaded ${totalLoaded} homes...`)
    }

    console.log(`\n   ✅ Ready to match against Sold Prices.`)
    console.log('2. Processing Sold Price CSV...')

    const fileStream = fs.createReadStream(INPUT_FILE)
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

    let isHeader = true
    const BATCH_SIZE = 500

    // STORAGE FIX: Store price/date AND location data
    const pendingUpdates = new Map<string, {
        price: number,
        date: string,
        lat: number,
        lon: number
    }>()

    for await (const line of rl) {
        if (isHeader) { isHeader = false; continue }
        if (!line.trim()) continue

        const cols = parseCSVLine(line)

        const price = parseFloat(cols[1])
        const date = cols[2].split(' ')[0]
        const postcode = cols[3].replace(/\s/g, '').toUpperCase()
        const number = cols[7]

        const candidates = propMap.get(postcode)
        if (!candidates) continue

        const match = candidates.find(p => {
            return p.house_number === number ||
                (p.display_label && p.display_label.startsWith(number + ' '))
        })

        if (match) {
            const existing = pendingUpdates.get(match.id)
            // Keep the LATEST sale
            if (!existing || new Date(date) > new Date(existing.date)) {
                pendingUpdates.set(match.id, {
                    price,
                    date,
                    lat: match.lat,
                    lon: match.lon
                })
            }
        }
    }

    console.log(`   Found ${pendingUpdates.size} matches. Saving to DB...`)

    let currentBatch: any[] = []
    let matchCount = 0

    for (const [id, data] of pendingUpdates.entries()) {
        currentBatch.push({
            id: id,
            last_sale_price: data.price,
            last_sale_date: data.date,
            // PAYLOAD FIX: Include Lat/Lon
            lat: data.lat,
            lon: data.lon,
            updated_at: new Date().toISOString()
        })

        if (currentBatch.length >= BATCH_SIZE) {
            await processBatch(supabase, currentBatch)
            matchCount += currentBatch.length
            currentBatch = []
            process.stdout.write(`\r   Saved ${matchCount} sales records...`)
        }
    }

    if (currentBatch.length > 0) {
        await processBatch(supabase, currentBatch)
        matchCount += currentBatch.length
    }

    console.log(`\n🎉 DONE! Injected history into ${matchCount} homes.`)
}

async function processBatch(supabase: any, batch: any[]) {
    const { error } = await supabase
        .from('properties')
        .upsert(batch, { onConflict: 'id' })

    if (error) console.error('\n❌ Error:', error.message)
}

main().catch(console.error)