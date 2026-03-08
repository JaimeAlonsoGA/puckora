/**
 * Hard-typed I/O contracts for every Apify actor used by puckora.
 * Names match the actorId used in apify/client.ts.
 *
 * Actors:
 *  - axesso_data/amazon-reviews-scraper
 *  - axesso_data/amazon-product-details-scraper
 *  - axesso_data/amazon-search-scraper
 *  - piotrv1001/alibaba-listings-scraper
 *  - shareze001/scrape-alibaba-suppliers-and-detail
 *  - junglee/amazon-bestsellers
 *  - devcake/1688-com-products-scraper
 *  - devcake/alibaba-supplier-scraper
 *  - happitap/alibaba-product-scraper
 *  - devcake/globalsources-supplier-scraper
 *  - devcake/globalsources-products-scraper
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------
export interface ApifyProxyConfig {
    useApifyProxy: boolean
    apifyProxyGroups?: string[]
}

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
// piotrv1001/alibaba-listings-scraper
// ---------------------------------------------------------------------------
export interface AlibabaListingsInput {
    search?: string
    limit?: number
}

export interface AlibabaListingOutput {
    title: string
    price: string
    promotionPrice: string
    discount: string | null
    moq: string
    companyName: string
    countryCode: string
    productUrl: string
    mainImage: string
    reviewScore: string
    reviewCount: number
    deliveryEstimate: string
}

// ---------------------------------------------------------------------------
// shareze001/scrape-alibaba-suppliers-and-detail
// ---------------------------------------------------------------------------
export interface AlibabaSupplierDetailInput {
    size: number
    keyword?: string
    searchUrl?: string
    supplier_urls?: { url: string }[]
    scrape_detail?: boolean
}

export interface AlibabaSupplierCertificate {
    certType: string
    certificateValidityPeriod: string
    certificateNo: string
    certificateName: string
    certificatePhotos: string[]
    description: string
    certIntroduction: string
    certLogo: string
}

export interface AlibabaSupplierMainProduct {
    id: string
    subject: string
    price: string
    imageUrl: string
    url: string
}

export interface AlibabaSupplierDetailOutput {
    area: string
    companyId: string
    companyName: string
    url: string
    companyIcon: string
    companyImage: string[]
    goldYears: number
    mainProduct: AlibabaSupplierMainProduct | null
    productList: AlibabaSupplierMainProduct[]
    provideProducts: string
    replyAvgTime: string
    reviewCount: number
    reviewScore: number
    staff: string
    capabilities: string[]
    transactions: number
    vrUrl: string | null
    isAssessedSupplier: boolean
    newAd: null
    certificates?: AlibabaSupplierCertificate[]
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

// ---------------------------------------------------------------------------
// devcake/1688-com-products-scraper
// ---------------------------------------------------------------------------
export interface Scraper1688Input {
    queries: string[]
    maxProducts?: number
    sortType?: 'normal' | 'va_rmdarkgmv30' | 'va_price_asc' | 'va_price_desc'
    proxy?: ApifyProxyConfig
}

export interface Scraper1688QuantityPrice {
    quantity: string
    price: string
    price_usd: string
}

export interface Scraper1688Output {
    offer_id: string
    title: string
    price: string
    price_integer: string
    price_decimal: string
    image_url: string
    shop_name: string
    member_id: string
    province: string
    city: string
    order_count: string
    repurchase_rate: string
    detail_url: string
    quantity_prices: Scraper1688QuantityPrice[]
    service_tags: string[]
    product_specs: string[]
    product_badges: string[]
}

// ---------------------------------------------------------------------------
// devcake/alibaba-supplier-scraper
// ---------------------------------------------------------------------------
export interface AlibabaSupplierScraperInput {
    queries: string[]
    max_pages?: number
}

export interface AlibabaSupplierScraperOutput {
    search_query: string
    company_id: number
    name: string
    country: string
    country_code: string
    years_as_gold_supplier: number
    company_icon: string
    profile_url: string
    total_employees: string | null
    factory_size: string | null
    annual_revenue: string | null
    response_rate: string | null
    is_assessed_supplier: boolean
    is_verified_supplier_pro: boolean
    products_offered: string | null
    review_count: number
    review_score: number
    service_tags: string[]
}

// ---------------------------------------------------------------------------
// happitap/alibaba-product-scraper
// ---------------------------------------------------------------------------
export interface AlibabaProductScraperInput {
    startUrls?: string[]
    searchQueries?: string[]
    maxProductsPerQuery?: number
    maxConcurrency?: number
    proxyConfig?: ApifyProxyConfig
    minPrice?: number | null
    maxPrice?: number | null
    minOrderQuantity?: number | null
    maxOrderQuantity?: number | null
    tradeAssurance?: boolean
    verifiedSuppliers?: boolean
    timeoutSecs?: number
    debugLog?: boolean
}

export interface AlibabaProductSupplier {
    name: string
    isVerified: boolean
    hasTradeAssurance: boolean
    yearsInBusiness: string
}

export interface AlibabaProductPrice {
    min: number
    max: number
    currency: string
}

export interface AlibabaProductOutput {
    title: string
    price: AlibabaProductPrice
    minOrderQuantity: number
    supplier: AlibabaProductSupplier
    specifications: Record<string, string>
    images: string[]
    rating: number | null
    reviewCount: number | null
    certifications: string[]
    productUrl?: string
}

// ---------------------------------------------------------------------------
// devcake/globalsources-supplier-scraper
// ---------------------------------------------------------------------------
export interface GlobalSourcesSupplierInput {
    searchKeywords: string[]
    businessTypes?: string[] | null
    supplierLocations?: string[] | null
    verifiedManufacturerOnly?: boolean
    minMoq?: number
    minVerificationLevel?: number
    fobPriceMin?: number
    fobPriceMax?: number
    minYearsOnPlatform?: number
    maxSuppliers?: number
    proxyConfiguration?: ApifyProxyConfig
}

export interface GlobalSourcesSupplierVerification {
    level: number
    years_on_platform: string
    is_verified_manufacturer: boolean
    is_verified_supplier: boolean
    is_assessed_company: boolean
}

export interface GlobalSourcesSupplierProduct {
    product_id: string
    name: string
    price: string
    moq: string
    lead_time: number
    fob_port: string
}

export interface GlobalSourcesSupplierOutput {
    supplier_id: string
    company_name: string
    location: string
    verification: GlobalSourcesSupplierVerification
    business_info: {
        types: string[]
        usp: string
    }
    certifications: {
        company: string[]
        product: string
    }
    sample_products: GlobalSourcesSupplierProduct[]
    profile_url: string
    vr_showroom: {
        available: boolean
        url: string | null
    }
    extracted_at: number
    search_keywords_used: string[]
}

// ---------------------------------------------------------------------------
// devcake/globalsources-products-scraper
// ---------------------------------------------------------------------------
export interface GlobalSourcesProductsInput {
    keywords: string[]
    businessTypes?: string[] | null
    supplierLocations?: string[] | null
    verifiedManufacturerOnly?: boolean
    minMoq?: number
    maxLeadTime?: number
    minVerificationLevel?: number
    fobPriceMin?: number
    fobPriceMax?: number
    maxPagesPerKeyword?: number
    proxyConfiguration?: ApifyProxyConfig
}

export interface GlobalSourcesProductOutput {
    product_id: string
    product_name: string
    product_url: string
    image_url: string | null
    price: string
    price_currency: string | null
    min_order: string
    min_order_quantity: number | null
    min_order_unit: string | null
    lead_time_days: number | null
    fob_port: string | null
    model_number: string | null
    category_id: number | null
    category_name: string | null
    supplier_name: string
    supplier_location: string
    supplier_id: string | null
    supplier_level: number | null
    supplier_years_on_platform: string | null
    supplier_business_types: string[]
    supplier_company_certs: string | null
    supplier_usp: string | null
    is_verified_manufacturer: boolean
    is_verified_supplier: boolean
    is_assessed_company: boolean
    has_video: boolean
    is_direct_order: boolean
    is_new_product: boolean
    is_advertised: boolean
    product_certs: string[]
    trade_show_info: string | null
    extracted_at: number
}

// ---------------------------------------------------------------------------
// Actor ID map — single source of truth for actor IDs
// ---------------------------------------------------------------------------
export const APIFY_ACTOR_ID = {
    amazonReviews: 'axesso_data/amazon-reviews-scraper',
    amazonProductDetails: 'axesso_data/amazon-product-details-scraper',
    amazonSearch: 'axesso_data/amazon-search-scraper',
    amazonBestsellers: 'junglee/amazon-bestsellers',
    alibabaListings: 'piotrv1001/alibaba-listings-scraper',
    alibabaSupplierDetail: 'shareze001/scrape-alibaba-suppliers-and-detail',
    alibabaSupplierScraper: 'devcake/alibaba-supplier-scraper',
    alibabaProductScraper: 'happitap/alibaba-product-scraper',
    scraper1688: 'devcake/1688-com-products-scraper',
    globalSourcesSuppliers: 'devcake/globalsources-supplier-scraper',
    globalSourcesProducts: 'devcake/globalsources-products-scraper',
} as const

export type ApifyActorId = (typeof APIFY_ACTOR_ID)[keyof typeof APIFY_ACTOR_ID]
