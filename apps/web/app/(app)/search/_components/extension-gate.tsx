'use client'

import { useTranslations } from 'next-intl'
import { IconPlugConnected, IconLoader2 } from '@tabler/icons-react'
import { Surface, Stack, Button, Subheading, Body, Caption } from '@puckora/ui'

// ---------------------------------------------------------------------------
// ExtensionChecking
// ---------------------------------------------------------------------------

/** Shown for ~300 ms while the extension flag is being read from window. */
export function ExtensionChecking() {
    const t = useTranslations('search')
    return (
        <Stack gap="2" align="center">
            <IconLoader2 size={20} aria-hidden="true" className="animate-spin text-muted-foreground" />
            <Caption>{t('shellExtensionChecking')}</Caption>
        </Stack>
    )
}

// ---------------------------------------------------------------------------
// ExtensionGate
// ---------------------------------------------------------------------------

/** Full-screen prompt shown when the extension is not detected. */
export function ExtensionGate() {
    const t = useTranslations('search')
    return (
        <Surface variant="card" padding="lg" border="default">
            <Stack gap="4" align="center">
                <IconPlugConnected size={40} aria-hidden="true" className="text-muted-foreground" />
                <Subheading>{t('shellExtensionRequired')}</Subheading>
                <Body className="max-w-sm text-center text-muted-foreground">
                    {t('shellExtensionBody')}
                </Body>
                <Button href="https://chrome.google.com/webstore" variant="primary">
                    {t('shellExtensionCta')}
                </Button>
            </Stack>
        </Surface>
    )
}
