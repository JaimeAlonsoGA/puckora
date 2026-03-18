/**
 * Global Sources content script entry point.
 *
 * Overlay mode only.
 * Mounts the Puckora supplier analysis sidebar on Global Sources pages.
 */
import { mountOverlay } from './mount'

mountOverlay()