export interface ApiSuccess<T> {
    data: T
    error: null
}

export interface ApiError {
    data: null
    error: {
        message: string
        code?: string
        status?: number
    }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface PaginatedResponse<T> {
    items: T[]
    total: number
    page: number
    pageSize: number
    hasMore: boolean
}

export interface SaveProductInput {
    asin: string
    title: string
    imageUrl?: string
    category?: string
    currentPrice?: number
    currentBsr?: number
    currentRating?: number
    currentReviewCount?: number
    monthlySalesEstimate?: number
    monthlyRevenueEstimate?: number
    competitionScore?: number
    opportunityScore?: number
    notes?: string
    tags?: string[]
}
