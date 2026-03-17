'use client'

import { useTranslations } from 'next-intl'
import { Puzzle, CircleCheck, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { useExtensionStatus } from '@/hooks/use-extension-status'
import { useMarketplace } from '@/hooks/use-marketplace'
import { EXTENSION_INSTALL_URL } from '@/constants/extension'
import { Surface, Stack, Button, Body, Caption } from '@puckora/ui'

const AMAZON_TLD: Record<string, string> = {
    US: 'com', GB: 'co.uk', DE: 'de', JP: 'co.jp', FR: 'fr',
    IT: 'it', ES: 'es', CA: 'ca', MX: 'com.mx', AU: 'com.au',
    IN: 'in', AE: 'ae', SG: 'sg', SA: 'sa', NL: 'nl',
    SE: 'se', PL: 'pl', TR: 'com.tr', BR: 'com.br',
}

export function ExtensionCard() {
    const t = useTranslations('settings.extension')
    const { status, resync, isSyncing } = useExtensionStatus()
    const marketplace = useMarketplace()
    const amazonTld = AMAZON_TLD[marketplace] ?? 'com'
    const amazonHref = `https://www.amazon.${amazonTld}`

    const sites = [
        { label: 'Amazon', href: amazonHref, favicon: `${amazonHref}/favicon.ico` },
        { label: 'Global Sources', href: 'https://www.globalsources.com', favicon: 'https://www.globalsources.com/favicon.ico' },
    ]

    return (
        <Surface variant="card" padding="lg" border="default">
            <Stack gap="4" direction='row' justify='between'>
                {/* Status row */}
                <Stack direction="row" align="center" justify="between" gap="4">
                    <Stack direction="row" align="center" gap="3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                            {status === 'synced'
                                ? <CircleCheck size={16} className="text-success-fg" aria-hidden="true" />
                                : status === 'unsynced'
                                    ? <AlertTriangle size={16} className="text-warning-fg" aria-hidden="true" />
                                    : <Puzzle size={16} className="text-muted-foreground" aria-hidden="true" />
                            }
                        </div>
                        <Stack gap="1">
                            <Body className="font-medium">{t('title')}</Body>
                            <Caption className="text-muted-foreground">
                                {status === 'synced' && t('rowSynced')}
                                {status === 'unsynced' && t('unsyncedHint')}
                                {status === 'not-installed' && t('notInstalledHint')}
                                {status === 'checking' && t('statusChecking')}
                            </Caption>
                        </Stack>
                    </Stack>

                    <Stack direction="row" align="center" gap="3" className="shrink-0">
                        {status === 'not-installed' && (
                            <Button
                                variant="secondary"
                                size="sm"
                                href={EXTENSION_INSTALL_URL}
                                external
                                iconRight={<ExternalLink size={13} aria-hidden="true" />}
                            >
                                {t('install')}
                            </Button>
                        )}
                        {status === 'unsynced' && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={resync}
                                loading={isSyncing}
                                icon={<RefreshCw size={14} aria-hidden="true" />}
                            >
                                {t('resync')}
                            </Button>
                        )}
                    </Stack>
                </Stack>

                {/* Site link boxes */}
                <Stack direction="row" align="center" gap="2">
                    <Caption className="shrink-0 text-muted-foreground">{t('worksOn')}</Caption>
                    {sites.map((site) => (
                        <a
                            key={site.href}
                            href={site.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1.5 transition-colors hover:bg-card"
                        >
                            <img
                                src={site.favicon}
                                alt=""
                                aria-hidden="true"
                                width={14}
                                height={14}
                                className="shrink-0 rounded-sm"
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                            <Caption>{site.label}</Caption>
                            <ExternalLink size={11} aria-hidden="true" className="text-muted-foreground" />
                        </a>
                    ))}
                </Stack>
            </Stack>
        </Surface>
    )
}

