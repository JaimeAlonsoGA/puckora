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
          avg_bsr: number | null
          avg_price: number | null
          avg_rating: number | null
          breadcrumb: string[]
          closing_fee_usd: number | null
          competition_level:
          | Database["public"]["Enums"]["competition_level"]
          | null
          created_at: string
          depth: number
          full_path: string
          hazmat_risk: boolean
          id: string
          is_active: boolean
          is_leaf: boolean
          is_restricted: boolean
          ltree_path: unknown
          marketplace: Database["public"]["Enums"]["marketplace"]
          name: string
          opportunity_score: number | null
          parent_id: string | null
          product_count_est: number | null
          referral_fee_pct: number | null
          requires_approval: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          avg_bsr?: number | null
          avg_price?: number | null
          avg_rating?: number | null
          breadcrumb?: string[]
          closing_fee_usd?: number | null
          competition_level?:
          | Database["public"]["Enums"]["competition_level"]
          | null
          created_at?: string
          depth?: number
          full_path: string
          hazmat_risk?: boolean
          id: string
          is_active?: boolean
          is_leaf?: boolean
          is_restricted?: boolean
          ltree_path?: unknown
          marketplace?: Database["public"]["Enums"]["marketplace"]
          name: string
          opportunity_score?: number | null
          parent_id?: string | null
          product_count_est?: number | null
          referral_fee_pct?: number | null
          requires_approval?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          avg_bsr?: number | null
          avg_price?: number | null
          avg_rating?: number | null
          breadcrumb?: string[]
          closing_fee_usd?: number | null
          competition_level?:
          | Database["public"]["Enums"]["competition_level"]
          | null
          created_at?: string
          depth?: number
          full_path?: string
          hazmat_risk?: boolean
          id?: string
          is_active?: boolean
          is_leaf?: boolean
          is_restricted?: boolean
          ltree_path?: unknown
          marketplace?: Database["public"]["Enums"]["marketplace"]
          name?: string
          opportunity_score?: number | null
          parent_id?: string | null
          product_count_est?: number | null
          referral_fee_pct?: number | null
          requires_approval?: boolean
          slug?: string
          updated_at?: string
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
      affiliate_profiles: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          payout_email: string | null
          status: string
          total_earned: number
          user_id: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          payout_email?: string | null
          status?: string
          total_earned?: number
          user_id: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          payout_email?: string | null
          status?: string
          total_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calculation_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          input_defaults: Json
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          input_defaults?: Json
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          input_defaults?: Json
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculation_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      category_embeddings: {
        Row: {
          category_id: string
          created_at: string
          embedding: string
          id: string
          model: string
          source_text: string
        }
        Insert: {
          category_id: string
          created_at?: string
          embedding: string
          id?: string
          model?: string
          source_text: string
        }
        Update: {
          category_id?: string
          created_at?: string
          embedding?: string
          id?: string
          model?: string
          source_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_embeddings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "amazon_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_fba_fees: {
        Row: {
          category_id: string
          closing_fee_usd: number | null
          created_at: string
          id: string
          marketplace: Database["public"]["Enums"]["marketplace"]
          min_referral_fee: number | null
          oversize_fee: number | null
          per_kg_fee_usd: number | null
          referral_fee_pct: number
          source: string
          standard_size_fee: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          category_id: string
          closing_fee_usd?: number | null
          created_at?: string
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"]
          min_referral_fee?: number | null
          oversize_fee?: number | null
          per_kg_fee_usd?: number | null
          referral_fee_pct: number
          source?: string
          standard_size_fee?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          category_id?: string
          closing_fee_usd?: number | null
          created_at?: string
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"]
          min_referral_fee?: number | null
          oversize_fee?: number | null
          per_kg_fee_usd?: number | null
          referral_fee_pct?: number
          source?: string
          standard_size_fee?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_fba_fees_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "amazon_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_analyses: {
        Row: {
          asin: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          marketplace: Database["public"]["Enums"]["marketplace"]
          max_rating: number | null
          max_reviews: number
          min_rating: number | null
          product_id: string | null
          queued_at: string | null
          reviews_clustered: number
          reviews_scraped: number
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          asin: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"]
          max_rating?: number | null
          max_reviews?: number
          min_rating?: number | null
          product_id?: string | null
          queued_at?: string | null
          reviews_clustered?: number
          reviews_scraped?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"]
          max_rating?: number | null
          max_reviews?: number
          min_rating?: number | null
          product_id?: string | null
          queued_at?: string | null
          reviews_clustered?: number
          reviews_scraped?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_calculations: {
        Row: {
          break_even_price: number | null
          created_at: string
          fba_fulfillment_fee: number | null
          fba_referral_fee: number | null
          id: string
          input: Json
          is_archived: boolean
          is_favourite: boolean
          name: string | null
          product_id: string | null
          projected_margin_pct: number | null
          projected_monthly_profit: number | null
          projected_roi_pct: number | null
          recommended_sell_price: number | null
          result: Json
          shipping_cost_per_unit: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"] | null
          supplier_cost_per_unit: number | null
          supplier_product_id: string | null
          total_landed_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          break_even_price?: number | null
          created_at?: string
          fba_fulfillment_fee?: number | null
          fba_referral_fee?: number | null
          id?: string
          input: Json
          is_archived?: boolean
          is_favourite?: boolean
          name?: string | null
          product_id?: string | null
          projected_margin_pct?: number | null
          projected_monthly_profit?: number | null
          projected_roi_pct?: number | null
          recommended_sell_price?: number | null
          result: Json
          shipping_cost_per_unit?: number | null
          shipping_method?:
          | Database["public"]["Enums"]["shipping_method"]
          | null
          supplier_cost_per_unit?: number | null
          supplier_product_id?: string | null
          total_landed_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          break_even_price?: number | null
          created_at?: string
          fba_fulfillment_fee?: number | null
          fba_referral_fee?: number | null
          id?: string
          input?: Json
          is_archived?: boolean
          is_favourite?: boolean
          name?: string | null
          product_id?: string | null
          projected_margin_pct?: number | null
          projected_monthly_profit?: number | null
          projected_roi_pct?: number | null
          recommended_sell_price?: number | null
          result?: Json
          shipping_cost_per_unit?: number | null
          shipping_method?:
          | Database["public"]["Enums"]["shipping_method"]
          | null
          supplier_cost_per_unit?: number | null
          supplier_product_id?: string | null
          total_landed_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_calculations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_calculations_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_calculations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fba_fees_cache: {
        Row: {
          asin: string | null
          category_id: string | null
          closing_fee: number | null
          created_at: string
          dimensions_cm: Json | null
          expires_at: string
          fee_date: string
          fulfillment_fee: number | null
          id: string
          is_hazmat: boolean
          is_oversize: boolean
          long_term_storage_fee: number | null
          marketplace: Database["public"]["Enums"]["marketplace"]
          min_referral_fee: number | null
          monthly_storage_fee: number | null
          referral_fee_pct: number | null
          source: string
          weight_kg: number | null
        }
        Insert: {
          asin?: string | null
          category_id?: string | null
          closing_fee?: number | null
          created_at?: string
          dimensions_cm?: Json | null
          expires_at?: string
          fee_date?: string
          fulfillment_fee?: number | null
          id?: string
          is_hazmat?: boolean
          is_oversize?: boolean
          long_term_storage_fee?: number | null
          marketplace?: Database["public"]["Enums"]["marketplace"]
          min_referral_fee?: number | null
          monthly_storage_fee?: number | null
          referral_fee_pct?: number | null
          source?: string
          weight_kg?: number | null
        }
        Update: {
          asin?: string | null
          category_id?: string | null
          closing_fee?: number | null
          created_at?: string
          dimensions_cm?: Json | null
          expires_at?: string
          fee_date?: string
          fulfillment_fee?: number | null
          id?: string
          is_hazmat?: boolean
          is_oversize?: boolean
          long_term_storage_fee?: number | null
          marketplace?: Database["public"]["Enums"]["marketplace"]
          min_referral_fee?: number | null
          monthly_storage_fee?: number | null
          referral_fee_pct?: number | null
          source?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fba_fees_cache_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "amazon_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      market_opportunities: {
        Row: {
          category_id: string | null
          created_at: string
          data: Json | null
          description: string | null
          example_asins: string[] | null
          id: string
          marketplace: Database["public"]["Enums"]["marketplace"]
          score: number | null
          signal_type: Database["public"]["Enums"]["opportunity_type"]
          title: string
          updated_at: string
          valid_until: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          example_asins?: string[] | null
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"]
          score?: number | null
          signal_type: Database["public"]["Enums"]["opportunity_type"]
          title: string
          updated_at?: string
          valid_until?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          example_asins?: string[] | null
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"]
          score?: number | null
          signal_type?: Database["public"]["Enums"]["opportunity_type"]
          title?: string
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_opportunities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "amazon_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          preferences: Json
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          preferences?: Json
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          preferences?: Json
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_steps: {
        Row: {
          completed_at: string | null
          created_at: string
          data: Json | null
          id: string
          step: Database["public"]["Enums"]["onboarding_step"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          step: Database["public"]["Enums"]["onboarding_step"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          step?: Database["public"]["Enums"]["onboarding_step"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_reports: {
        Row: {
          analysis_id: string
          created_at: string
          dissatisfaction_rate: number | null
          id: string
          market_gap_summary: string | null
          opportunity_score: number | null
          suggested_improvements: string[] | null
          top_opportunities: Json
        }
        Insert: {
          analysis_id: string
          created_at?: string
          dissatisfaction_rate?: number | null
          id?: string
          market_gap_summary?: string | null
          opportunity_score?: number | null
          suggested_improvements?: string[] | null
          top_opportunities?: Json
        }
        Update: {
          analysis_id?: string
          created_at?: string
          dissatisfaction_rate?: number | null
          id?: string
          market_gap_summary?: string | null
          opportunity_score?: number | null
          suggested_improvements?: string[] | null
          top_opportunities?: Json
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_reports_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: true
            referencedRelation: "competitor_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      pain_point_clusters: {
        Row: {
          analysis_id: string
          avg_rating_in_cluster: number | null
          cluster_label: string
          cluster_theme: string
          created_at: string
          id: string
          is_actionable: boolean
          mention_count: number
          opportunity_signal: string | null
          representative_quotes: string[] | null
          severity_score: number
        }
        Insert: {
          analysis_id: string
          avg_rating_in_cluster?: number | null
          cluster_label: string
          cluster_theme: string
          created_at?: string
          id?: string
          is_actionable?: boolean
          mention_count?: number
          opportunity_signal?: string | null
          representative_quotes?: string[] | null
          severity_score?: number
        }
        Update: {
          analysis_id?: string
          avg_rating_in_cluster?: number | null
          cluster_label?: string
          cluster_theme?: string
          created_at?: string
          id?: string
          is_actionable?: boolean
          mention_count?: number
          opportunity_signal?: string | null
          representative_quotes?: string[] | null
          severity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "pain_point_clusters_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "competitor_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_details: {
        Row: {
          bought_together: string[] | null
          bullet_points: string[] | null
          description: string | null
          has_aplus: boolean
          keywords: string[] | null
          parent_asin: string | null
          product_id: string
          review_distribution: Json | null
          scraped_at: string
          seller_breakdown: Json | null
          updated_at: string
          variations: Json | null
        }
        Insert: {
          bought_together?: string[] | null
          bullet_points?: string[] | null
          description?: string | null
          has_aplus?: boolean
          keywords?: string[] | null
          parent_asin?: string | null
          product_id: string
          review_distribution?: Json | null
          scraped_at?: string
          seller_breakdown?: Json | null
          updated_at?: string
          variations?: Json | null
        }
        Update: {
          bought_together?: string[] | null
          bullet_points?: string[] | null
          description?: string | null
          has_aplus?: boolean
          keywords?: string[] | null
          parent_asin?: string | null
          product_id?: string
          review_distribution?: Json | null
          scraped_at?: string
          seller_breakdown?: Json | null
          updated_at?: string
          variations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "product_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_embeddings: {
        Row: {
          created_at: string
          embedding: string
          id: string
          model: string
          product_id: string
          source_text: string
        }
        Insert: {
          created_at?: string
          embedding: string
          id?: string
          model?: string
          product_id: string
          source_text: string
        }
        Update: {
          created_at?: string
          embedding?: string
          id?: string
          model?: string
          product_id?: string
          source_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_history: {
        Row: {
          bsr: number | null
          id: string
          monthly_sales_est: number | null
          opportunity_score: number | null
          price: number | null
          product_id: string
          rating: number | null
          review_count: number | null
          seller_count: number | null
          snapshot_at: string
        }
        Insert: {
          bsr?: number | null
          id?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          product_id: string
          rating?: number | null
          review_count?: number | null
          seller_count?: number | null
          snapshot_at?: string
        }
        Update: {
          bsr?: number | null
          id?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          product_id?: string
          rating?: number | null
          review_count?: number | null
          seller_count?: number | null
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_history_2025: {
        Row: {
          bsr: number | null
          id: string
          monthly_sales_est: number | null
          opportunity_score: number | null
          price: number | null
          product_id: string
          rating: number | null
          review_count: number | null
          seller_count: number | null
          snapshot_at: string
        }
        Insert: {
          bsr?: number | null
          id?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          product_id: string
          rating?: number | null
          review_count?: number | null
          seller_count?: number | null
          snapshot_at?: string
        }
        Update: {
          bsr?: number | null
          id?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          product_id?: string
          rating?: number | null
          review_count?: number | null
          seller_count?: number | null
          snapshot_at?: string
        }
        Relationships: []
      }
      product_history_2026: {
        Row: {
          bsr: number | null
          id: string
          monthly_sales_est: number | null
          opportunity_score: number | null
          price: number | null
          product_id: string
          rating: number | null
          review_count: number | null
          seller_count: number | null
          snapshot_at: string
        }
        Insert: {
          bsr?: number | null
          id?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          product_id: string
          rating?: number | null
          review_count?: number | null
          seller_count?: number | null
          snapshot_at?: string
        }
        Update: {
          bsr?: number | null
          id?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          product_id?: string
          rating?: number | null
          review_count?: number | null
          seller_count?: number | null
          snapshot_at?: string
        }
        Relationships: []
      }
      product_history_2027: {
        Row: {
          bsr: number | null
          id: string
          monthly_sales_est: number | null
          opportunity_score: number | null
          price: number | null
          product_id: string
          rating: number | null
          review_count: number | null
          seller_count: number | null
          snapshot_at: string
        }
        Insert: {
          bsr?: number | null
          id?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          product_id: string
          rating?: number | null
          review_count?: number | null
          seller_count?: number | null
          snapshot_at?: string
        }
        Update: {
          bsr?: number | null
          id?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          product_id?: string
          rating?: number | null
          review_count?: number | null
          seller_count?: number | null
          snapshot_at?: string
        }
        Relationships: []
      }
      product_history_future: {
        Row: {
          bsr: number | null
          id: string
          monthly_sales_est: number | null
          opportunity_score: number | null
          price: number | null
          product_id: string
          rating: number | null
          review_count: number | null
          seller_count: number | null
          snapshot_at: string
        }
        Insert: {
          bsr?: number | null
          id?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          product_id: string
          rating?: number | null
          review_count?: number | null
          seller_count?: number | null
          snapshot_at?: string
        }
        Update: {
          bsr?: number | null
          id?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          product_id?: string
          rating?: number | null
          review_count?: number | null
          seller_count?: number | null
          snapshot_at?: string
        }
        Relationships: []
      }
      product_supplier_matches: {
        Row: {
          created_at: string
          id: string
          match_method: Database["public"]["Enums"]["match_method"]
          match_score: number
          match_signals: Json | null
          product_id: string
          supplier_product_id: string
          updated_at: string
          verified_at: string | null
          verified_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_method?: Database["public"]["Enums"]["match_method"]
          match_score?: number
          match_signals?: Json | null
          product_id: string
          supplier_product_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_method?: Database["public"]["Enums"]["match_method"]
          match_score?: number
          match_signals?: Json | null
          product_id?: string
          supplier_product_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_psm_verified_by"
            columns: ["verified_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_matches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_matches_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          asin: string
          brand: string | null
          bsr: number | null
          bsr_category: string | null
          category_id: string | null
          category_path: string | null
          competition_level:
          | Database["public"]["Enums"]["competition_level"]
          | null
          created_at: string
          currency: string
          demand_score: number | null
          dimensions_cm: Json | null
          fba_seller_count: number | null
          id: string
          image_urls: string[] | null
          is_adult: boolean
          is_fba: boolean | null
          is_hazmat: boolean
          is_oversized: boolean
          is_sold_by_amazon: boolean | null
          main_image_url: string | null
          marketplace: Database["public"]["Enums"]["marketplace"]
          monthly_revenue_est: number | null
          monthly_sales_est: number | null
          needs_refresh_at: string
          opportunity_score: number | null
          price: number | null
          price_max: number | null
          price_min: number | null
          rating: number | null
          raw_data: Json | null
          review_count: number | null
          scraped_at: string
          seller_count: number | null
          title: string
          trend_score: number | null
          updated_at: string
          volume_cm3: number | null
          weight_kg: number | null
        }
        Insert: {
          asin: string
          brand?: string | null
          bsr?: number | null
          bsr_category?: string | null
          category_id?: string | null
          category_path?: string | null
          competition_level?:
          | Database["public"]["Enums"]["competition_level"]
          | null
          created_at?: string
          currency?: string
          demand_score?: number | null
          dimensions_cm?: Json | null
          fba_seller_count?: number | null
          id?: string
          image_urls?: string[] | null
          is_adult?: boolean
          is_fba?: boolean | null
          is_hazmat?: boolean
          is_oversized?: boolean
          is_sold_by_amazon?: boolean | null
          main_image_url?: string | null
          marketplace?: Database["public"]["Enums"]["marketplace"]
          monthly_revenue_est?: number | null
          monthly_sales_est?: number | null
          needs_refresh_at?: string
          opportunity_score?: number | null
          price?: number | null
          price_max?: number | null
          price_min?: number | null
          rating?: number | null
          raw_data?: Json | null
          review_count?: number | null
          scraped_at?: string
          seller_count?: number | null
          title: string
          trend_score?: number | null
          updated_at?: string
          volume_cm3?: number | null
          weight_kg?: number | null
        }
        Update: {
          asin?: string
          brand?: string | null
          bsr?: number | null
          bsr_category?: string | null
          category_id?: string | null
          category_path?: string | null
          competition_level?:
          | Database["public"]["Enums"]["competition_level"]
          | null
          created_at?: string
          currency?: string
          demand_score?: number | null
          dimensions_cm?: Json | null
          fba_seller_count?: number | null
          id?: string
          image_urls?: string[] | null
          is_adult?: boolean
          is_fba?: boolean | null
          is_hazmat?: boolean
          is_oversized?: boolean
          is_sold_by_amazon?: boolean | null
          main_image_url?: string | null
          marketplace?: Database["public"]["Enums"]["marketplace"]
          monthly_revenue_est?: number | null
          monthly_sales_est?: number | null
          needs_refresh_at?: string
          opportunity_score?: number | null
          price?: number | null
          price_max?: number | null
          price_min?: number | null
          rating?: number | null
          raw_data?: Json | null
          review_count?: number | null
          scraped_at?: string
          seller_count?: number | null
          title?: string
          trend_score?: number | null
          updated_at?: string
          volume_cm3?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "amazon_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          amazon_mws_token_ref: string | null
          amazon_seller_id: string | null
          auth_id: string
          avatar_url: string | null
          budget_range: string | null
          created_at: string
          email: string
          experience_level: string | null
          full_name: string | null
          id: string
          onboarding_completed_at: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          plan_expires_at: string | null
          preferences: Json
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amazon_mws_token_ref?: string | null
          amazon_seller_id?: string | null
          auth_id: string
          avatar_url?: string | null
          budget_range?: string | null
          created_at?: string
          email: string
          experience_level?: string | null
          full_name?: string | null
          id: string
          onboarding_completed_at?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_expires_at?: string | null
          preferences?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amazon_mws_token_ref?: string | null
          amazon_seller_id?: string | null
          auth_id?: string
          avatar_url?: string | null
          budget_range?: string | null
          created_at?: string
          email?: string
          experience_level?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_expires_at?: string | null
          preferences?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_embeddings: {
        Row: {
          analysis_id: string | null
          created_at: string
          embedding: string
          id: string
          model: string
          product_id: string
          rating: number | null
          review_id: string
          sentiment: string | null
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          embedding: string
          id?: string
          model?: string
          product_id: string
          rating?: number | null
          review_id: string
          sentiment?: string | null
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          embedding?: string
          id?: string
          model?: string
          product_id?: string
          rating?: number | null
          review_id?: string
          sentiment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_embeddings_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "competitor_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_suppliers: {
        Row: {
          created_at: string
          id: string
          linked_product_id: string | null
          notes: string | null
          supplier_id: string
          tags: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          linked_product_id?: string | null
          notes?: string | null
          supplier_id: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          linked_product_id?: string | null
          notes?: string | null
          supplier_id?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_suppliers_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_suppliers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_suppliers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          referral_code_id: string | null
          referred_user_id: string | null
          referrer_user_id: string | null
          revenue_amount: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          referral_code_id?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string | null
          revenue_amount?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          referral_code_id?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string | null
          revenue_amount?: number | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          first_result_asin: string | null
          id: string
          marketplace: Database["public"]["Enums"]["marketplace"]
          query: string
          result_count: number | null
          search_type: Database["public"]["Enums"]["search_type"]
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          first_result_asin?: string | null
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"]
          query: string
          result_count?: number | null
          search_type?: Database["public"]["Enums"]["search_type"]
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          first_result_asin?: string | null
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"]
          query?: string
          result_count?: number | null
          search_type?: Database["public"]["Enums"]["search_type"]
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_embeddings: {
        Row: {
          created_at: string
          embedding: string
          id: string
          model: string
          source_text: string
          supplier_product_id: string
        }
        Insert: {
          created_at?: string
          embedding: string
          id?: string
          model?: string
          source_text: string
          supplier_product_id: string
        }
        Update: {
          created_at?: string
          embedding?: string
          id?: string
          model?: string
          source_text?: string
          supplier_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_embeddings_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_inquiries: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          message: string | null
          moq: number | null
          notes: string | null
          product_id: string | null
          quoted_price: number | null
          replied_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          supplier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          message?: string | null
          moq?: number | null
          notes?: string | null
          product_id?: string | null
          quoted_price?: number | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          supplier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          message?: string | null
          moq?: number | null
          notes?: string | null
          product_id?: string | null
          quoted_price?: number | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_inquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_inquiries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          alibaba_product_id: string
          categories: string[] | null
          created_at: string
          currency: string
          id: string
          image_url: string | null
          is_customizable: boolean
          keywords: string[] | null
          lead_time_days: number | null
          moq: number
          price_max: number | null
          price_min: number | null
          price_tiers: Json | null
          raw_data: Json | null
          scraped_at: string
          shipping_options: string[] | null
          supplier_id: string
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          alibaba_product_id: string
          categories?: string[] | null
          created_at?: string
          currency?: string
          id?: string
          image_url?: string | null
          is_customizable?: boolean
          keywords?: string[] | null
          lead_time_days?: number | null
          moq?: number
          price_max?: number | null
          price_min?: number | null
          price_tiers?: Json | null
          raw_data?: Json | null
          scraped_at?: string
          shipping_options?: string[] | null
          supplier_id: string
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          alibaba_product_id?: string
          categories?: string[] | null
          created_at?: string
          currency?: string
          id?: string
          image_url?: string | null
          is_customizable?: boolean
          keywords?: string[] | null
          lead_time_days?: number | null
          moq?: number
          price_max?: number | null
          price_min?: number | null
          price_tiers?: Json | null
          raw_data?: Json | null
          scraped_at?: string
          shipping_options?: string[] | null
          supplier_id?: string
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          alibaba_id: string
          annual_revenue_usd: number | null
          avg_rating: number | null
          certifications: string[] | null
          country: string | null
          created_at: string
          embedding_keywords: string[] | null
          employees_count: number | null
          id: string
          is_gold_supplier: boolean
          is_trade_assurance: boolean
          is_verified: boolean
          main_categories: string[] | null
          main_products: string[] | null
          name: string
          needs_refresh_at: string
          raw_data: Json | null
          response_rate_pct: number | null
          response_time_hours: number | null
          scraped_at: string
          total_reviews: number | null
          transaction_level: string | null
          updated_at: string
          url: string | null
          years_on_platform: number | null
        }
        Insert: {
          alibaba_id: string
          annual_revenue_usd?: number | null
          avg_rating?: number | null
          certifications?: string[] | null
          country?: string | null
          created_at?: string
          embedding_keywords?: string[] | null
          employees_count?: number | null
          id?: string
          is_gold_supplier?: boolean
          is_trade_assurance?: boolean
          is_verified?: boolean
          main_categories?: string[] | null
          main_products?: string[] | null
          name: string
          needs_refresh_at?: string
          raw_data?: Json | null
          response_rate_pct?: number | null
          response_time_hours?: number | null
          scraped_at?: string
          total_reviews?: number | null
          transaction_level?: string | null
          updated_at?: string
          url?: string | null
          years_on_platform?: number | null
        }
        Update: {
          alibaba_id?: string
          annual_revenue_usd?: number | null
          avg_rating?: number | null
          certifications?: string[] | null
          country?: string | null
          created_at?: string
          embedding_keywords?: string[] | null
          employees_count?: number | null
          id?: string
          is_gold_supplier?: boolean
          is_trade_assurance?: boolean
          is_verified?: boolean
          main_categories?: string[] | null
          main_products?: string[] | null
          name?: string
          needs_refresh_at?: string
          raw_data?: Json | null
          response_rate_pct?: number | null
          response_time_hours?: number | null
          scraped_at?: string
          total_reviews?: number | null
          transaction_level?: string | null
          updated_at?: string
          url?: string | null
          years_on_platform?: number | null
        }
        Relationships: []
      }
      tracked_keywords: {
        Row: {
          created_at: string
          id: string
          keyword: string
          last_checked_at: string | null
          last_result_count: number | null
          marketplace: Database["public"]["Enums"]["marketplace"]
          notes: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          last_checked_at?: string | null
          last_result_count?: number | null
          marketplace?: Database["public"]["Enums"]["marketplace"]
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          last_checked_at?: string | null
          last_result_count?: number | null
          marketplace?: Database["public"]["Enums"]["marketplace"]
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracked_keywords_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_keywords_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_products: {
        Row: {
          bsr_alert_above: number | null
          bsr_alert_below: number | null
          collection_id: string | null
          created_at: string
          id: string
          notes: string | null
          price_alert_below: number | null
          product_id: string
          rating_alert_below: number | null
          stage: string
          tags: string[] | null
          tracked_bsr: number | null
          tracked_price: number | null
          tracked_rating: number | null
          tracked_review_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bsr_alert_above?: number | null
          bsr_alert_below?: number | null
          collection_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          price_alert_below?: number | null
          product_id: string
          rating_alert_below?: number | null
          stage?: string
          tags?: string[] | null
          tracked_bsr?: number | null
          tracked_price?: number | null
          tracked_rating?: number | null
          tracked_review_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bsr_alert_above?: number | null
          bsr_alert_below?: number | null
          collection_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          price_alert_below?: number | null
          product_id?: string
          rating_alert_below?: number | null
          stage?: string
          tags?: string[] | null
          tracked_bsr?: number | null
          tracked_price?: number | null
          tracked_rating?: number | null
          tracked_review_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_signals: {
        Row: {
          computed_at: string
          expires_at: string
          id: string
          marketplace: Database["public"]["Enums"]["marketplace"]
          period_days: number
          product_id: string
          signal_type: string
          value: number | null
        }
        Insert: {
          computed_at?: string
          expires_at?: string
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"]
          period_days?: number
          product_id: string
          signal_type: string
          value?: number | null
        }
        Update: {
          computed_at?: string
          expires_at?: string
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"]
          period_days?: number
          product_id?: string
          signal_type?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trend_signals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_products: {
        Row: {
          asin: string
          bsr: number | null
          category: string | null
          competition_score: number | null
          created_at: string
          id: string
          image_url: string | null
          marketplace: string
          monthly_sales_est: number | null
          opportunity_score: number | null
          price: number | null
          refreshed_at: string
          title: string
        }
        Insert: {
          asin: string
          bsr?: number | null
          category?: string | null
          competition_score?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          marketplace?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          refreshed_at?: string
          title: string
        }
        Update: {
          asin?: string
          bsr?: number | null
          category?: string | null
          competition_score?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          marketplace?: string
          monthly_sales_est?: number | null
          opportunity_score?: number | null
          price?: number | null
          refreshed_at?: string
          title?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          count: number
          counter_key: string
          created_at: string
          id: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          counter_key: string
          created_at?: string
          id?: string
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          counter_key?: string
          created_at?: string
          id?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_products_for_refresh: {
        Args: { p_batch_size?: number }
        Returns: {
          asin: string
          id: string
          marketplace: Database["public"]["Enums"]["marketplace"]
        }[]
      }
      find_similar_products: {
        Args: {
          p_match_count?: number
          p_min_similarity?: number
          p_product_id: string
        }
        Returns: {
          asin: string
          bsr: number
          id: string
          opportunity_score: number
          price: number
          rating: number
          similarity: number
          title: string
        }[]
      }
      get_category_ancestors: {
        Args: { p_id: string }
        Returns: {
          depth: number
          full_path: string
          id: string
          name: string
        }[]
      }
      get_category_children: {
        Args: { p_id: string }
        Returns: {
          depth: number
          full_path: string
          id: string
          is_leaf: boolean
          name: string
          opportunity_score: number
          product_count_est: number
        }[]
      }
      get_category_subtree: {
        Args: { p_id: string; p_max_depth?: number }
        Returns: {
          depth: number
          full_path: string
          id: string
          is_leaf: boolean
          name: string
          parent_id: string
        }[]
      }
      get_dashboard_stats: { Args: { p_user_id: string }; Returns: Json }
      get_onboarding_status: { Args: { p_user_id: string }; Returns: Json }
      get_search_suggestions: {
        Args: { p_limit?: number; p_prefix: string; p_user_id: string }
        Returns: {
          count: number
          query: string
        }[]
      }
      get_usage_count: {
        Args: { p_key: string; p_period?: string; p_user_id: string }
        Returns: number
      }
      get_user_plan_status: { Args: { p_user_id: string }; Returns: Json }
      handle_stripe_plan_update: {
        Args: {
          p_expires_at: string
          p_new_plan: Database["public"]["Enums"]["plan_type"]
          p_stripe_customer_id: string
          p_subscription_id: string
        }
        Returns: undefined
      }
      increment_usage_counter: {
        Args: { p_key: string; p_period?: string; p_user_id: string }
        Returns: number
      }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      match_categories_semantic: {
        Args: {
          p_marketplace?: Database["public"]["Enums"]["marketplace"]
          p_match_count?: number
          p_min_similarity?: number
          query_embedding: string
        }
        Returns: {
          depth: number
          full_path: string
          id: string
          is_leaf: boolean
          name: string
          opportunity_score: number
          referral_fee_pct: number
          similarity: number
        }[]
      }
      match_products_semantic: {
        Args: {
          p_category_id?: string
          p_marketplace?: Database["public"]["Enums"]["marketplace"]
          p_match_count?: number
          p_min_similarity?: number
          query_embedding: string
        }
        Returns: {
          asin: string
          brand: string
          bsr: number
          id: string
          marketplace: Database["public"]["Enums"]["marketplace"]
          opportunity_score: number
          price: number
          rating: number
          similarity: number
          title: string
        }[]
      }
      match_suppliers_for_product: {
        Args: {
          p_match_count?: number
          p_min_score?: number
          p_product_id: string
        }
        Returns: {
          match_score: number
          moq: number
          price_max: number
          price_min: number
          similarity: number
          supplier_id: string
          supplier_name: string
          supplier_product_id: string
          title: string
        }[]
      }
      search_categories: {
        Args: {
          p_limit?: number
          p_marketplace?: Database["public"]["Enums"]["marketplace"]
          p_query: string
        }
        Returns: {
          depth: number
          full_path: string
          id: string
          is_leaf: boolean
          name: string
          opportunity_score: number
          rank: number
          referral_fee_pct: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify: { Args: { v: string }; Returns: string }
      text2ltree: { Args: { "": string }; Returns: unknown }
      to_ltree_label: { Args: { v: string }; Returns: string }
      upsert_category: {
        Args: {
          p_breadcrumb: string[]
          p_depth: number
          p_full_path: string
          p_id: string
          p_is_leaf: boolean
          p_marketplace?: Database["public"]["Enums"]["marketplace"]
          p_name: string
          p_parent_id: string
        }
        Returns: undefined
      }
      upsert_category_from_path: {
        Args: {
          p_depth?: number
          p_full_path: string
          p_marketplace?: Database["public"]["Enums"]["marketplace"]
          p_name: string
          p_parent_path?: string
        }
        Returns: string
      }
      upsert_embeddings_batch: { Args: { p_records: Json }; Returns: number }
    }
    Enums: {
      competition_level: "low" | "medium" | "high" | "very_high"
      job_status:
      | "pending"
      | "queued"
      | "processing"
      | "complete"
      | "failed"
      | "cancelled"
      marketplace:
      | "US"
      | "CA"
      | "MX"
      | "BR"
      | "UK"
      | "DE"
      | "FR"
      | "IT"
      | "ES"
      | "NL"
      | "SE"
      | "PL"
      | "TR"
      | "AE"
      | "SA"
      | "IN"
      | "JP"
      | "AU"
      | "SG"
      match_method: "semantic" | "keyword" | "manual" | "sp_api"
      notification_type:
      | "price_drop"
      | "bsr_spike"
      | "bsr_drop"
      | "analysis_complete"
      | "plan_limit"
      | "system"
      | "opportunity"
      | "supplier_match"
      onboarding_step:
      | "marketplace"
      | "niche"
      | "business_model"
      | "goals"
      | "first_search"
      | "save_product"
      | "run_calculator"
      | "complete"
      opportunity_type:
      | "pain_gap"
      | "price_gap"
      | "review_gap"
      | "bsr_trend"
      | "niche_entry"
      | "seasonal"
      plan_type: "free" | "starter" | "pro" | "agency"
      search_type: "keyword" | "asin" | "category" | "brand" | "supplier"
      shipping_method: "air" | "sea" | "express" | "lcl"
      warning_severity: "info" | "warning" | "critical"
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
    Enums: {
      competition_level: ["low", "medium", "high", "very_high"],
      job_status: [
        "pending",
        "queued",
        "processing",
        "complete",
        "failed",
        "cancelled",
      ],
      marketplace: [
        "US",
        "CA",
        "MX",
        "BR",
        "UK",
        "DE",
        "FR",
        "IT",
        "ES",
        "NL",
        "SE",
        "PL",
        "TR",
        "AE",
        "SA",
        "IN",
        "JP",
        "AU",
        "SG",
      ],
      match_method: ["semantic", "keyword", "manual", "sp_api"],
      notification_type: [
        "price_drop",
        "bsr_spike",
        "bsr_drop",
        "analysis_complete",
        "plan_limit",
        "system",
        "opportunity",
        "supplier_match",
      ],
      onboarding_step: [
        "marketplace",
        "niche",
        "business_model",
        "goals",
        "first_search",
        "save_product",
        "run_calculator",
        "complete",
      ],
      opportunity_type: [
        "pain_gap",
        "price_gap",
        "review_gap",
        "bsr_trend",
        "niche_entry",
        "seasonal",
      ],
      plan_type: ["free", "starter", "pro", "agency"],
      search_type: ["keyword", "asin", "category", "brand", "supplier"],
      shipping_method: ["air", "sea", "express", "lcl"],
      warning_severity: ["info", "warning", "critical"],
    },
  },
} as const
