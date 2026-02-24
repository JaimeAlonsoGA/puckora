// supabase/types.ts
// Auto-generated — do not edit manually.
// Run: npm run gen:types  (see scripts/gen-supabase-types.sh)

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
                    email: string
                    display_name: string | null
                    avatar_url: string | null
                    plan: 'free' | 'starter' | 'pro' | 'business'
                    stripe_customer_id: string | null
                    searches_today: number
                    cost_calcs_today: number
                    competitor_analyses_month: number
                    counters_reset_at: string
                    created_at: string
                    updated_at: string
                }
                Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string }
                Update: Partial<Database['public']['Tables']['profiles']['Row']>
            }
            saved_products: {
                Row: {
                    id: string
                    user_id: string
                    asin: string
                    marketplace: string
                    title: string | null
                    image_url: string | null
                    notes: string | null
                    tags: string[]
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['saved_products']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['saved_products']['Row']>
            }
            competitor_analyses: {
                Row: {
                    id: string
                    user_id: string
                    asin: string
                    marketplace: string
                    depth: number
                    status: 'pending' | 'processing' | 'completed' | 'failed'
                    error_message: string | null
                    result: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['competitor_analyses']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['competitor_analyses']['Row']>
            }
            pain_point_clusters: {
                Row: {
                    id: string
                    analysis_id: string
                    theme: string
                    frequency: number
                    severity: string
                    sample_quotes: string[]
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['pain_point_clusters']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['pain_point_clusters']['Row']>
            }
        }
        Functions: {
            match_categories: {
                Args: {
                    query_text: string
                    embedding_model?: string
                    match_count?: number
                    min_similarity?: number
                }
                Returns: Array<{
                    id: string
                    name: string
                    path: string
                    level: number
                    similarity: number
                }>
            }
        }
    }
}
