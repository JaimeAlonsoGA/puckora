/**
 * Alibaba search content script entry point.
 *
 * Overlay mode only — there are no executor-driven Alibaba scrape jobs
 * that open background tabs (Alibaba search is triggered from the sidebar).
 *
 * Mounts the Puckora supplier analysis sidebar so users can cross-reference
 * Amazon search results with Alibaba supplier pricing side-by-side.
 */
import { mountOverlay } from './mount'

mountOverlay()
