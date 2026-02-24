/**
 * Amazon search results page content script.
 * Injects a Silkflow overlay panel next to each product result.
 */

const SILKFLOW_BADGE_CLASS = 'silkflow-badge'

function injectBadges() {
    const items = document.querySelectorAll('[data-component-type="s-search-result"]')

    items.forEach((item) => {
        if (item.querySelector(`.${SILKFLOW_BADGE_CLASS}`)) return

        const asin = (item as HTMLElement).dataset.asin
        if (!asin) return

        const badge = document.createElement('div')
        badge.className = SILKFLOW_BADGE_CLASS
        badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: #7C3AED;
      color: #fff;
      border-radius: 4px;
      font-size: 11px;
      font-family: system-ui, sans-serif;
      cursor: pointer;
      margin-top: 4px;
    `
        badge.textContent = '🔍 Silkflow'
        badge.title = `Analyze ${asin} in Silkflow`
        badge.addEventListener('click', () => {
            const url = `https://app.silkflow.io/analyzer/${asin}`
            window.open(url, '_blank')
        })

        const footer = item.querySelector('.a-section.a-spacing-none')
        footer?.appendChild(badge)
    })
}

// Run on load and observe for dynamic results
injectBadges()

const observer = new MutationObserver(injectBadges)
observer.observe(document.body, { childList: true, subtree: true })
