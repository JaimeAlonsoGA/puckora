// Chrome MV3 Service Worker — background script

chrome.runtime.onInstalled.addListener(() => {
    console.log('[Silkflow] Extension installed')
})

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_AUTH_TOKEN') {
        chrome.storage.local.get(['silkflow_token'], (result) => {
            sendResponse({ token: result.silkflow_token ?? null })
        })
        return true // keep channel open for async sendResponse
    }

    if (message.type === 'SET_AUTH_TOKEN') {
        chrome.storage.local.set({ silkflow_token: message.token }, () => {
            sendResponse({ ok: true })
        })
        return true
    }

    if (message.type === 'CLEAR_AUTH_TOKEN') {
        chrome.storage.local.remove('silkflow_token', () => {
            sendResponse({ ok: true })
        })
        return true
    }
})
