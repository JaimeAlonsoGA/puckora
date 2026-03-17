/**
 * Apify actor ID map — single source of truth for actor IDs used by puckora.
 */
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
