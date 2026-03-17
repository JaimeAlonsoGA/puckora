/**
 * Supplier actor I/O types for:
 *  - piotrv1001/alibaba-listings-scraper
 *  - shareze001/scrape-alibaba-suppliers-and-detail
 *  - devcake/alibaba-supplier-scraper
 *  - happitap/alibaba-product-scraper
 *  - devcake/1688-com-products-scraper
 *  - devcake/globalsources-supplier-scraper
 *  - devcake/globalsources-products-scraper
 */
import type { ApifyProxyConfig } from './shared'

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
