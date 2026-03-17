/**
 * Vite config — Popup (React UI).
 *
 * Builds the extension popup as a full React SPA.
 * Code splitting and tree-shaking are fully enabled.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],

    // root = src/ so HTML files resolve relative to it and output mirrors the
    // directory structure under dist/ without an extra 'src/' prefix.
    root: resolve(__dirname, 'src'),

    // env files (.env.local etc.) live in the package root, not in src/
    envDir: resolve(__dirname),

    // Static assets (icons, sidepanel HTML, etc.) — copied verbatim to dist/.
    publicDir: resolve(__dirname, 'public'),

    resolve: {
        alias: { '@': resolve(__dirname, 'src') },
    },

    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/panels/popup/index.html'),
            },
            output: {
                entryFileNames: '[name]/[name].js',
                chunkFileNames: 'chunks/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
            },
        },
    },
})
