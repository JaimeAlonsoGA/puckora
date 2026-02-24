/**
 * Amazon product detail page content script.
 * Injects a Silkflow quick-action button on /dp/* pages.
 */

function extractAsin(): string | null {
    const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)
    return match ? match[1] : null
}

function injectButton(asin: string) {
    if (document.getElementById('silkflow-analyze-btn')) return

    const btn = document.createElement('button')
    btn.id = 'silkflow-analyze-btn'
    btn.textContent = '📊 Analyze in Silkflow'
    btn.style.cssText = `
    display: block;
    width: 100%;
    padding: 10px 16px;
    margin-top: 8px;
    background: #7C3AED;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-family: system-ui, sans-serif;
    cursor: pointer;
    font-weight: 600;
  `
    btn.addEventListener('click', () => {
        window.open(`https://app.silkflow.io/analyzer/${asin}`, '_blank')
    })

    const buyBox = document.getElementById('buy-now-button')?.parentElement
    buyBox?.insertAdjacentElement('afterend', btn)
}

const asin = extractAsin()
if (asin) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => injectButton(asin))
    } else {
        injectButton(asin)
    }
}
