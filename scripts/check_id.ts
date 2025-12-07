import { createSupabaseAdminClient } from '../src/lib/supabaseAdmin'

async function checkId() {
    const supabase = createSupabaseAdminClient()

    // This is the ID that failed in your error log
    const targetId = 'b31e060a-9560-4268-9285-8afda6e85c67'

    console.log(`🕵️ Looking for ID: ${targetId}`)

    // 1. Check if it exists
    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', targetId)
        .single()

    if (error) {
        console.log('❌ Database Error:', error.message)
        console.log('   (This usually means the ID does not exist)')
    } else if (data) {
        console.log('✅ FOUND IT!', data)
        console.log('   The ID exists. The problem is likely the Update method.')
    } else {
        console.log('❌ NOT FOUND. The database does not have this ID.')
    }

    // 2. Check total count
    const count = await supabase.from('properties').select('*', { count: 'exact', head: true })
    console.log(`📊 Total Properties in DB: ${count.count}`)
}

checkId()