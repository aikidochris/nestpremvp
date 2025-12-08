export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          created_at: string
          house_number: string | null
          id: string
          lat: number
          lon: number
          postcode: string | null
          price_estimate: string | null
          street: string | null
          uprn: string | null
        }
        Insert: {
          created_at?: string
          house_number?: string | null
          id?: string
          lat: number
          lon: number
          postcode?: string | null
          price_estimate?: string | null
          street?: string | null
          uprn?: string | null
        }
        Update: {
          created_at?: string
          house_number?: string | null
          id?: string
          lat?: number
          lon?: number
          postcode?: string | null
          price_estimate?: string | null
          street?: string | null
          uprn?: string | null
        }
      }
      property_claims: {
        Row: {
          created_at: string
          id: string
          property_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          status?: string
          user_id?: string
        }
      }
      home_story: {
        Row: {
          created_at: string
          id: string
          images: string[] | null
          property_id: string
          summary_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          images?: string[] | null
          property_id: string
          summary_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          images?: string[] | null
          property_id?: string
          summary_text?: string | null
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          is_admin: boolean | null
          role: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          is_admin?: boolean | null
          role?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          is_admin?: boolean | null
          role?: string
          user_id?: string
        }
      }
      shops: {
        Row: {
          address: string
          approved: boolean
          approved_by: string | null
          created_at: string
          crypto_accepted: Json
          description: string | null
          hours: Json | null
          id: string
          latitude: number
          longitude: number
          name: string
          phone: string | null
          submitted_by: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address: string
          approved?: boolean
          approved_by?: string | null
          created_at?: string
          crypto_accepted?: Json
          description?: string | null
          hours?: Json | null
          id?: string
          latitude: number
          longitude: number
          name: string
          phone?: string | null
          submitted_by?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string
          approved?: boolean
          approved_by?: string | null
          created_at?: string
          crypto_accepted?: Json
          description?: string | null
          hours?: Json | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          phone?: string | null
          submitted_by?: string | null
          updated_at?: string
          website?: string | null
        }
      }
      intent_flags: {
        Row: {
          created_at: string
          property_id: string
          owner_id: string
          soft_listing: boolean | null
          is_for_sale: boolean | null
          is_for_rent: boolean | null
          claimed_by_user_id: string | null
          is_claimed: boolean | null
        }
        Insert: {
          created_at?: string
          property_id: string
          owner_id: string
          soft_listing?: boolean | null
          is_for_sale?: boolean | null
          is_for_rent?: boolean | null
          claimed_by_user_id?: string | null
          is_claimed?: boolean | null
        }
        Update: {
          created_at?: string
          property_id?: string
          owner_id?: string
          soft_listing?: boolean | null
          is_for_sale?: boolean | null
          is_for_rent?: boolean | null
          claimed_by_user_id?: string | null
          is_claimed?: boolean | null
        }
      }
      messages: {
        Row: {
          id: string
          created_at: string
          sender_id: string
          receiver_id: string | null
          property_id: string
          body: string
          status: 'unread' | 'read' | 'pending_request'
          thread_id?: string
          conversation_id?: string
        }
        Insert: {
          id?: string
          created_at?: string
          sender_id: string
          receiver_id?: string | null
          property_id: string
          body: string
          status?: 'unread' | 'read' | 'pending_request'
        }
        Update: {
          id?: string
          created_at?: string
          sender_id?: string
          receiver_id?: string | null
          property_id?: string
          body?: string
          status?: 'unread' | 'read' | 'pending_request'
        }
      }
      search_logs: {
        Row: {
          id: number
          created_at: string
          query: string
          found_count: number
          user_id: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          query: string
          found_count: number
          user_id?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          query?: string
          found_count?: number
          user_id?: string | null
        }
      }
    }
    Views: {
      property_public_view: {
        Row: {
          claimed_by_user_id: string | null
          has_recent_activity: boolean | null
          is_claimed: boolean | null
          is_for_rent: boolean | null
          is_for_sale: boolean | null
          is_open_to_talking: boolean | null
          lat: number | null
          lon: number | null
          property_id: string | null
        }
        Insert: {
          claimed_by_user_id?: string | null
          has_recent_activity?: boolean | null
          is_claimed?: boolean | null
          is_for_rent?: boolean | null
          is_for_sale?: boolean | null
          is_open_to_talking?: boolean | null
          lat?: number | null
          lon?: number | null
          property_id?: string | null
        }
        Update: {
          claimed_by_user_id?: string | null
          has_recent_activity?: boolean | null
          is_claimed?: boolean | null
          is_for_rent?: boolean | null
          is_for_sale?: boolean | null
          is_open_to_talking?: boolean | null
          lat?: number | null
          lon?: number | null
          property_id?: string | null
        }
      }
    }
    Functions: {
      get_admin_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_admin_export_data: {
        Args: {
          export_type: string
        }
        Returns: Json
      }
      admin_list_users: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_list_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_update_claim_status: {
        Args: {
          claim_id: string
          new_status: string
        }
        Returns: void
      }
      admin_delete_user: {
        Args: {
          target_user_id: string
        }
        Returns: void
      }
      admin_create_property: {
        Args: {
          lat: number
          lon: number
          address_data: Json
        }
        Returns: string
      }
      admin_update_property: {
        Args: {
          property_id: string
          update_data: Json
        }
        Returns: void
      }
      admin_delete_property: {
        Args: {
          target_property_id: string
        }
        Returns: void
      }
      admin_move_pin: {
        Args: {
          target_property_id: string
          new_lat: number
          new_lon: number
        }
        Returns: void
      }
    }
    Enums: {}
  }
}
