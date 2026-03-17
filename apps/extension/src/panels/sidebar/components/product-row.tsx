/**
 * ProductRow — a single listing row in the sidebar search results.
 */
import { Badge } from '@puckora/ui'
import type { ScrapedListing } from '@puckora/scraper-core'
import { formatCurrency } from '@puckora/utils'

interface ProductRowProps {
    listing: ScrapedListing
    rank?: number
}

export function ProductRow({ listing, rank }: ProductRowProps) {
    return (
        <a
            href={listing.product_url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col gap-1 p-3 rounded-md bg-card border border-border-subtle no-underline text-inherit transition-colors duration-150 hover:border-border"
        >
            {/* Title */}
            <span className="text-sm font-medium text-foreground line-clamp-2">
                {rank != null && (
                    <span className="text-muted-foreground mr-1.5">#{rank}</span>
                )}
                {listing.name}
            </span>

            {/* Metrics row */}
            <div className="flex gap-2 items-center flex-wrap">
                {listing.price != null && (
                    <Badge variant="default" size="sm">
                        {formatCurrency(listing.price)}
                    </Badge>
                )}
                {listing.rating != null && (
                    <span className="text-xs text-muted-foreground">
                        ★ {listing.rating.toFixed(1)}
                        {listing.review_count != null && (
                            <> ({listing.review_count.toLocaleString()})</>
                        )}
                    </span>
                )}
                <span className="text-xs text-muted-foreground font-mono">
                    {listing.asin}
                </span>
            </div>
        </a>
    )
}
