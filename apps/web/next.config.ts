import dotenv from 'dotenv'
import path from 'path'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// Load the single root .env shared across the monorepo.
// Must happen before Next.js inlines NEXT_PUBLIC_* vars at build time.
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
    typedRoutes: true,
    experimental: {
        // Transforms barrel imports into direct imports at build time.
        // Eliminates the 200-800ms cold-start cost of loading the full icon set.
        optimizePackageImports: ['@tabler/icons-react'],
    },
    images: {
        remotePatterns: [
            // 1688 / Alibaba CDN
            { protocol: 'https', hostname: 'cbu01.alicdn.com' },
            { protocol: 'https', hostname: 'img.alicdn.com' },
            { protocol: 'https', hostname: 'sc04.alicdn.com' },
            // Amazon product images
            { protocol: 'https', hostname: 'm.media-amazon.com' },
            { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'images-eu.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'images-fe.ssl-images-amazon.com' },
        ],
    },
}

export default withNextIntl(nextConfig)
