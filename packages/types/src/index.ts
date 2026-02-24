import type { Database } from './database.types'

export * from './alibaba'
export * from './amazon'
export * from './calculator'
export * from './categories'
export * from './competitor'
export * from './definitions'
export * from './referral'
export * from './sp-api'
export * from './plan'

// Generic type helpers
type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]

// Tables
export type AffiliateProfileRow = Tables<"affiliate_profiles">
export type AffiliateProfileInsert = TablesInsert<"affiliate_profiles">
export type AffiliateProfileUpdate = TablesUpdate<"affiliate_profiles">

export type AmazonCategory = Tables<"amazon_categories">
export type AmazonCategoryInsert = TablesInsert<"amazon_categories">
export type AmazonCategoryUpdate = TablesUpdate<"amazon_categories">

export type CalculationTemplate = Tables<"calculation_templates">
export type CalculationTemplateInsert = TablesInsert<"calculation_templates">
export type CalculationTemplateUpdate = TablesUpdate<"calculation_templates">

export type CategoryEmbedding = Tables<"category_embeddings">
export type CategoryEmbeddingInsert = TablesInsert<"category_embeddings">
export type CategoryEmbeddingUpdate = TablesUpdate<"category_embeddings">

export type CategoryFbaFee = Tables<"category_fba_fees">
export type CategoryFbaFeeInsert = TablesInsert<"category_fba_fees">
export type CategoryFbaFeeUpdate = TablesUpdate<"category_fba_fees">

export type Collection = Tables<"collections">
export type CollectionInsert = TablesInsert<"collections">
export type CollectionUpdate = TablesUpdate<"collections">

export type CompetitorAnalyse = Tables<"competitor_analyses">
export type CompetitorAnalyseInsert = TablesInsert<"competitor_analyses">
export type CompetitorAnalyseUpdate = TablesUpdate<"competitor_analyses">

export type CostCalculation = Tables<"cost_calculations">
export type CostCalculationInsert = TablesInsert<"cost_calculations">
export type CostCalculationUpdate = TablesUpdate<"cost_calculations">

export type FbaFeeCache = Tables<"fba_fees_cache">
export type FbaFeeCacheInsert = TablesInsert<"fba_fees_cache">
export type FbaFeeCacheUpdate = TablesUpdate<"fba_fees_cache">

export type MarketOpportunity = Tables<"market_opportunities">
export type MarketOpportunityInsert = TablesInsert<"market_opportunities">
export type MarketOpportunityUpdate = TablesUpdate<"market_opportunities">

export type NotificationPreference = Tables<"notification_preferences">
export type NotificationPreferenceInsert = TablesInsert<"notification_preferences">
export type NotificationPreferenceUpdate = TablesUpdate<"notification_preferences">

export type Notification = Tables<"notifications">
export type NotificationInsert = TablesInsert<"notifications">
export type NotificationUpdate = TablesUpdate<"notifications">

export type OnboardingStep = Tables<"onboarding_steps">
export type OnboardingStepInsert = TablesInsert<"onboarding_steps">
export type OnboardingStepUpdate = TablesUpdate<"onboarding_steps">

export type OpportunityReport = Tables<"opportunity_reports">
export type OpportunityReportInsert = TablesInsert<"opportunity_reports">
export type OpportunityReportUpdate = TablesUpdate<"opportunity_reports">

export type PainPointCluster = Tables<"pain_point_clusters">
export type PainPointClusterInsert = TablesInsert<"pain_point_clusters">
export type PainPointClusterUpdate = TablesUpdate<"pain_point_clusters">

export type ProductDetail = Tables<"product_details">
export type ProductDetailInsert = TablesInsert<"product_details">
export type ProductDetailUpdate = TablesUpdate<"product_details">

export type ProductEmbedding = Tables<"product_embeddings">
export type ProductEmbeddingInsert = TablesInsert<"product_embeddings">
export type ProductEmbeddingUpdate = TablesUpdate<"product_embeddings">

export type ProductHistory = Tables<"product_history">
export type ProductHistoryInsert = TablesInsert<"product_history">
export type ProductHistoryUpdate = TablesUpdate<"product_history">

export type ProductHistory2025 = Tables<"product_history_2025">
export type ProductHistory2025Insert = TablesInsert<"product_history_2025">
export type ProductHistory2025Update = TablesUpdate<"product_history_2025">

