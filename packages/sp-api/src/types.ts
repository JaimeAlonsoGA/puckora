/**
 * @puckora/sp-api — unified type definitions
 *
 * Two categories of types are combined here:
 *
 *  A. Raw API shapes (request params, raw API response objects) — suitable for
 *     low-level access and future extensions.
 *
 *  B. Parsed / normalised shapes (CatalogItemResult, ParsedFeeEstimate) — these
 *     are what the scraper's enrichment pipeline and DB upserts consume; they have
 *     all data extracted, converted to metric units, and normalised to a flat shape.
 *
 * Consumers should import from '@puckora/sp-api' (the package root), not from
 * this file directly.
 */

// ---------------------------------------------------------------------------
// Marketplace mapping
// ---------------------------------------------------------------------------

export type SpApiMarketplace =
    | 'ATVPDKIKX0DER'  // US
    | 'A2EUQ1WTGCTBG2'  // CA
    | 'A1AM78C64UM0Y8'  // MX
    | 'A2VIGQ35RCS4UG'  // AE
    | 'A1PA6795UKMFR9'  // DE
    | 'A1RKKUPIHCS9HS'  // ES
    | 'A13V1IB3VIYZZH'  // FR
    | 'A21TJRUUN4KGV'   // IN
    | 'APJ6JRA9NG5V4'   // IT
    | 'A1805IZSGTT6HS'  // NL
    | 'A1C3SOZRARQ6R3'  // PL
    | 'A2NODRKZP88ZB9'  // SE
    | 'A33AVAJ2PDY3EV'  // TR
    | 'A17E79C6D8DWNP'  // SA
    | 'A19VAU5U5O7RUS'  // SG
    | 'A39IBJ37TRP1C6'  // AU
    | 'A1VC38T7YXB528'  // JP
    | 'A2Q3Y263D00KWC'  // BR
    | 'A1F83G8C2ARO7P'  // UK

/** Map from puckora marketplace code to SP-API marketplace ID */
export const SP_API_MARKETPLACE_ID: Record<string, SpApiMarketplace> = {
    US: 'ATVPDKIKX0DER',
    CA: 'A2EUQ1WTGCTBG2',
    MX: 'A1AM78C64UM0Y8',
    AE: 'A2VIGQ35RCS4UG',
    DE: 'A1PA6795UKMFR9',
    ES: 'A1RKKUPIHCS9HS',
    FR: 'A13V1IB3VIYZZH',
    IN: 'A21TJRUUN4KGV',
    IT: 'APJ6JRA9NG5V4',
    NL: 'A1805IZSGTT6HS',
    PL: 'A1C3SOZRARQ6R3',
    SE: 'A2NODRKZP88ZB9',
    TR: 'A2NODRKZP88ZB9',
    SA: 'A17E79C6D8DWNP',
    SG: 'A19VAU5U5O7RUS',
    AU: 'A39IBJ37TRP1C6',
    JP: 'A1VC38T7YXB528',
    BR: 'A2Q3Y263D00KWC',
    UK: 'A1F83G8C2ARO7P',
}

/** Map SP-API marketplace ID to API region endpoint */
export const SP_API_REGION_ENDPOINT: Record<string, string> = {
    ATVPDKIKX0DER: 'https://sellingpartnerapi-na.amazon.com',
    A2EUQ1WTGCTBG2: 'https://sellingpartnerapi-na.amazon.com',
    A1AM78C64UM0Y8: 'https://sellingpartnerapi-na.amazon.com',
    A2Q3Y263D00KWC: 'https://sellingpartnerapi-na.amazon.com',
    A2VIGQ35RCS4UG: 'https://sellingpartnerapi-eu.amazon.com',
    A1PA6795UKMFR9: 'https://sellingpartnerapi-eu.amazon.com',
    A1RKKUPIHCS9HS: 'https://sellingpartnerapi-eu.amazon.com',
    A13V1IB3VIYZZH: 'https://sellingpartnerapi-eu.amazon.com',
    A21TJRUUN4KGV: 'https://sellingpartnerapi-eu.amazon.com',
    APJ6JRA9NG5V4: 'https://sellingpartnerapi-eu.amazon.com',
    A1805IZSGTT6HS: 'https://sellingpartnerapi-eu.amazon.com',
    A1C3SOZRARQ6R3: 'https://sellingpartnerapi-eu.amazon.com',
    A2NODRKZP88ZB9: 'https://sellingpartnerapi-eu.amazon.com',
    A33AVAJ2PDY3EV: 'https://sellingpartnerapi-eu.amazon.com',
    A17E79C6D8DWNP: 'https://sellingpartnerapi-eu.amazon.com',
    A1F83G8C2ARO7P: 'https://sellingpartnerapi-eu.amazon.com',
    A19VAU5U5O7RUS: 'https://sellingpartnerapi-fe.amazon.com',
    A39IBJ37TRP1C6: 'https://sellingpartnerapi-fe.amazon.com',
    A1VC38T7YXB528: 'https://sellingpartnerapi-fe.amazon.com',
}

// ---------------------------------------------------------------------------
// LWA (Login With Amazon) token — internal cache
// ---------------------------------------------------------------------------

