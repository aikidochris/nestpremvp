/**
 * SHADOW MARKET IMPORTER (Rightmove Edition)
 * Reads 'data/market_listings.csv' and turns on the "For Sale" lights on the map.
 */
import { createSupabaseAdminClient } from '../src/lib/supabaseAdmin'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const INPUT_FILE = path.join(process.cwd(), 'data', 'market_listings.csv')

// --- Helpers ---

function parsePrice(str: string): number | null {
    if (!str) return null
    const clean = str.replace(/[^\d]/g, '') // "£350,000" -> "350000"
    return clean ? parseInt(clean) : null
}

// Robust CSV Parser (Handles quotes correctly)
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

    // 1. Index the Database (We need to find where to put the data)
    console.log('1. Indexing Nest Properties...')
    const propMap = new Map<string, any[]>()
    let start = 0
    const FETCH_SIZE = 1000

    while (true) {
        const { data: props, error } = await supabase
            .from('properties')
            .select('id, postcode, house_number, street, lat, lon')
            .not('postcode', 'is', null)
            .range(start, start + FETCH_SIZE - 1)

        if (error || !props || props.length === 0) break

        props.forEach(p => {
            const pc = p.postcode.replace(/\s/g, '').toUpperCase()
            if (!propMap.has(pc)) propMap.set(pc, [])
            propMap.get(pc)?.push(p)
        })

        start += FETCH_SIZE
        process.stdout.write(`\r   Indexed ${start} homes...`)
    }
    console.log('\n   ✅ DB Ready.')

    // 2. Process the Rightmove CSV
    console.log('2. Processing Rightmove Listings...')

    if (!fs.existsSync(INPUT_FILE)) {
        console.error('❌ Error: File data/market_listings.csv not found.')
        return
    }

    const fileStream = fs.createReadStream(INPUT_FILE)
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

    let headers: string[] = []
    let isHeader = true
    let updates: any[] = []
    let matchCount = 0
    const BATCH_SIZE = 500

    // Column Indexes (We detect them dynamically)
    let idxAddress = -1
    let idxPrice = -1
    let idxUrl = -1
    let idxImg = -1

    for await (const line of rl) {
        const cols = parseCSVLine(line)

        if (isHeader) {
            headers = cols
            // Find the crazy Rightmove column names automatically
            idxAddress = headers.findIndex(h => h.includes('PropertyAddress_address'))
            idxPrice = headers.findIndex(h => h.includes('PropertyPrice_price'))
            idxUrl = headers.findIndex(h => h.includes('propertyCard-img-link'))
            idxImg = headers.findIndex(h => h.includes('PropertyCardImage_fallback'))

            console.log('   mapped columns:', { idxAddress, idxPrice, idxUrl, idxImg })
            isHeader = false
            continue
        }

        if (idxAddress === -1) continue // Skip if mapping failed

        const addressRaw = cols[idxAddress]
        const priceRaw = cols[idxPrice]
        const urlRaw = cols[idxUrl]
        const imgRaw = cols[idxImg]

        if (!addressRaw) continue

        // 3. Match Logic
        // Extract Postcode (NE26 1AB)
        const pcMatch = addressRaw.match(/([A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2})/i)
        if (!pcMatch) continue
        const postcode = pcMatch[0].replace(/\s/g, '').toUpperCase()

        // Extract Number (First digits)
        const numMatch = addressRaw.match(/^(\d+)/)
        const houseNumber = numMatch ? numMatch[0] : null

        // Lookup in our DB
        const candidates = propMap.get(postcode)
        if (!candidates) continue

        const match = candidates.find(p => {
            if (houseNumber) return p.house_number === houseNumber
            return false // Strict number matching for safety
        })

        if (match) {
            updates.push({
                id: match.id,
                market_status: 'sale',
                asking_price: parsePrice(priceRaw),
                market_link: urlRaw,
                market_image_url: imgRaw,
                // REQUIRED: Re-send location data to satisfy Supabase
                lat: match.lat,
                lon: match.lon,
                updated_at: new Date().toISOString()
            })
            matchCount++
        }

        // Batch Save
        if (updates.length >= BATCH_SIZE) {
            await processBatch(supabase, updates)
            updates = []
            process.stdout.write(`\r   Matched & Activated: ${matchCount} listings...`)
        }
    }

    if (updates.length > 0) await processBatch(supabase, updates)
    console.log(`\n🎉 DONE! The map is now LIVE with ${matchCount} properties for sale.`)
}

async function processBatch(supabase: any, batch: any[]) {
    const { error } = await supabase.from('properties').upsert(batch, { onConflict: 'id' })
    if (error) console.error('\n❌ Error:', error.message)
}

main().catch(console.error)