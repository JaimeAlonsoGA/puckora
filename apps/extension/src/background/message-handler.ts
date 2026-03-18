/**
 * External message handler — routes messages from the Puckora web app
 * (via chrome.runtime.onMessageExternal) to the appropriate handlers.
 *
 * Accepted message origins: VITE_WEB_APP_ORIGIN only.
 */
import { saveSession, clearSession, isAuthenticated } from '@/integrations/supabase/client'
import { WEB_APP_ORIGINS } from '@/constants/api'
import { EXTENSION_MSG } from '@/types/messages'
import { STORAGE_KEY_LOCALE } from '@/constants/storage'
import type { ExtensionSession } from '@/types/extension'

type WebAppMessage =
    | { type: typeof EXTENSION_MSG.PING }
    | { type: typeof EXTENSION_MSG.SET_SESSION; session: ExtensionSession }
    | { type: typeof EXTENSION_MSG.CLEAR_SESSION }

type WebAppResponse =
    | { type: typeof EXTENSION_MSG.PONG; authenticated: boolean }
    | { type: typeof EXTENSION_MSG.OK }

export function setupMessageHandler(): void {
    chrome.runtime.onMessageExternal.addListener(
        (
            message: WebAppMessage,
            sender,
            sendResponse: (r: WebAppResponse) => void,
        ) => {
            // Guard: only accept from configured web app origins (includes localhost for dev)
            if (!sender.origin || !WEB_APP_ORIGINS.includes(sender.origin)) return

            switch (message.type) {
                case EXTENSION_MSG.PING: {
                    isAuthenticated().then((authenticated) => {
                        sendResponse({ type: EXTENSION_MSG.PONG, authenticated })
                    })
                    return true // keep channel open for async response
                }

                case EXTENSION_MSG.SET_SESSION: {
                    saveSession(message.session).then(() => {
                        // Persist the user's language preference so the popup
                        // and sidebar can initialise i18n without a Supabase fetch.
                        if (message.session.language) {
                            chrome.storage.local.set({
                                [STORAGE_KEY_LOCALE]: message.session.language,
                            })
                        }
                        sendResponse({ type: EXTENSION_MSG.OK })
                    })
                    return true
                }

                case EXTENSION_MSG.CLEAR_SESSION: {
                    clearSession().then(() => {
                        sendResponse({ type: EXTENSION_MSG.OK })
                    })
                    return true
                }
            }
        },
    )
}
