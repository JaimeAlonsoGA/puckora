'use client'

import { useTranslations } from 'next-intl'
import { IconPlugConnected } from '@tabler/icons-react'
import { Surface, Stack, Button, Subheading, Body, Caption } from '@puckora/ui'
import { EXTENSION_INSTALL_URL } from '@/constants/extension'
import { useExtension } from '@/hooks/use-extension'

export function SearchExtensionWidget() {
    const t = useTranslations('search')
    const { isInstalled, isChecking } = useExtension()

    return (
        <Surface variant="card" padding="lg" border="default">
            <Stack gap="4" align="start">
                <Stack direction="row" align="center" gap="3">
                    <IconPlugConnected size={20} aria-hidden="true" className="text-muted-foreground" />
                    <div>
                        <Subheading>{t('shellExtensionWidgetTitle')}</Subheading>
                        <Caption>
                            {isInstalled
                                ? t('shellExtensionWidgetInstalled')
                                : isChecking
                                    ? t('shellExtensionChecking')
                                    : t('shellExtensionWidgetNotInstalled')}
                        </Caption>
                    </div>
                </Stack>

                <Body className="text-muted-foreground">
                    {t('shellExtensionWidgetBody')}
                </Body>

                <Stack gap="2" className="text-muted-foreground">
                    <Caption>{t('shellExtensionWidgetAmazon')}</Caption>
                    <Caption>{t('shellExtensionWidgetGlobalSources')}</Caption>
                    <Caption>{t('shellExtensionWidgetCompanion')}</Caption>
                </Stack>

                {!isInstalled && !isChecking && (
                    <Button href={EXTENSION_INSTALL_URL} variant="secondary">
                        {t('shellExtensionWidgetCta')}
                    </Button>
                )}
            </Stack>
        </Surface>
    )
}