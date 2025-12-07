import { createSupabaseAdminClient } from '../src/lib/supabaseAdmin'
import fs from 'fs'
import path from 'path'

async function exportProperties() {
    const supabase = createSupabaseAdminClient()
    const filePath = path.join(process.cwd(), 'data', 'properties_raw.csv')
    const BATCH_SIZE = 1000

    console.log('Fetching properties from Supabase (this may take a moment)...')

    // 1. Create file and write headers
    // We use simple CSV format: id, lat, lon
    fs.writeFileSync(filePath, 'id,lat,lon\n')

    let start = 0
    let total = 0
    let hasMore = true

    // 2. Loop until we get everything
    while (hasMore) {
        const { data, error } = await supabase
            .from('properties')
            .select('id, lat, lon')
            .range(start, start + BATCH_SIZE - 1)

        if (error) {
            console.error('❌ Error fetching batch:', error)
            break
        }

        if (!data || data.length === 0) {
            hasMore = false
            break
        }

        // 3. Convert JSON to CSV lines manually to avoid header duplication
        const lines = data.map(p => `${p.id},${p.lat},${p.lon}`).join('\n')
        fs.appendFileSync(filePath, lines + '\n')

        total += data.length
        start += BATCH_SIZE

        // Simple progress log
        process.stdout.write(`\rFetched ${total} rows...`)
    }

    console.log(`\n✅ Done! Exported ${total} properties to ${filePath}`)
}

exportProperties()