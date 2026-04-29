export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      households: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name?: string; created_at?: string }
        Update: { id?: string; name?: string; created_at?: string }
      }
      profiles: {
        Row: {
          id: string
          household_id: string | null
          display_name: string
          avatar_color: string
          created_at: string
        }
        Insert: {
          id: string
          household_id?: string | null
          display_name: string
          avatar_color?: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string | null
          display_name?: string
          avatar_color?: string
          created_at?: string
        }
      }
      household_invites: {
        Row: {
          id: string
          household_id: string
          invited_by: string
          token: string
          used_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          invited_by: string
          token?: string
          used_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          invited_by?: string
          token?: string
          used_at?: string | null
          expires_at?: string
          created_at?: string
        }
      }
      envelopes: {
        Row: {
          id: string
          household_id: string
          name: string
          icon: string
          color: string
          budget_amount: number
          sort_order: number
          archived: boolean
          is_goal: boolean
          target_amount: number | null
          target_date: string | null
          reset_monthly: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          icon?: string
          color?: string
          budget_amount?: number
          sort_order?: number
          archived?: boolean
          is_goal?: boolean
          target_amount?: number | null
          target_date?: string | null
          reset_monthly?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          icon?: string
          color?: string
          budget_amount?: number
          sort_order?: number
          archived?: boolean
          is_goal?: boolean
          target_amount?: number | null
          target_date?: string | null
          reset_monthly?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          household_id: string
          envelope_id: string | null
          created_by: string
          type: 'spend' | 'allocate' | 'transfer_out' | 'transfer_in'
          amount: number
          description: string
          merchant: string | null
          transfer_pair_id: string | null
          transaction_date: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          envelope_id?: string | null
          created_by: string
          type: 'spend' | 'allocate' | 'transfer_out' | 'transfer_in'
          amount: number
          description?: string
          merchant?: string | null
          transfer_pair_id?: string | null
          transaction_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          envelope_id?: string | null
          created_by?: string
          type?: 'spend' | 'allocate' | 'transfer_out' | 'transfer_in'
          amount?: number
          description?: string
          merchant?: string | null
          transfer_pair_id?: string | null
          transaction_date?: string
          created_at?: string
        }
      }
      budget_periods: {
        Row: {
          id: string
          household_id: string
          envelope_id: string
          period_month: string
          allocated: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          envelope_id: string
          period_month: string
          allocated?: number
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          envelope_id?: string
          period_month?: string
          allocated?: number
          created_at?: string
        }
      }
    }
    Views: {
      envelope_balances: {
        Row: {
          envelope_id: string
          household_id: string
          name: string
          icon: string
          color: string
          budget_amount: number
          archived: boolean
          is_goal: boolean
          target_amount: number | null
          target_date: string | null
          reset_monthly: boolean
          balance: number
        }
      }
    }
    Functions: {
      my_household_id: { Args: Record<string, never>; Returns: string }
    }
    Enums: {}
  }
}

// Convenience types
export type Envelope = Database['public']['Tables']['envelopes']['Row']
export type EnvelopeInsert = Database['public']['Tables']['envelopes']['Insert']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Household = Database['public']['Tables']['households']['Row']
export type EnvelopeBalance = Database['public']['Views']['envelope_balances']['Row']
