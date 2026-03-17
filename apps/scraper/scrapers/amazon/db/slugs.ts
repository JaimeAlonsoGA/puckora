/**
 * Amazon category slug utilities.
 *
 * Amazon Best Sellers URLs: https://www.amazon.com/gp/bestsellers/{slug}/{nodeId}?pg=1
 * The slug is Amazon's internal identifier. The node ID alone drives the page;
 * the slug must simply be a valid ancestor slug.
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

export function categorySlug(mainCategory: string): string {
    return CATEGORY_SLUG_MAP[mainCategory.trim()] ?? 'x'
}

export function buildUrl(nodeId: string, mainCategory: string): string {
    return `https://www.amazon.com/gp/bestsellers/${categorySlug(mainCategory)}/${nodeId}?pg=1`
}

/**
 * Derive the slug from a stored full_path string (e.g. "Electronics > Headphones").
 * Used as fallback when bestsellers_url is null in DB.
 */
export function categorySlugFromPath(fullPath: string): string {
    const mainCategory = fullPath.split(' > ')[0]?.trim() ?? ''
    return categorySlug(mainCategory)
}
