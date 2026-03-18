import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { MARKETPLACES } from '../../packages/types/src/meta.types'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const AMAZON_SITE_REMOTE_PATTERNS = MARKETPLACES.map(({ domain }) => ({
    protocol: 'https' as const,
    hostname: domain,
}))

const nextConfig: NextConfig = {
    typedRoutes: true,
    experimental: {
        // Transforms barrel imports into direct imports at build time.
        // Eliminates the 200-800ms cold-start cost of loading the full icon set.
        optimizePackageImports: ['@tabler/icons-react'],
    },
    images: {
        remotePatterns: [
            // Supplier marketplace images
            { protocol: 'https', hostname: 'cbu01.alicdn.com' },
            { protocol: 'https', hostname: 'img.alicdn.com' },
            { protocol: 'https', hostname: 'sc04.alicdn.com' },
            // Amazon product images
            { protocol: 'https', hostname: 'm.media-amazon.com' },
            { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'images-eu.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'images-fe.ssl-images-amazon.com' },
            ...AMAZON_SITE_REMOTE_PATTERNS,
            { protocol: 'https', hostname: 'www.globalsources.com' },
        ],
    },
}

export default withNextIntl(nextConfig)
