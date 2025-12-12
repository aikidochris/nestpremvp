
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

async function confirmUser(email: string) {
    console.log(`Attempting to confirm user: ${email}`)

    // List users to find the ID
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
        console.error('Error listing users:', listError)
        process.exit(1)
    }

    const user = users.find(u => u.email === email)

    if (!user) {
        console.error('User not found')
        process.exit(1)
    }

    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        {
            email_confirm: true,
            password: 'password123'
        }
    )

    if (error) {
        console.error('Error confirming user:', error)
        process.exit(1)
    }

    console.log(`User ${email} confirmed successfully.`)
}

const emailArg = process.argv[2]
if (!emailArg) {
    console.error('Please provide email')
    process.exit(1)
}

confirmUser(emailArg)
