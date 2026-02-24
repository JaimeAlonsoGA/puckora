import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { useDiscoverySuggestions } from '@/hooks/useDiscovery'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useProductContext } from '@/contexts/ProductContext'
import { usePlan } from '@/hooks/usePlan'
import { Stack, Row } from '@/components/building-blocks/layout'
import { Body, Caption, Label } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks/Button'
import { SilkCard, SilkBadge } from '@repo/ui'
import { IconSparkles, IconSearch, IconLock } from '@tabler/icons-react'
import type { AiSuggestion } from '@/hooks/useDiscovery'

const FREE_LIMIT = 2

function SuggestionCard({ suggestion }: { suggestion: AiSuggestion }) {
    const { t } = useT('discover')
    const navigate = useNavigate()

    return (
        <SilkCard variant="flat" padding="md">
            <Stack gap="sm">
                <Row gap="sm" align="center">
                    <Label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sf-text)', flex: 1 }}>
                        {suggestion.name}
                    </Label>
                    <SilkBadge variant="gold">
                        {t('suggestion.confidence', { value: Math.round(suggestion.confidence * 100) })}
                    </SilkBadge>
                </Row>
                <Caption style={{ color: 'var(--sf-text-muted)', lineHeight: 1.5 }}>
                    {suggestion.rationale}
                </Caption>
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconSearch size={12} />}
                    onClick={() => navigate({ to: '/research' as never })}
                >
                    {t('suggestion.researchThis')}
                </Button>
            </Stack>
        </SilkCard>
    )
}

function BlurredSuggestionCard() {
    const { t } = useT('discover')
    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
            <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
                <SilkCard variant="flat" padding="md">
                    <Stack gap="sm">
                        <div style={{ height: '14px', width: '60%', background: 'var(--sf-border)', borderRadius: 4 }} />
                        <div style={{ height: '12px', width: '90%', background: 'var(--sf-border)', borderRadius: 4 }} />
                        <div style={{ height: '12px', width: '70%', background: 'var(--sf-border)', borderRadius: 4 }} />
                    </Stack>
                </SilkCard>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Button variant="primary" size="sm" icon={<IconLock size={12} />}>
                    {t('proGate.upgradeLabel')}
                </Button>
            </div>
        </div>
    )
}

export function InspireMePanel() {
    const { t } = useT('discover')
    const { mutate: getSuggestions, data: suggestions, isPending } = useDiscoverySuggestions()
    const { answers } = useOnboarding()
    const { plan } = usePlan()
    const [hasRequested, setHasRequested] = useState(false)

    const visibleFree = plan === 'free' ? FREE_LIMIT : Infinity

    function handleInspire() {
        setHasRequested(true)
        getSuggestions({
            experience_level: answers?.experience_level,
            budget_range: answers?.budget_range,
            count: 5,
        })
    }

    return (
        <Stack gap="md">
            {!hasRequested && !suggestions && (
                <SilkCard variant="flat" padding="lg">
                    <Stack gap="md" className="items-center text-center">
                        <IconSparkles size={28} style={{ color: 'var(--sf-gold)' }} />
                        <Stack gap="xs">
                            <Body style={{ fontWeight: 600 }}>{t('inspireMeSubtitle')}</Body>
                            <Caption style={{ color: 'var(--sf-text-muted)' }}>
                                {plan === 'free'
                                    ? 'Free: 2 ideas. Pro: 5 with full rationale.'
                                    : '5 personalised product ideas with AI rationale.'}
                            </Caption>
                        </Stack>
                        <Button
                            variant="primary"
                            size="md"
                            icon={<IconSparkles size={14} />}
                            onClick={handleInspire}
                            loading={isPending}
                        >
                            {t('inspireMeButton')}
                        </Button>
                    </Stack>
                </SilkCard>
            )}

            {isPending && hasRequested && (
                <SilkCard variant="flat" padding="md">
                    <Caption style={{ color: 'var(--sf-text-muted)', textAlign: 'center' }}>
                        {t('inspiring')}
                    </Caption>
                </SilkCard>
            )}

            {suggestions && suggestions.length > 0 && (
                <Stack gap="sm">
                    {suggestions.map((s, i) =>
                        i < visibleFree
                            ? <SuggestionCard key={i} suggestion={s} />
                            : <BlurredSuggestionCard key={i} />
                    )}
                    <Button variant="ghost" size="sm" onClick={handleInspire} loading={isPending}>
                        {t('inspireMeButton')}
                    </Button>
                </Stack>
            )}
        </Stack>
    )
}
