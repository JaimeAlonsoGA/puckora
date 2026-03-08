// GENERATED — Do not hand-edit. Run `npm run gen:types` to regenerate.

import type { Database } from './database.types'
export type { Database }
export type { Json } from './database.types'
export * from './meta.types'

// Generic type helpers
type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]
export type { Tables, TablesInsert, TablesUpdate, Enums }

// Tables
export type AmazonCategory = Tables<"amazon_categories">
export type AmazonCategoryInsert = TablesInsert<"amazon_categories">
export type AmazonCategoryUpdate = TablesUpdate<"amazon_categories">

export type AmazonProduct = Tables<"amazon_products">
export type AmazonProductInsert = TablesInsert<"amazon_products">
export type AmazonProductUpdate = TablesUpdate<"amazon_products">

export type ProductCategoryRank = Tables<"product_category_ranks">
export type ProductCategoryRankInsert = TablesInsert<"product_category_ranks">
export type ProductCategoryRankUpdate = TablesUpdate<"product_category_ranks">
