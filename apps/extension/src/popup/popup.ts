/**
 * Extension popup — shows auth status and connection state.
 */

const statusDot = document.getElementById('status-dot')!
const statusText = document.getElementById('status-text')!
const loginPrompt = document.getElementById('login-prompt')!

chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
    if (chrome.runtime.lastError || !response) {
        statusDot.className = 'dot disconnected'
        statusText.textContent = 'Extension error'
        return
    }

    if (response.authenticated) {
        statusDot.className = 'dot connected'
        statusText.textContent = 'Connected — ready'
    } else {
        statusDot.className = 'dot disconnected'
        statusText.textContent = 'Not logged in'
        loginPrompt.style.display = 'block'
    }
})
