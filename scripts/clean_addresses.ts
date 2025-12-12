/**
 * ADDRESS CLEANING SCRIPT (Fixed)
 * Fixes "Double Addresses" and includes Lat/Lon to satisfy DB constraints.
 */
import { createSupabaseAdminClient } from '../src/lib/supabaseAdmin'

async function main() {
    const supabase = createSupabaseAdminClient()

    console.log('1. Fetching properties with address data...')

    let start = 0
    const BATCH_SIZE = 1000
    let fixedCount = 0
    let totalChecked = 0

    while (true) {
        // 1. Fetch Lat/Lon as well so we can send them back
        const { data: props, error } = await supabase
            .from('properties')
            .select('id, house_number, street, display_label, lat, lon')
            .not('house_number', 'is', null)
            .range(start, start + BATCH_SIZE - 1)

        if (error) {
            console.error('❌ DB Error:', error)
            break
        }
        if (!props || props.length === 0) break

        const updates = []

        for (const p of (props as any[])) {
            let num = p.house_number?.trim()
            let st = p.street?.trim()

            if (!num || !st) continue

            // The Logic: If Street starts with Number (case insensitive)
            if (st.toLowerCase().startsWith(num.toLowerCase())) {

                // Remove number from street
                let newStreet = st.substring(num.length).trim()

                // Clean leading punctuation like ", " or "- "
                // Regex: Removes leading commas, dashes, and spaces
                newStreet = newStreet.replace(/^[\s,\-]+/, '')

                // Only update if it changed
                if (newStreet && newStreet !== st) {
                    updates.push({
                        id: p.id,
                        street: newStreet,
                        // CRITICAL: Send back the existing Lat/Lon to satisfy Supabase
                        lat: p.lat,
                        lon: p.lon,
                        updated_at: new Date().toISOString()
                    })
                }
            }
        }

        if (updates.length > 0) {
            const { error: upErr } = await supabase.from('properties').upsert(updates as any, { onConflict: 'id' })

            if (upErr) {
                console.error('❌ Update Error:', upErr.message)
            } else {
                fixedCount += updates.length
            }
        }

        totalChecked += props.length
        start += BATCH_SIZE
        process.stdout.write(`\r   Checked: ${totalChecked} | Successfully Fixed: ${fixedCount} ...`)
    }

    console.log(`\n🎉 DONE! Actually cleaned ${fixedCount} addresses.`)
}

main().catch(console.error)