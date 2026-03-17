/**
 * web-app-bridge — content script injected into Puckora web app tabs.
 *
 * Runs in the ISOLATED world (default) so it has access to chrome.runtime.id.
 *
 * Detection uses a two-way postMessage handshake — no script-tag injection
 * (which would be blocked by the web app's Content Security Policy):
 *
 *   Content script → page:  PUCKORA_EXT_READY  (announces ext ID)
 *   Page → content script:  PUCKORA_EXT_REQUEST (hooks ask for ext ID on mount)
 *   Content script → page:  PUCKORA_EXT_READY  (replies to each request)
 *
 * Both the ISOLATED world and the MAIN (page) world share the same DOM message
 * channel, so window.postMessage/addEventListener work across the boundary.
 *
 * No DOM manipulation, no React, no imports.
 */

const EXT_ID = chrome.runtime.id

function announce(): void {
    window.postMessage({ type: 'PUCKORA_EXT_READY', extId: EXT_ID }, '*')
}

// Announce immediately — caught by any listener already attached (e.g. page
// reloads where React mounts before document_start fires on the new nav).
announce()

// Respond to on-demand requests from React hooks that mount after document_start.
window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (event.data?.type === 'PUCKORA_EXT_REQUEST') announce()
})