export interface LwaTokenResponse {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
}

export interface LwaTokenCache {
    accessToken: string
    expiresAt: number  // ms since epoch
}

// ---------------------------------------------------------------------------
// SP-API error shapes
// ---------------------------------------------------------------------------

export interface SpApiErrorDetail {
    code: string
    message: string
    details?: string
}

export interface SpApiErrorResponse {
    errors: SpApiErrorDetail[]
}

// ---------------------------------------------------------------------------
// Raw dimension / image / rank primitives (internal to catalog parsing)
// ---------------------------------------------------------------------------

export interface SpApiDimension {
    unit: string  // 'inches' | 'pounds' | 'centimeters' | 'kilograms'
    value: number
}

export interface SpApiDimensions {
    height?: SpApiDimension
    length?: SpApiDimension
    width?: SpApiDimension
    weight?: SpApiDimension
}

export interface SpApiImage {
    variant: string  // 'MAIN' | 'PT01' | 'PT02' | ...
    link: string
    height: number
    width: number
}

export interface SpApiSalesRank {
    classificationId: string
    title: string
    link?: string
    rank: number
}

// ---------------------------------------------------------------------------
// searchCatalogItems — GET /catalog/2022-04-01/items
// ---------------------------------------------------------------------------

export type CatalogItemInclude =
    | 'attributes'
    | 'dimensions'
    | 'identifiers'
    | 'images'
    | 'productTypes'
    | 'relationships'
    | 'salesRanks'
    | 'summaries'
    | 'classifications'

export interface SearchCatalogItemsParams {
    marketplaceIds: string[]
    keywords?: string[]
    brandNames?: string[]
    classificationIds?: string[]
    pageSize?: number
    pageToken?: string
    keywordsLocale?: string
    locale?: string
    includedData?: CatalogItemInclude[]
    identifiers?: string[]
    identifiersType?: 'ASIN' | 'EAN' | 'GTIN' | 'ISBN' | 'JAN' | 'MINSAN' | 'SKU' | 'UPC'
}

export interface CatalogItemSummary {
    marketplaceId: string
    adultProduct?: boolean
    autographed?: boolean
    brand?: string
    browseClassification?: {
        displayName: string
        classificationId: string
    }
    color?: string
    contributors?: Array<{ name: string; role: string }>
    itemClassification?: string
    itemName?: string
    manufacturer?: string
    memorabilia?: boolean
    modelNumber?: string
    packageQuantity?: number
    partNumber?: string
    releaseDate?: string
    size?: string
    style?: string
    tradeInEligible?: boolean
    websiteDisplayGroup?: string
    websiteDisplayGroupName?: string
}

export interface CatalogItemIdentifier {
    marketplaceId: string
    identifiers: Array<{
        identifier: string
        identifierType: string
    }>
}

export interface CatalogItemImage {
    marketplaceId: string
    images: Array<{
        variant: string
        link: string
        height: number
        width: number
    }>
}

export interface CatalogItemSalesRank {
    marketplaceId: string
    classificationRanks?: Array<{
        classificationId: string
        title: string
        link: string
        rank: number
    }>
    displayGroupRanks?: Array<{
        websiteDisplayGroup: string
        title: string
        link: string
        rank: number
    }>
}

export interface CatalogItemDimension {
    marketplaceId: string
    package?: {
        height?: { unit: string; value: number }
        length?: { unit: string; value: number }
        weight?: { unit: string; value: number }
        width?: { unit: string; value: number }
    }
    item?: {
        height?: { unit: string; value: number }
        length?: { unit: string; value: number }
        weight?: { unit: string; value: number }
        width?: { unit: string; value: number }
    }
}

/** Raw SP-API CatalogItem response shape. */
export interface CatalogItem {
    asin: string
    attributes?: Record<string, unknown>
    dimensions?: CatalogItemDimension[]
    identifiers?: CatalogItemIdentifier[]
    images?: CatalogItemImage[]
    productTypes?: Array<{ marketplaceId: string; productType: string }>
    relationships?: Array<{ marketplaceId?: string; type?: string; identifiers?: unknown[] }>
    salesRanks?: CatalogItemSalesRank[]
    summaries?: CatalogItemSummary[]
    classifications?: Array<{ marketplaceId: string; classifications: unknown[] }>
}

export interface SearchCatalogItemsResponse {
    numberOfResults: number
    pagination?: {
        nextToken?: string
        previousToken?: string
    }
    refinements?: {
        brands?: Array<{ numberOfResults: number; brandName: string }>
        classifications?: Array<{ numberOfResults: number; displayName: string; classificationId: string }>
    }
    items: CatalogItem[]
}

export interface GetCatalogItemParams {
    asin: string
    marketplaceIds: string[]
    includedData?: CatalogItemInclude[]
    locale?: string
}

// ---------------------------------------------------------------------------
// getItemOffers — GET /products/pricing/v0/items/{asin}/offers
// ---------------------------------------------------------------------------

export interface GetItemOffersParams {
    asin: string
    marketplaceId: string
    itemCondition: 'New' | 'Used' | 'Collectible' | 'Refurbished' | 'Club'
    customerType?: 'Consumer' | 'Business'
}

