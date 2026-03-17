import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { SUPPORTED_LOCALES, DEFAULT_LANGUAGE } from '@puckora/types'
import type { AppLanguage } from '@puckora/types'
import { CookieName } from '@/constants/cookies'

export default getRequestConfig(async () => {
    // Locale comes from the NEXT_LOCALE cookie which is:
    //   - set by the /api/settings PATCH handler when the user changes their language
    //   - seeded by proxy.ts for newly authenticated sessions (from their profile preference)
    const cookieStore = await cookies()
    const raw = cookieStore.get(CookieName.locale)?.value ?? ''
    const locale: AppLanguage = (SUPPORTED_LOCALES as readonly string[]).includes(raw)
        ? (raw as AppLanguage)
        : DEFAULT_LANGUAGE

    // Load each namespace separately so new namespaces can be added without
    // touching this file — just drop a new JSON file in the locale folder.
    const [common, settings, auth, errors, pulse, search, pucki] = await Promise.all([
        import(`./messages/${locale}/common.json`).then((m) => m.default),
        import(`./messages/${locale}/settings.json`).then((m) => m.default),
        import(`./messages/${locale}/auth.json`).then((m) => m.default),
        import(`./messages/${locale}/errors.json`).then((m) => m.default),
        import(`./messages/${locale}/pulse.json`).then((m) => m.default),
        import(`./messages/${locale}/search.json`).then((m) => m.default),
        import(`./messages/${locale}/pucki.json`).then((m) => m.default),
    ])

    return {
        locale,
        timeZone: 'UTC',
        messages: { ...common, ...settings, ...auth, ...errors, ...pulse, ...search, ...pucki },
    }
})
