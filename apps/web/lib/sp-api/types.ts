/**
 * Hard-typed request / response models for Amazon Selling Partner API (SP-API).
 *
 * Endpoints covered:
 *  - GET /catalog/2022-04-01/items                  (searchCatalogItems)
 *  - GET /catalog/2022-04-01/items/{asin}            (getCatalogItem)
 *  - GET /products/pricing/v0/items/{asin}/offers    (getItemOffers)
 *  - POST /products/fees/v0/feesEstimate/asin/{asin} (getMyFeesEstimateForASIN)
 *
 * Source of truth: https://developer-docs.amazon.com/sp-api/reference/...
 */

// ---------------------------------------------------------------------------
// Shared primitives
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

/** Map marketplace ID to API region endpoint */
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
// LWA (Login With Amazon) Token
// ---------------------------------------------------------------------------
export interface LwaTokenResponse {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
}

export interface LwaTokenCache {
    accessToken: string
    expiresAt: number // ms since epoch
}

// ---------------------------------------------------------------------------
// SP-API error shape
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
// searchCatalogItems  — GET /catalog/2022-04-01/items
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

// ---------------------------------------------------------------------------
// getCatalogItem  — GET /catalog/2022-04-01/items/{asin}
// ---------------------------------------------------------------------------
export interface GetCatalogItemParams {
    asin: string
    marketplaceIds: string[]
    includedData?: CatalogItemInclude[]
    locale?: string
}

// Returns CatalogItem directly

// ---------------------------------------------------------------------------
// getItemOffers  — GET /products/pricing/v0/items/{asin}/offers
// ---------------------------------------------------------------------------
export interface GetItemOffersParams {
    asin: string
    marketplaceId: string
    itemCondition: 'New' | 'Used' | 'Collectible' | 'Refurbished' | 'Club'
    /** SP-API requires a Seller ID when making seller-specific pricing calls */
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
    identifier: string // arbitrary unique string per request
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

export interface FeeEstimateResult {
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
    payload: FeeEstimateResult
}
