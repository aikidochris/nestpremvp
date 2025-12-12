
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read env.local manualy
const envPath = path.resolve(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=')
    if (key && val) envVars[key.trim()] = val.trim()
})

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL']
const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function getLink(email: string) {
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email
    })

    if (error) {
        console.error('Error:', error)
        process.exit(1)
    }

    // Output only the link
    console.log(data.properties.action_link)
}

const emailArg = process.argv[2]
if (!emailArg) {
    console.error('Please provide email')
    process.exit(1)
}

getLink(emailArg)
