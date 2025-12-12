
export interface MapProperty {
    id: string
    uprn: string | null
    postcode: string | null
    street: string | null
    house_number: string | null
    display_label?: string | null
    name?: string | null
    lat: number
    lon: number
    price_estimate: number | null
    claimed_by_user_id: string | null
    is_claimed: boolean
    is_open_to_talking: boolean
    is_for_sale: boolean
    is_for_rent: boolean
    has_recent_activity: boolean
    image_url?: string | null
    market_image_url?: string | null
    bedroom_estimate?: number | null
    home_type?: string | null
    last_sale_price?: number | null
    last_sale_date?: string | null
    energy_rating?: string | null
    epc_floor_area?: number | null
    epc_property_type?: string | null
    signals?: {
        is_for_sale: boolean
        is_for_rent: boolean
        soft_listing: boolean
    }
    summary_text?: string | null
}


export interface UserProfile {
    id: string
    email?: string
    display_name?: string
    avatar_url?: string
}
