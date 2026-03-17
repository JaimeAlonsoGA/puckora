/**
 * Vite config — Background service worker + content scripts.
 *
 * Each entry is bundled as a self-contained ES module.
 * We avoid dynamic imports in scripts — Rollup will only create shared chunks
 * when static imports overlap between entries. Shared chunks land in
 * dist/chunks/ and are declared as web_accessible_resources in the manifest
 * so Chrome can resolve them when injecting ES-module content scripts.
 */
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    resolve: {
        alias: { '@': resolve(__dirname, 'src') },
    },

    build: {
        outDir: 'dist',
        emptyOutDir: false, // popup already built to dist/
        rollupOptions: {
            input: {
                background: resolve(__dirname, 'src/background/index.ts'),
                'content-amazon-search': resolve(
                    __dirname,
                    'src/content-scripts/amazon-search/index.ts',
                ),
                'content-amazon-product': resolve(
                    __dirname,
                    'src/content-scripts/amazon-product/index.ts',
                ),
                'content-alibaba-search': resolve(
                    __dirname,
                    'src/content-scripts/alibaba-search/index.ts',
                ),
                'content-web-app-bridge': resolve(
                    __dirname,
                    'src/content-scripts/web-app-bridge/index.ts',
                ),
            },
            // Treat React as an external in content scripts? No — bundle everything.
            // Content scripts run in an isolated world so they need all deps bundled.
            external: [],
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name]-[hash].js',
                format: 'es',
            },
        },
    },
})