export type ProductHistory2026 = Tables<"product_history_2026">
export type ProductHistory2026Insert = TablesInsert<"product_history_2026">
export type ProductHistory2026Update = TablesUpdate<"product_history_2026">

export type ProductHistory2027 = Tables<"product_history_2027">
export type ProductHistory2027Insert = TablesInsert<"product_history_2027">
export type ProductHistory2027Update = TablesUpdate<"product_history_2027">

export type ProductHistoryFuture = Tables<"product_history_future">
export type ProductHistoryFutureInsert = TablesInsert<"product_history_future">
export type ProductHistoryFutureUpdate = TablesUpdate<"product_history_future">

export type ProductSupplierMatche = Tables<"product_supplier_matches">
export type ProductSupplierMatcheInsert = TablesInsert<"product_supplier_matches">
export type ProductSupplierMatcheUpdate = TablesUpdate<"product_supplier_matches">

export type Product = Tables<"products">
export type ProductInsert = TablesInsert<"products">
export type ProductUpdate = TablesUpdate<"products">

export type Profile = Tables<"profiles">
export type ProfileInsert = TablesInsert<"profiles">
export type ProfileUpdate = TablesUpdate<"profiles">

export type ReferralCodeRow = Tables<"referral_codes">
export type ReferralCodeInsert = TablesInsert<"referral_codes">
export type ReferralCodeUpdate = TablesUpdate<"referral_codes">

export type ReferralEventRow = Tables<"referral_events">
export type ReferralEventInsert = TablesInsert<"referral_events">
export type ReferralEventUpdate = TablesUpdate<"referral_events">

export type ReviewEmbedding = Tables<"review_embeddings">
export type ReviewEmbeddingInsert = TablesInsert<"review_embeddings">
export type ReviewEmbeddingUpdate = TablesUpdate<"review_embeddings">

export type SavedSupplier = Tables<"saved_suppliers">
export type SavedSupplierInsert = TablesInsert<"saved_suppliers">
export type SavedSupplierUpdate = TablesUpdate<"saved_suppliers">

export type SearchHistory = Tables<"search_history">
export type SearchHistoryInsert = TablesInsert<"search_history">
export type SearchHistoryUpdate = TablesUpdate<"search_history">

export type SupplierEmbedding = Tables<"supplier_embeddings">
export type SupplierEmbeddingInsert = TablesInsert<"supplier_embeddings">
export type SupplierEmbeddingUpdate = TablesUpdate<"supplier_embeddings">

export type SupplierInquiry = Tables<"supplier_inquiries">
export type SupplierInquiryInsert = TablesInsert<"supplier_inquiries">
export type SupplierInquiryUpdate = TablesUpdate<"supplier_inquiries">

export type SupplierProduct = Tables<"supplier_products">
export type SupplierProductInsert = TablesInsert<"supplier_products">
export type SupplierProductUpdate = TablesUpdate<"supplier_products">

export type Supplier = Tables<"suppliers">
export type SupplierInsert = TablesInsert<"suppliers">
export type SupplierUpdate = TablesUpdate<"suppliers">

export type TrackedKeyword = Tables<"tracked_keywords">
export type TrackedKeywordInsert = TablesInsert<"tracked_keywords">
export type TrackedKeywordUpdate = TablesUpdate<"tracked_keywords">

export type TrackedProduct = Tables<"tracked_products">
export type TrackedProductInsert = TablesInsert<"tracked_products">
export type TrackedProductUpdate = TablesUpdate<"tracked_products">

export type TrendSignal = Tables<"trend_signals">
export type TrendSignalInsert = TablesInsert<"trend_signals">
export type TrendSignalUpdate = TablesUpdate<"trend_signals">

export type TrendingProduct = Tables<"trending_products">
export type TrendingProductInsert = TablesInsert<"trending_products">
export type TrendingProductUpdate = TablesUpdate<"trending_products">

export type UsageCounter = Tables<"usage_counters">
export type UsageCounterInsert = TablesInsert<"usage_counters">
export type UsageCounterUpdate = TablesUpdate<"usage_counters">

export type Workspace = Tables<"workspaces">
export type WorkspaceInsert = TablesInsert<"workspaces">
export type WorkspaceUpdate = TablesUpdate<"workspaces">

// Enums
export type CompetitionLevel = Enums<"competition_level">
export type MatchMethod = Enums<"match_method">
export type PlanType = Enums<"plan_type">
export type SearchType = Enums<"search_type">
export type ShippingMethod = Enums<"shipping_method">
export type WarningSeverity = Enums<"warning_severity">
