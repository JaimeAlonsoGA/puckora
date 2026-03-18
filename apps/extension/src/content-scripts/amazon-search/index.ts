/**
 * Amazon search content script entry point.
 *
 * Overlay mode only.
 * Mounts the Puckora sidebar React app into a shadow root on Amazon search pages.
 */
import { mountOverlay } from './mount'

mountOverlay()
