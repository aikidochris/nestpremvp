/**
 * UPRN ENRICHMENT SCRIPT (Fixed)
 * 1. Fetches ALL ghosts (fixes pagination).
 * 2. Correctly maps UPRN CSV columns: UPRN(0), LAT(3), LON(4).
 */
import { createSupabaseAdminClient } from '../src/lib/supabaseAdmin'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const INPUT_FILE = path.join(process.cwd(), 'data', 'os_open_uprn_ne.csv')
const MAX_DISTANCE_METERS = 20 // 20m tolerance for GPS drift

// Fast Haversine Distance
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

async function main() {
    const supabase = createSupabaseAdminClient()

    console.log('1. Fetching ALL "Ghost" properties (No UPRN)...')

    let allGhosts: any[] = []
    let start = 0
    const FETCH_SIZE = 1000

    // 1. Fetch Loop (Get all ghosts, not just first 1000)
    while (true) {
        const { data: ghosts, error } = await supabase
            .from('properties')
            .select('id, lat, lon')
            .is('uprn', null) // Only unmatched homes
            .range(start, start + FETCH_SIZE - 1)

        if (error) {
            console.error('❌ DB Error:', error)
            break
        }
        if (!ghosts || ghosts.length === 0) break

        allGhosts = allGhosts.concat(ghosts)
        start += FETCH_SIZE
        process.stdout.write(`\r   Fetched ${allGhosts.length} ghosts...`)
    }

    console.log(`\n   ✅ Found ${allGhosts.length} ghosts to check.`)
    console.log('2. Loading OS UPRN Data...')

    const uprns: any[] = []

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ ERROR: File not found at ${INPUT_FILE}`)
        return
    }

    const fileStream = fs.createReadStream(INPUT_FILE)
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

    let isHeader = true
    for await (const line of rl) {
        if (isHeader) { isHeader = false; continue }

        // CSV Format: UPRN, X, Y, LAT, LON
        // Indices:    0     1  2  3    4
        const cols = line.split(',')

        const u = cols[0]
        const lat = parseFloat(cols[3]) // Column 3 is LATITUDE
        const lon = parseFloat(cols[4]) // Column 4 is LONGITUDE

        if (u && !isNaN(lat) && !isNaN(lon)) {
            uprns.push({ u, lat, lon })
        }
    }
    console.log(`   Loaded ${uprns.length} UPRN points.`)

    console.log('3. Matching Ghosts to UPRNs...')

    // Spatial Bucket Optimization (Round to 2 decimals ~1.1km boxes)
    const buckets = new Map<string, any[]>()
    uprns.forEach(p => {
        const key = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`
        if (!buckets.has(key)) buckets.set(key, [])
        buckets.get(key)?.push(p)
    })

    let updates: any[] = []
    let matchCount = 0
    const BATCH_SIZE = 1000

    for (const ghost of allGhosts) {
        const key = `${ghost.lat.toFixed(2)},${ghost.lon.toFixed(2)}`
        const candidates = buckets.get(key) || []

        if (candidates.length === 0) continue

        let bestDist = Infinity
        let bestUprn = null

        for (const p of candidates) {
            const d = haversineMeters(ghost.lat, ghost.lon, p.lat, p.lon)
            if (d < bestDist) {
                bestDist = d
                bestUprn = p.u
            }
        }

        if (bestDist <= MAX_DISTANCE_METERS) {
            updates.push({
                id: ghost.id,
                uprn: bestUprn,
                // Must send Lat/Lon to satisfy Supabase update rules
                lat: ghost.lat,
                lon: ghost.lon,
                updated_at: new Date().toISOString()
            })
            matchCount++
        }

        if (updates.length >= BATCH_SIZE) {
            await processBatch(supabase, updates)
            updates = []
            process.stdout.write(`\r   Validated: ${matchCount} ghosts...`)
        }
    }

    if (updates.length > 0) await processBatch(supabase, updates)
    console.log(`\n🎉 DONE! Validated ${matchCount} ghosts with UPRNs.`)
}

async function processBatch(supabase: any, batch: any[]) {
    const { error } = await supabase.from('properties').upsert(batch, { onConflict: 'id' })
    if (error) console.error('\n❌ Error:', error.message)
}

main().catch(console.error)