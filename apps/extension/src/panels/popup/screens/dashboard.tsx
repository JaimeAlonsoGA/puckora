/**
 * Dashboard — shown when the user is authenticated.
 *
 * Displays user session state, overlay scope, and a link to the web app.
 */
import { useTranslation } from 'react-i18next'
import { Stack, Surface, Heading, Body, Badge, Caption, Button, Divider } from '@puckora/ui'
import { useAuthStore } from '@/stores/auth.store'
import { WEB_APP_ORIGIN } from '@/constants/api'

export function Dashboard() {
    const { t } = useTranslation()
    const session = useAuthStore((s) => s.session)
    const clearSession = useAuthStore((s) => s.clearSession)

    return (
        <Surface
            variant="base"
            className="w-80 min-h-[260px]"
        >
            <Stack gap="4">
                {/* Header */}
                <Stack direction="row" gap="2" align="center" justify="between">
                    <Heading as="h4">{t('dashboard.title')}</Heading>
                    <Badge variant="success" size="sm">
                        {t('dashboard.active')}
                    </Badge>
                </Stack>

                <Divider />

                {/* User */}
                <Stack gap="1">
                    <Caption>{t('dashboard.loggedInAs')}</Caption>
                    <Body className="font-medium">{session?.user_email ?? '—'}</Body>
                </Stack>

                {/* Overlay scope */}
                <Stack gap="2">
                    <Caption className="font-medium uppercase tracking-wide">
                        {t('dashboard.overlaySurfaces')}
                    </Caption>
                    <Surface variant="card" className="p-3">
                        <Stack gap="3">
                            <Stack direction="row" gap="2" align="center" justify="between">
                                <Body className="font-medium">{t('dashboard.overlayAmazon')}</Body>
                                <Badge variant="info" size="sm">{t('dashboard.ready')}</Badge>
                            </Stack>
                            <Stack direction="row" gap="2" align="center" justify="between">
                                <Body className="font-medium">{t('dashboard.overlaySuppliers')}</Body>
                                <Badge variant="default" size="sm">{t('dashboard.companion')}</Badge>
                            </Stack>
                            <Caption>{t('dashboard.overlaySummary')}</Caption>
                        </Stack>
                    </Surface>
                </Stack>

                <Divider />

                {/* Actions */}
                <Stack direction="row" gap="2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => chrome.tabs.create({ url: `${WEB_APP_ORIGIN}/dashboard` })}
                    >
                        {t('dashboard.openApp')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSession}
                    >
                        {t('dashboard.logout')}
                    </Button>
                </Stack>
            </Stack>
        </Surface>
    )
}
