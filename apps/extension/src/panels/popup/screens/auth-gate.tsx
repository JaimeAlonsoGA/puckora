/**
 * AuthGate — shown when the user is not logged in.
 *
 * Two paths:
 *  1. Sign in directly with email + password (Supabase, no tab needed).
 *  2. Log in on the web app — the session is synced automatically via
 *     chrome.storage.onChanged, so the popup transitions on its own.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Stack, Surface, Heading, Caption, Button, Alert, Body } from '@puckora/ui'
import { useAuthStore } from '@/stores/auth.store'
import { WEB_APP_ORIGIN } from '@/constants/api'

export function AuthGate() {
    const { t } = useTranslation()
    const signIn = useAuthStore((s) => s.signIn)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setIsLoading(true)
        try {
            await signIn(email, password)
        } catch (err) {
            setError(err instanceof Error ? err.message : t('auth.loginError'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Surface variant="base" padding="none" className="p-5 w-80">
            <Stack gap="5">
                {/* Logo + title */}
                <Stack gap="2" align="center">
                    <div className="w-10 h-10 rounded-lg bg-primary" aria-hidden="true" />
                    <Heading as="h3">{t('auth.welcome')}</Heading>
                </Stack>

                {/* Web app sync hint */}
                <div className="rounded-md border border-border bg-card px-3 py-2.5">
                    <Stack gap="2" direction="row" align="center">
                        <Stack gap="1">
                            <Caption className="font-medium">{t('auth.alreadyOnWeb')}</Caption>
                            <Caption className="text-muted-foreground">{t('auth.alreadyOnWebHint')}</Caption>
                        </Stack>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => chrome.tabs.create({ url: WEB_APP_ORIGIN })}
                        >
                            {t('auth.openApp')}
                        </Button>
                    </Stack>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" aria-hidden="true" />
                    <Caption className="text-muted-foreground">{t('auth.orSignInHere')}</Caption>
                    <div className="flex-1 h-px bg-border" aria-hidden="true" />
                </div>

                {/* Native login form */}
                <form onSubmit={handleSubmit}>
                    <Stack gap="3">
                        <Stack gap="1">
                            <Caption>{t('auth.email')}</Caption>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                                className="w-full h-9 px-3 rounded-md border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors"
                            />
                        </Stack>
                        <Stack gap="1">
                            <Caption>{t('auth.password')}</Caption>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                className="w-full h-9 px-3 rounded-md border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors"
                            />
                        </Stack>

                        {error && <Alert variant="error">{error}</Alert>}

                        <Button type="submit" variant="primary" loading={isLoading} fullWidth>
                            {t('auth.signIn')}
                        </Button>
                    </Stack>
                </form>

                <Caption className="text-center">
                    {t('auth.noAccount')}{' '}
                    <span
                        role="button"
                        tabIndex={0}
                        className="text-primary cursor-pointer"
                        onClick={() => chrome.tabs.create({ url: `${WEB_APP_ORIGIN}/signup` })}
                        onKeyDown={(e) =>
                            e.key === 'Enter' &&
                            chrome.tabs.create({ url: `${WEB_APP_ORIGIN}/signup` })
                        }
                    >
                        {t('auth.signUpFree')}
                    </span>
                </Caption>
            </Stack>
        </Surface>
    )
}
