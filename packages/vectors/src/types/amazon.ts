import type { VectorSourceDocument } from './core'

export type AmazonDocumentKind = 'product' | 'keyword' | 'category'

export interface AmazonProductSourceRow {
    asin: string
    title: string | null
    brand: string | null
    product_type: string | null
    bullet_points: string[] | null
    price: number | null
    category_path: string | null
    updated_at: string
}

export interface AmazonKeywordSourceRow {
    id: string
    keyword: string
    marketplace: string
    last_searched_at: string
}

export interface AmazonCategorySourceRow {
    id: string
    name: string
    breadcrumb: string[] | null
    marketplace: string
    source_updated_at: string
}

export interface AmazonVectorSearchRow {
    asin: string
    title: string | null
    brand: string | null
    product_type: string | null
    category_path: string | null
    source_updated_at: string
    score: number
}

export interface AmazonProductVectorDocument extends VectorSourceDocument {
    documentKind: 'product'
}

export interface AmazonKeywordVectorDocument extends VectorSourceDocument {
    documentKind: 'keyword'
}

export interface AmazonCategoryVectorDocument extends VectorSourceDocument {
    documentKind: 'category'
}