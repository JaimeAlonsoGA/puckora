export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      amazon_categories: {
        Row: {
          bestsellers_url: string | null
          breadcrumb: string[]
          created_at: string
          depth: number
          full_path: string
          id: string
          is_leaf: boolean
          last_scraped_at: string | null
          marketplace: string
          name: string
          parent_id: string | null
          scrape_status: string
        }
        Insert: {
          bestsellers_url?: string | null
          breadcrumb: string[]
          created_at?: string
          depth: number
          full_path: string
          id: string
          is_leaf?: boolean
          last_scraped_at?: string | null
          marketplace?: string
          name: string
          parent_id?: string | null
          scrape_status?: string
        }
        Update: {
          bestsellers_url?: string | null
          breadcrumb?: string[]
          created_at?: string
          depth?: number
          full_path?: string
          id?: string
          is_leaf?: boolean
          last_scraped_at?: string | null
          marketplace?: string
          name?: string
          parent_id?: string | null
          scrape_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "amazon_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "amazon_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      amazon_products: {
        Row: {
          asin: string
          brand: string | null
          browse_node_id: string | null
          bullet_points: string[] | null
          color: string | null
          created_at: string
          embedding: string | null
          enriched_at: string | null
          fba_fee: number | null
          item_height_cm: number | null
          item_length_cm: number | null
          item_weight_kg: number | null
          item_width_cm: number | null
          listing_date: string | null
          main_image_url: string | null
          manufacturer: string | null
          model_number: string | null
          package_quantity: number | null
          pkg_height_cm: number | null
          pkg_length_cm: number | null
          pkg_weight_kg: number | null
          pkg_width_cm: number | null
          price: number | null
          product_type: string | null
          product_url: string | null
          rating: number | null
          referral_fee: number | null
          review_count: number | null
          scrape_status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          asin: string
          brand?: string | null
          browse_node_id?: string | null
          bullet_points?: string[] | null
          color?: string | null
          created_at?: string
          embedding?: string | null
          enriched_at?: string | null
          fba_fee?: number | null
          item_height_cm?: number | null
          item_length_cm?: number | null
          item_weight_kg?: number | null
          item_width_cm?: number | null
          listing_date?: string | null
          main_image_url?: string | null
          manufacturer?: string | null
          model_number?: string | null
          package_quantity?: number | null
          pkg_height_cm?: number | null
          pkg_length_cm?: number | null
          pkg_weight_kg?: number | null
          pkg_width_cm?: number | null
          price?: number | null
          product_type?: string | null
          product_url?: string | null
          rating?: number | null
          referral_fee?: number | null
          review_count?: number | null
          scrape_status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          asin?: string
          brand?: string | null
          browse_node_id?: string | null
          bullet_points?: string[] | null
          color?: string | null
          created_at?: string
          embedding?: string | null
          enriched_at?: string | null
          fba_fee?: number | null
          item_height_cm?: number | null
          item_length_cm?: number | null
          item_weight_kg?: number | null
          item_width_cm?: number | null
          listing_date?: string | null
          main_image_url?: string | null
          manufacturer?: string | null
          model_number?: string | null
          package_quantity?: number | null
          pkg_height_cm?: number | null
          pkg_length_cm?: number | null
          pkg_weight_kg?: number | null
          pkg_width_cm?: number | null
          price?: number | null
          product_type?: string | null
          product_url?: string | null
          rating?: number | null
          referral_fee?: number | null
          review_count?: number | null
          scrape_status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_category_ranks: {
        Row: {
          asin: string
          category_id: string
          observed_at: string
          rank: number
          rank_type: string
        }
        Insert: {
          asin: string
          category_id: string
          observed_at?: string
          rank: number
          rank_type: string
        }
        Update: {
          asin?: string
          category_id?: string
          observed_at?: string
          rank?: number
          rank_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_ranks_asin_fkey"
            columns: ["asin"]
            isOneToOne: false
            referencedRelation: "amazon_products"
            referencedColumns: ["asin"]
          },
          {
            foreignKeyName: "product_category_ranks_asin_fkey"
            columns: ["asin"]
            isOneToOne: false
            referencedRelation: "product_financials"
            referencedColumns: ["asin"]
          },
          {
            foreignKeyName: "product_category_ranks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "amazon_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_financials: {
        Row: {
          amazon_fee_pct: number | null
          asin: string | null
          brand: string | null
          category_depth: number | null
          category_id: string | null
          category_path: string | null
          confidence: string | null
          daily_velocity: number | null
          fba_fee: number | null
          listing_date: string | null
          main_image_url: string | null
          monthly_net: number | null
          monthly_revenue: number | null
          monthly_units: number | null
          monthly_units_bsr: number | null
          monthly_units_review: number | null
          net_per_unit: number | null
          observed_at: string | null
          pkg_height_cm: number | null
          pkg_length_cm: number | null
          pkg_weight_kg: number | null
          pkg_width_cm: number | null
          price: number | null
          product_age_months: number | null
          product_type: string | null
          product_type_mismatch: boolean | null
          rank: number | null
          rank_type: string | null
          rating: number | null
          referral_fee: number | null
          review_count: number | null
          review_rate_per_month: number | null
          title: string | null
          total_amazon_fees: number | null
          w_bsr: number | null
          w_review: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_category_ranks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "amazon_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_progress: {
        Row: {
          best_seller_edges: number | null
          enriched: number | null
          enrichment_failed: number | null
          failed: number | null
          organic_edges: number | null
          pending: number | null
          scraped: number | null
          total_categories: number | null
          total_edges: number | null
          total_products: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
