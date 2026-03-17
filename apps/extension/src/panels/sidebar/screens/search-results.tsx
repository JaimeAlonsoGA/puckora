/**
 * SearchResults — renders a list of ScrapedListings as ProductRow cards.
 */
import { Stack, Caption } from '@puckora/ui'
import type { ScrapedListing } from '@puckora/scraper-core'
import { ProductRow } from '../components/product-row'

interface SearchResultsProps {
    listings: ScrapedListing[]
    emptyMessage?: string
}

export function SearchResults({
    listings,
    emptyMessage = 'No listings found on this page.',
}: SearchResultsProps) {
    if (listings.length === 0) {
        return <Caption>{emptyMessage}</Caption>
    }

    return (
        <Stack gap="2">
            {listings.map((listing, i) => (
                <ProductRow key={listing.asin} listing={listing} rank={i + 1} />
            ))}
        </Stack>
    )
}
