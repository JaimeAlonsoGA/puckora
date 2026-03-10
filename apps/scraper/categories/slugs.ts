/**
 * Amazon category slug utilities.
 *
 * Amazon's Best Sellers URLs follow the pattern:
 *   https://www.amazon.com/gp/bestsellers/{slug}/{nodeId}?pg=1
 *
 * The slug is Amazon's internal identifier — NOT the human-readable category
 * name. The node ID alone drives the actual page; the slug must simply be a
 * valid ancestor slug.
 */

/**
 * Map from exact MAIN_CATEGORY value (column 1 of the NarrowDown XLSX,
 * case-sensitive) to Amazon's internal Best Sellers URL slug.
 */
export const CATEGORY_SLUG_MAP: Record<string, string> = {
    'Appliances': 'appliances',
    'Arts, Crafts & Sewing': 'arts-crafts',
    'Automotive': 'automotive',
    'Baby Products': 'baby-products',
    'Beauty & Personal Care': 'beauty',
    'Books': 'books',
    'Camera & Photo Products': 'photo',
    'Cell Phones & Accessories': 'wireless',
    'Clothing, Shoes & Jewelry': 'fashion',
    'Collectibles & Fine Art': 'collectibles',
    'Computers': 'pc',
    'Electronics': 'electronics',
    'Garden & Outdoor': 'lawn-garden',
    'Grocery & Gourmet Food': 'grocery',
    'Handmade Products': 'handmade',
    'Health & Household': 'hpc',
    'Home & Kitchen': 'home-garden',
    'Industrial & Scientific': 'industrial',
    'Jewelry': 'jewelry',
    'Kitchen & Dining': 'kitchen',
    'Luggage & Travel Gear': 'luggage',
    'Magazine Subscriptions': 'magazines',
    'Movies & TV': 'movies-tv',
    'Music': 'music',
    'Musical Instruments': 'mi',
    'Office Products': 'office-products',
    'Patio, Lawn & Garden': 'lawn-garden',
    'Pet Supplies': 'pet-supplies',
    'Software': 'software',
    'Sports & Fitness': 'sporting-goods',
    'Sports & Outdoors': 'sporting-goods',
    'Tools & Home Improvement': 'hi',
    'Toys & Games': 'toys-and-games',
    'Video Games': 'videogames',
    'Video Games & Accessories': 'videogames',
}

/** Map a main category name to its Amazon Best Sellers URL slug. */
export function categorySlug(mainCategory: string): string {
    return CATEGORY_SLUG_MAP[mainCategory.trim()] ?? 'x'
}

/** Build a Best Sellers URL for a given browse node ID and main category name. */
export function buildUrl(nodeId: string, mainCategory: string): string {
    const slug = categorySlug(mainCategory)
    return `https://www.amazon.com/gp/bestsellers/${slug}/${nodeId}?pg=1`
}

/**
 * Derive the Amazon Best Sellers slug from a stored full_path string
 * (e.g. "Electronics > Headphones" → "electronics").
 * Used as a fallback when `bestsellers_url` is null in the DB.
 */
export function categorySlugFromPath(fullPath: string): string {
    const mainCategory = fullPath.split(' > ')[0]?.trim() ?? ''
    return categorySlug(mainCategory)
}
