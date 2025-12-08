import type { Database } from '@/lib/database.types'

type IntentFlags = Database['public']['Tables']['intent_flags']
type SearchLogs = Database['public']['Tables']['search_logs']

const test: IntentFlags['Row'] = {
    created_at: '',
    property_id: '',
    owner_id: '',
    soft_listing: true,
    is_for_sale: false,
    is_for_rent: false,
    claimed_by_user_id: null,
    is_claimed: false
}
