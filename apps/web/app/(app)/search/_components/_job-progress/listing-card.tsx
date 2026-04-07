'use client'

import { Body, Caption, Stack, Surface } from '@puckora/ui'
import { formatMoney, formatRating } from '@puckora/utils'
import type { ScrapedListing } from '@puckora/scraper-core'

export function ListingCard({ listing }: { listing: ScrapedListing }) {
    const price =
        listing.price != null
            ? typeof listing.price === 'number'
                ? formatMoney(listing.price)
                : String(listing.price)
            : null

    return (
        <Surface variant="card" padding="sm" border="default">
            <Stack gap="2">
                <Body className="line-clamp-2 font-medium">{listing.name ?? listing.asin}</Body>
                <Stack direction="row" gap="3">
                    <Caption>{listing.asin}</Caption>
                    {price && <Caption className="text-muted-foreground">{price}</Caption>}
                    {listing.rating != null && (
                        <Caption className="text-muted-foreground">{formatRating(listing.rating)}</Caption>
                    )}
                    {listing.review_count != null && (
                        <Caption className="text-faint">({listing.review_count.toLocaleString()})</Caption>
                    )}
                </Stack>
            </Stack>
        </Surface>
    )
}
