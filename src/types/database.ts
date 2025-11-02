export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          is_admin: boolean
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          is_admin?: boolean
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          is_admin?: boolean
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shops: {
        Row: {
          id: string
          name: string
          description: string | null
          address: string
          latitude: number
          longitude: number
          crypto_accepted: Json
          website: string | null
          phone: string | null
          hours: Json | null
          approved: boolean
          submitted_by: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          address: string
          latitude: number
          longitude: number
          crypto_accepted?: Json
          website?: string | null
          phone?: string | null
          hours?: Json | null
          approved?: boolean
          submitted_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          address?: string
          latitude?: number
          longitude?: number
          crypto_accepted?: Json
          website?: string | null
          phone?: string | null
          hours?: Json | null
          approved?: boolean
          submitted_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          name: string
          description: string | null
          address: string
          latitude: number
          longitude: number
          crypto_accepted: Json
          website: string | null
          phone: string | null
          hours: Json | null
          status: string
          submitted_by: string | null
          reviewed_by: string | null
          review_notes: string | null
          created_at: string
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          address: string
          latitude: number
          longitude: number
          crypto_accepted?: Json
          website?: string | null
          phone?: string | null
          hours?: Json | null
          status?: string
          submitted_by?: string | null
          reviewed_by?: string | null
          review_notes?: string | null
          created_at?: string
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          address?: string
          latitude?: number
          longitude?: number
          crypto_accepted?: Json
          website?: string | null
          phone?: string | null
          hours?: Json | null
          status?: string
          submitted_by?: string | null
          reviewed_by?: string | null
          review_notes?: string | null
          created_at?: string
          reviewed_at?: string | null
        }
      }
      shop_images: {
        Row: {
          id: string
          shop_id: string
          image_url: string
          thumbnail_url: string
          is_primary: boolean
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          image_url: string
          thumbnail_url: string
          is_primary?: boolean
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          image_url?: string
          thumbnail_url?: string
          is_primary?: boolean
          uploaded_by?: string | null
          created_at?: string
        }
      }
      submission_images: {
        Row: {
          id: string
          submission_id: string
          image_url: string
          created_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          image_url: string
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          image_url?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          shop_id: string
          user_id: string
          content: string
          comment_type: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id: string
          content: string
          comment_type?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          user_id?: string
          content?: string
          comment_type?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          shop_id: string | null
          submission_id: string | null
          user_id: string
          vote_type: string
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          shop_id?: string | null
          submission_id?: string | null
          user_id: string
          vote_type: string
          value: number
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string | null
          submission_id?: string | null
          user_id?: string
          vote_type?: string
          value?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}