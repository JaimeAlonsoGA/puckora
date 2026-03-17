/**
 * Amazon actor I/O types for:
 *  - axesso_data/amazon-reviews-scraper
 *  - axesso_data/amazon-product-details-scraper
 *  - axesso_data/amazon-search-scraper
 *  - junglee/amazon-bestsellers
 */

// ---------------------------------------------------------------------------
// axesso_data/amazon-reviews-scraper
// ---------------------------------------------------------------------------
export interface AmazonReviewsInput {
    asin: string
    domainCode: string
    sortBy?: 'recent' | 'helpful'
    maxPages?: number
    filterByStar?: 'one_star' | 'two_star' | 'three_star' | 'four_star' | 'five_star' | 'positive' | 'critical'
    filterByKeyword?: string
    reviewerType?: 'all_reviews' | 'verified_reviews'
    formatType?: 'current_format' | 'all_formats'
    mediaType?: 'all_contents' | 'media_reviews_only'
}

export interface AmazonReviewSummary {
    fiveStar: { percentage: number }
    fourStar: { percentage: number }
    threeStar: { percentage: number }
    twoStar: { percentage: number }
    oneStar: { percentage: number }
}

export interface AmazonReviewOutput {
    statusCode: number
    statusMessage: string
    asin: string
    productTitle: string
    currentPage: number
    sortStrategy: string
    countReviews: number
    domainCode: string
    filters: Record<string, string>
    countRatings: number
    productRating: string
    reviewSummary: AmazonReviewSummary
    reviewId: string
    text: string
    date: string
    rating: string
    title: string
    userName: string
    numberOfHelpful: number
    variationId: string | null
    imageUrlList: string[] | null
    variationList: string[]
    locale: string | null
    verified: boolean
    vine: boolean
    videoUrlList: string[]
    profilePath: string
}

// ---------------------------------------------------------------------------
// axesso_data/amazon-product-details-scraper
// ---------------------------------------------------------------------------
export interface AmazonProductDetailsInput {
    urls: string[]
}

export interface AmazonProductDetail {
    name: string
    value: string
}

export interface AmazonProductVariationValue {
    value: string
    dpUrl: string
    selected: boolean
    available: boolean
    price: number
    imageUrl: string | null
    asin: string
}

export interface AmazonProductVariation {
    variationName: string
    values: AmazonProductVariationValue[]
}

export interface AmazonProductCategory {
    name: string
    url: string
    node: string
}

export interface AmazonReviewItem {
    text: string
    date: string
    rating: string
    title: string
    userName: string
    url: string
    imageUrlList: string[]
    variationList: string[]
    reviewId: string
    locale: { language: string; country: string; marketplaceId: string } | null
}

export interface AmazonReviewInsightSnippet {
    text: string
    uri: string
}

export interface AmazonReviewInsightAspect {
    name: string
    featureMentionCount: number
    featureMentionPositiveCount: number
    featureMentionNegativeCount: number
    keyFacts: string
    summary: string
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'MIXED'
    reviewSnippets: AmazonReviewInsightSnippet[]
}

export interface AmazonProductDetailsOutput {
    statusCode: number
    statusMessage: string
    url: string
    title: string
    manufacturer: string | null
    countReview: number
    productRating: string
    asin: string
    soldBy: string | null
    fulfilledBy: string | null
    sellerId: string | null
    warehouseAvailability: string | null
    retailPrice: number | null
    price: number | null
    priceRange: string | null
    shippingPrice: number | null
    priceShippingInformation: string | null
    priceSaving: string | null
    features: string[]
    imageUrlList: string[]
    videoeUrlList: string[]
    productDescription: string | null
    productDetails: AmazonProductDetail[]
    minimalQuantity: string | null
    reviews: AmazonReviewItem[]
    productSpecification: AmazonProductDetail[]
    mainImage: { imageUrl: string; imageResolution: string } | null
    variations: AmazonProductVariation[]
    bookVariations: AmazonProductVariation[]
    categoriesExtended: AmazonProductCategory[]
    deliveryMessage: string | null
    importantInformation: string[]
    buyBoxUsed: {
        condition: string
        packageCondition: string | null
        soldBy: string | null
        fulfilledBy: string | null
        sellerId: string | null
        warehouseAvailability: string | null
        retailPrice: number | null
        price: number | null
        priceShippingInformation: string | null
        priceSaving: string | null
    } | null
    aboutProduct: AmazonProductDetail[]
    globalReviews: AmazonReviewItem[]
    deal: boolean
    prime: boolean
    used: boolean
    pastSales: string | null
    reviewInsights: {
        summary: string
        banner: string
        featureAspects: AmazonReviewInsightAspect[]
    } | null
}

// ---------------------------------------------------------------------------
// axesso_data/amazon-search-scraper
// ---------------------------------------------------------------------------
export interface AmazonSearchInput {
    input: AmazonSearchEntry[]
}

export interface AmazonSearchEntry {
    keyword: string
    domainCode: string
    sortBy?: string
    maxPages?: number
    category?: string
}

export interface AmazonSearchOutput {
    statusCode: number
    statusMessage: string
    keyword: string
    domainCode: string
    page: number
    selectedCategory: string | null
    browseNode: string | null
    nodeHierarchy: string | null
    resultCount: number
    categories: string[]
    similarKeywords: { keyword: string; url: string }[]
    currentPage: number
    sortStrategy: string
    productDescription: string
    asin: string
    countReview: number
    imgUrl: string
    price: number | null
    retailPrice: number | null
    productRating: string
    prime: boolean
    dpUrl: string
    series: string | null
    deliveryMessage: string | null
    variations: AmazonProductVariation[]
    productDetails: AmazonProductDetail[]
    salesVolume: string | null
    manufacturer: string | null
    secondaryOffer: number | null
    sponsored: boolean
    searchResultPosition: number
}

// ---------------------------------------------------------------------------
// junglee/amazon-bestsellers
// ---------------------------------------------------------------------------
export interface AmazonBestsellersInput {
    categoryUrls: string[]
    maxItemsPerStartUrl?: number
    depthOfCrawl?: number
    language?: string | null
    detailedInformation?: boolean
    useCaptchaSolver?: boolean
}

export interface AmazonBestsellerOutput {
    position: number
    category: string
    categoryUrl: string
    name: string
    price: number | null
    currency: string
    numberOfOffers: number
    url: string
    thumbnail: string
    asin?: string
    rating?: number
    reviewCount?: number
    brand?: string
}
