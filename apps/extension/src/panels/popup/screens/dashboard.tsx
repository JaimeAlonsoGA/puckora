/**
 * Dashboard — shown when the user is authenticated.
 *
 * Displays user email, active job count, and a link to the web app.
 */
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Stack, Surface, Heading, Body, Badge, Caption, Button, Divider } from '@puckora/ui'
import { activeScrapeJobsQueryOptions } from '@/queries'
import { useAuthStore } from '@/stores/auth.store'
import { WEB_APP_ORIGIN } from '@/constants/api'

export function Dashboard() {
    const { t } = useTranslation()
    const session = useAuthStore((s) => s.session)
    const clearSession = useAuthStore((s) => s.clearSession)

    const { data: jobs = [], isLoading } = useQuery(activeScrapeJobsQueryOptions())
    const runningJobs = jobs.filter((j) => j.status === 'running')
    const pendingJobs = jobs.filter((j) => j.status === 'pending')

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

                {/* Job status */}
                <Stack gap="2">
                    <Caption className="font-medium uppercase tracking-wide">
                        {t('dashboard.scrapeJobs')}
                    </Caption>
                    <Surface variant="card" className="p-3">
                        <Stack direction="row" gap="4" justify="around">
                            <Stack gap="1" align="center">
                                <Body size="lg" className="font-semibold">
                                    {isLoading ? '—' : runningJobs.length}
                                </Body>
                                <Caption>{t('dashboard.running')}</Caption>
                            </Stack>
                            <Stack gap="1" align="center">
                                <Body size="lg" className="font-semibold">
                                    {isLoading ? '—' : pendingJobs.length}
                                </Body>
                                <Caption>{t('dashboard.pending')}</Caption>
                            </Stack>
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
