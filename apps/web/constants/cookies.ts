/**
 * Cookie name constants.
 *
 * Use these everywhere a cookie is read or written — never inline the string.
 */
export const CookieName = {
    /** next-intl reads this cookie to resolve the user's locale */
    locale: 'NEXT_LOCALE',
} as const
