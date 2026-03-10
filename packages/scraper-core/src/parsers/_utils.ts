/**
 * Internal HTML decode helper — not part of the public API.
 */
export function decodeHtmlEntities(s: string): string {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ')
}
