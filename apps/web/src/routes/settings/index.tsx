import React, { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Body, Subheading, Label } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks/Button'
import { Stack, Row } from '@/components/building-blocks/layout'
import { FormField } from '@/components/form/FormField'
import { FormInput } from '@/components/form/FormInput'
import { FormToggle } from '@/components/form/FormToggle'
import { FormSelect } from '@/components/form/FormSelect'
import { AsyncBoundary } from '@/components/shared/AsyncBoundary'
import { usePlan } from '@/hooks/usePlan'
import { useAuth } from '@/hooks/useAuth'
import { SilkBadge, SilkAlert } from '@repo/ui'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/settings/')({
    component: SettingsPage,
})

type Tab = 'profile' | 'notifications' | 'billing'

const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
]

function ProfileTab() {
    const { t } = useT('settings')
    const { user } = useAuth()
    const [name, setName] = useState(user?.user_metadata?.full_name ?? '')
    const [saved, setSaved] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setIsSaving(true)
        setSaveError(null)
        try {
            const { error: authErr } = await supabase.auth.updateUser({
                data: { full_name: name },
            })
            if (authErr) throw authErr

            const { error: profileErr } = await supabase
                .from('profiles')
                .update({ full_name: name, updated_at: new Date().toISOString() })
                .eq('id', user?.id)
            if (profileErr) throw profileErr

            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (err) {
            setSaveError((err as Error).message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Stack gap="lg" className="max-w-md">
            <Subheading>{t('profile.title')}</Subheading>
            <form onSubmit={handleSave}>
                <Stack gap="md">
                    <FormField label={t('profile.name')}>
                        <FormInput
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </FormField>
                    <FormField label={t('profile.email')}>
                        <FormInput
                            value={user?.email ?? ''}
                            disabled
                            className="opacity-60"
                        />
                    </FormField>
                    <FormField label={t('profile.language')}>
                        <FormSelect
                            options={LANGUAGE_OPTIONS}
                            defaultValue="en"
                        />
                    </FormField>
                    {saveError && (
                        <SilkAlert variant="error">{saveError}</SilkAlert>
                    )}
                    <Button type="submit" variant="primary" disabled={isSaving}>
                        {saved ? t('profile.saved') : isSaving ? t('profile.saving') : t('profile.save')}
                    </Button>
                </Stack>
            </form>
        </Stack>
    )
}

function NotificationsTab() {
    const { t } = useT('settings')
    const [emailEnabled, setEmailEnabled] = useState(true)
    const [priceAlerts, setPriceAlerts] = useState(true)
    const [bsrAlerts, setBsrAlerts] = useState(true)

    return (
        <Stack gap="lg" className="max-w-md">
            <Subheading>{t('notifications.title')}</Subheading>
            <Stack gap="md">
                <FormToggle
                    checked={emailEnabled}
                    onChange={setEmailEnabled}
                    label={t('notifications.email')}
                />
                <div className="border-t border-border pt-4">
                    <Stack gap="sm">
                        <Label>{t('notifications.title')}</Label>
                        <FormToggle
                            checked={priceAlerts}
                            onChange={setPriceAlerts}
                            label={t('notifications.alerts.priceChange')}
                            disabled={!emailEnabled}
                        />
                        <FormToggle
                            checked={bsrAlerts}
                            onChange={setBsrAlerts}
                            label={t('notifications.alerts.bsrChange')}
                            disabled={!emailEnabled}
                        />
                    </Stack>
                </div>
            </Stack>
        </Stack>
    )
}

function BillingTab() {
    const { t } = useT('settings')
    const { plan, limits } = usePlan()

    return (
        <Stack gap="lg" className="max-w-md">
            <Subheading>{t('tabs.billing')}</Subheading>
            <div className="border border-border bg-surface-secondary p-6">
                <Stack gap="md">
                    <Row className="justify-between items-center">
                        <Body className="font-medium">Current Plan</Body>
                        <SilkBadge variant="gold">{plan.toUpperCase()}</SilkBadge>
                    </Row>
                    {limits && (
                        <Stack gap="xs">
                            <Row className="justify-between">
                                <Body className="text-text-muted text-sm">Daily searches</Body>
                                <Body className="text-sm">
                                    {limits.dailySearches === -1 ? 'Unlimited' : limits.dailySearches}
                                </Body>
                            </Row>
                            <Row className="justify-between">
                                <Body className="text-text-muted text-sm">Competitor analyses / mo</Body>
                                <Body className="text-sm">
                                    {limits.competitorAnalysesPerMonth === -1 ? 'Unlimited' : limits.competitorAnalysesPerMonth}
                                </Body>
                            </Row>
                            <Row className="justify-between">
                                <Body className="text-text-muted text-sm">Saved products</Body>
                                <Body className="text-sm">
                                    {limits.savedProducts === -1 ? 'Unlimited' : limits.savedProducts}
                                </Body>
                            </Row>
                        </Stack>
                    )}
                    {plan !== 'agency' && (<Button variant="primary" className="w-full">
                        Upgrade plan
                    </Button>
                    )}
                </Stack>
            </div>
        </Stack>
    )
}

const TAB_COMPONENTS: Record<Tab, React.ComponentType> = {
    profile: ProfileTab,
    notifications: NotificationsTab,
    billing: BillingTab,
}

function SettingsContent() {
    const { t } = useT('settings')
    const [tab, setTab] = useState<Tab>('profile')

    const ActiveTab = TAB_COMPONENTS[tab]

    return (
        <Stack gap="xl">
            <Heading>{t('title')}</Heading>

            <Row gap="xs" className="border-b border-border pb-0">
                {(['profile', 'notifications', 'billing'] as Tab[]).map((key) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key
                            ? 'border-accent-primary text-accent-primary'
                            : 'border-transparent text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {t(`tabs.${key}`)}
                    </button>
                ))}
            </Row>

            <ActiveTab />
        </Stack>
    )
}

function SettingsPage() {
    return (
        <PageContainer>
            <AsyncBoundary>
                <SettingsContent />
            </AsyncBoundary>
        </PageContainer>
    )
}
