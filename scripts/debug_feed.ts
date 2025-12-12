import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load env validation
const envPath = path.resolve(process.cwd(), '.env.local')
const envConfig = fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, val] = line.split('=')
        if (key && val) acc[key.trim()] = val.trim()
        return acc
    }, {} as Record<string, string>)

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = envConfig['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugFeed() {
    console.log('--- Deep Debug: Live Feed Pipeline ---\n')

    // 1. Check what status values exist in property_claims
    console.log('1. Checking property_claims status values...')
    const { data: claimStatuses, error: claimStatusError } = await supabase
        .from('property_claims')
        .select('status')

    if (claimStatusError) console.error('Error:', claimStatusError)
    else {
        const statusCounts = claimStatuses?.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1
            return acc
        }, {} as Record<string, number>)
        console.log('Claim Status Distribution:', statusCounts)
    }

    // 2. Check if properties have geom column populated
    console.log('\n2. Checking if properties have geom column...')
    const { data: geomCheck, error: geomError } = await supabase
        .from('properties')
        .select('id, lat, lon, geom')
        .limit(5)

    if (geomError) console.error('Error:', geomError)
    else {
        console.log('Sample properties geom check:')
        geomCheck?.forEach(p => {
            console.log(`  ID: ${p.id}, lat: ${p.lat}, lon: ${p.lon}, geom: ${p.geom ? 'EXISTS' : 'NULL'}`)
        })
    }

    // 3. Test RPC with NULL location (should return global)
    console.log('\n3. Testing RPC with NULL location (global feed)...')
    const { data: globalData, error: globalError } = await supabase.rpc('get_activity_feed', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_lat: null,
        p_lon: null,
        p_radius_meters: null
    })

    if (globalError) console.error('Global RPC Error:', globalError)
    else {
        console.log(`Global RPC returned ${globalData?.length} items.`)
        if (globalData && globalData.length > 0) {
            console.log('First item:', globalData[0])
        }
    }

    // 4. Check if frontend is receiving null location
    console.log('\n4. Check: Is currentCenter being passed correctly?')
    console.log('   -> This needs browser console logging. Add console.log in AreaPulsePanel.')

    // 5. Test with explicit coordinates known to have data
    console.log('\n5. Testing with coordinates from a known property...')
    const { data: knownProp } = await supabase
        .from('properties')
        .select('lat, lon')
        .limit(1)
        .single()

    if (knownProp) {
        console.log(`Testing RPC at (${knownProp.lat}, ${knownProp.lon})...`)
        const { data: localData, error: localError } = await supabase.rpc('get_activity_feed', {
            p_user_id: '00000000-0000-0000-0000-000000000000',
            p_lat: knownProp.lat,
            p_lon: knownProp.lon,
            p_radius_meters: 10000 // 10km
        })
        if (localError) console.error('Local RPC Error:', localError)
        else console.log(`Local RPC at property coords returned ${localData?.length} items.`)
    }
}

debugFeed()
