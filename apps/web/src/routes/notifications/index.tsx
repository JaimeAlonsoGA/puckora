import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Body } from '@/components/building-blocks/typography'
import { Stack } from '@/components/building-blocks/layout'
import { IconBell } from '@tabler/icons-react'
import { EmptyState } from '@/components/shared/EmptyState'

export const Route = createFileRoute('/notifications/')({
    component: NotificationsPage,
})

function NotificationsPage() {
    const { t } = useT('common')

    return (
        <PageContainer>
            <Stack gap="xl">
                <Stack gap="xs">
                    <Heading>Notifications</Heading>
                    <Body className="text-text-muted">Alerts and updates for your tracked products.</Body>
                </Stack>
                <EmptyState
                    icon={<IconBell size={32} />}
                    title="No notifications yet"
                    description="When your tracked products hit their alert thresholds, you'll see them here."
                />
            </Stack>
        </PageContainer>
    )
}