export interface ItemOfferMoney {
    CurrencyCode: string
    Amount: number
}

export interface ItemOfferShipping {
    minimumHours?: number
    maximumHours?: number
    availableDate?: string
    availabilityType?: string
}

export interface ItemOfferDetail {
    condition: { value: string }
    subCondition: { value: string }
    SellerFeedbackRating: {
        FeedbackCount: number
        SellerPositiveFeedbackRating?: number
    }
    ShippingTime: ItemOfferShipping
    ListingPrice: ItemOfferMoney
    Points?: { PointsNumber: number; PointsMonetaryValue: ItemOfferMoney }
    Shipping: ItemOfferMoney
    ShipsFrom?: { State?: string; Country?: string }
    IsFulfilledByAmazon: boolean
    IsBuyBoxWinner?: boolean
    PrimeInformation?: { IsPrime: boolean; IsNationalPrime: boolean }
    SellerId?: string
}

export interface ItemOfferSummary {
    condition: { value: string }
    OfferCount: number
    LowestPrices?: Array<{ condition: string; fulfillmentChannel: string; LandedPrice: ItemOfferMoney; ListingPrice: ItemOfferMoney; Shipping: ItemOfferMoney }>
    BuyBoxPrices?: Array<{ condition: string; LandedPrice: ItemOfferMoney; ListingPrice: ItemOfferMoney; Shipping: ItemOfferMoney }>
    ListPrice?: ItemOfferMoney
    SuggestedLowerPricePlusShipping?: ItemOfferMoney
    BuyBoxEligibleOffers?: Array<{ condition: string; fulfillmentChannel: string; OfferCount: number }>
}

export interface GetItemOffersResponse {
    ASIN: string
    status: string
    ItemCondition: string
    Offers: ItemOfferDetail[]
    Summary: ItemOfferSummary
}

// ---------------------------------------------------------------------------
// getMyFeesEstimateForASIN — POST /products/fees/v0/feesEstimate/asin/{asin}
// ---------------------------------------------------------------------------

export interface FeeEstimateRequest {
    asin: string
    marketplaceId: string
    priceToEstimateFees: {
        listingPrice: ItemOfferMoney
        shipping?: ItemOfferMoney
        points?: ItemOfferMoney
    }
    isAmazonFulfilled?: boolean
    identifier: string
    optionalFulfillmentProgram?: 'FBA_CORE' | 'FBA_SNL' | 'FBA_EFN'
}

export interface FeeDetail {
    FeeType: string
    FeeAmount: ItemOfferMoney
    FeePromotion?: ItemOfferMoney
    TaxAmount?: ItemOfferMoney
    FinalFee: ItemOfferMoney
    IncludedFeeDetailList?: FeeDetail[]
}

/**
 * Raw SP-API fee estimate record as returned by the API.
 * For the simplified parsed form consumed by enrichment, use `ParsedFeeEstimate`.
 */
export interface SpApiFeeEstimateRecord {
    status: string
    FeeEstimateIdentifier: {
        MarketplaceId: string
        SellerId: string
        IdType: string
        IdValue: string
        IsAmazonFulfilled: boolean
        PriceToEstimateFees: {
            ListingPrice: ItemOfferMoney
            Shipping?: ItemOfferMoney
            Points?: ItemOfferMoney
        }
        Identifier: string
    }
    FeeEstimate?: {
        TotalFeesEstimate: ItemOfferMoney
        FeeDetailList: FeeDetail[]
        TimeOfFeesEstimation: string
    }
    Error?: SpApiErrorDetail
}

export interface GetFeesEstimateResponse {
    payload: SpApiFeeEstimateRecord
}

// ---------------------------------------------------------------------------
// Parsed / normalised output shapes (scraper enrichment pipeline)
// ---------------------------------------------------------------------------

/**
 * Fully parsed catalog result — flat shape, metric units, ready for DB upsert.
 * Returned by `getCatalogItemParsed()`.
 */
export interface CatalogItemResult {
    title: string | null
    brand: string | null
    manufacturer: string | null
    model_number: string | null
    package_quantity: number | null
    color: string | null
    list_price: number | null
    main_image_url: string | null
    bullet_points: string[]
    product_type: string | null
    browse_node_id: string | null

    // Dimensions — all converted to metric at parse time
    item_length_cm: number | null
    item_width_cm: number | null
    item_height_cm: number | null
    item_weight_kg: number | null
    pkg_length_cm: number | null
    pkg_width_cm: number | null
    pkg_height_cm: number | null
    pkg_weight_kg: number | null

    // Date the listing first appeared on Amazon
    listing_date: string | null

    // All category ranks this ASIN appears in
    category_ranks: Array<{ classificationId: string; title: string; rank: number }>
}

/**
 * Parsed fee result — extracted FBA + referral fees from a fee estimate response.
 * Returned by `getFeesEstimatesBatch()`.
 */
export interface ParsedFeeEstimate {
    fba_fee: number | null      // FBAFees total
    referral_fee: number | null // ReferralFee
}
